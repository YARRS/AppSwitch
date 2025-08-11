from fastapi import APIRouter, Depends, HTTPException, status, Query, Header
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional, List
from datetime import datetime
import uuid
from pydantic import BaseModel

from models import (
    OrderCreate, OrderUpdate, OrderResponse, OrderInDB,
    OrderItem, OrderStatus, APIResponse, PaginatedResponse,
    UserInDB, ProductInDB, CartInDB, GuestCartInDB, ShippingAddress
)
from auth import get_current_active_user, get_admin_user

router = APIRouter(prefix="/api/orders", tags=["Orders"])

# Guest checkout models
class GuestOrderCreate(BaseModel):
    items: List[OrderItem]
    shipping_address: ShippingAddress
    total_amount: float
    tax_amount: float = 0.0
    shipping_cost: float = 0.0
    discount_amount: float = 0.0
    final_amount: float
    payment_method: str = "COD"
    notes: Optional[str] = None
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None

class OrderService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.orders_collection = db.orders
        self.products_collection = db.products
        self.carts_collection = db.carts
    
    async def create_order(self, user_id: str, order_data: dict) -> OrderInDB:
        """Create new order"""
        # Generate order number
        order_number = f"SW{datetime.now().strftime('%Y%m%d')}{str(uuid.uuid4())[:8].upper()}"
        
        order_data["order_number"] = order_number
        order = OrderInDB(**order_data)
        order_dict = order.dict()
        
        # Insert order
        await self.orders_collection.insert_one(order_dict)
        
        # Update product stock and sales count
        for item in order.items:
            await self.products_collection.update_one(
                {"id": item.product_id},
                {
                    "$inc": {
                        "stock_quantity": -item.quantity,
                        "sales_count": item.quantity
                    }
                }
            )
        
        # Clear user's cart
        if user_id:
            await self.carts_collection.update_one(
                {"user_id": user_id},
                {"$set": {"items": [], "total_amount": 0.0, "total_items": 0}}
            )
        
        return order
    
    async def create_guest_order(self, session_id: str, order_data: dict) -> OrderInDB:
        """Create new order for guest user"""
        # Generate order number
        order_number = f"SW{datetime.now().strftime('%Y%m%d')}{str(uuid.uuid4())[:8].upper()}"
        
        order_data["order_number"] = order_number
        order_data["user_id"] = f"guest_{session_id}"  # Use session_id as user_id for guests
        order = OrderInDB(**order_data)
        order_dict = order.dict()
        
        # Insert order
        await self.orders_collection.insert_one(order_dict)
        
        # Update product stock and sales count
        for item in order.items:
            await self.products_collection.update_one(
                {"id": item.product_id},
                {
                    "$inc": {
                        "stock_quantity": -item.quantity,
                        "sales_count": item.quantity
                    }
                }
            )
        
        # Clear guest cart
        await self.carts_collection.update_one(
            {"session_id": session_id},
            {"$set": {"items": [], "total_amount": 0.0, "total_items": 0}}
        )
        
        return order
    
    async def get_order_by_id(self, order_id: str) -> Optional[OrderInDB]:
        """Get order by ID"""
        order_doc = await self.orders_collection.find_one({"id": order_id})
        if order_doc:
            return OrderInDB(**order_doc)
        return None
    
    async def get_order_by_number(self, order_number: str) -> Optional[OrderInDB]:
        """Get order by order number"""
        order_doc = await self.orders_collection.find_one({"order_number": order_number})
        if order_doc:
            return OrderInDB(**order_doc)
        return None
    
    async def get_user_orders(
        self,
        user_id: str,
        page: int = 1,
        per_page: int = 20,
        status: Optional[str] = None
    ) -> dict:
        """Get user's orders with pagination"""
        # Build query
        query = {"user_id": user_id}
        if status:
            query["status"] = status
        
        # Calculate skip value
        skip = (page - 1) * per_page
        
        # Get orders with pagination
        cursor = self.orders_collection.find(query).sort("created_at", -1).skip(skip).limit(per_page)
        orders = await cursor.to_list(length=per_page)
        
        # Get total count
        total = await self.orders_collection.count_documents(query)
        
        return {
            "orders": orders,
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": (total + per_page - 1) // per_page
        }
    
    async def get_all_orders(
        self,
        page: int = 1,
        per_page: int = 20,
        status: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> dict:
        """Get all orders with pagination (admin only)"""
        # Build query
        query = {}
        if status:
            query["status"] = status
        if user_id:
            query["user_id"] = user_id
        
        # Calculate skip value
        skip = (page - 1) * per_page
        
        # Get orders with pagination
        cursor = self.orders_collection.find(query).sort("created_at", -1).skip(skip).limit(per_page)
        orders = await cursor.to_list(length=per_page)
        
        # Get total count
        total = await self.orders_collection.count_documents(query)
        
        return {
            "orders": orders,
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": (total + per_page - 1) // per_page
        }
    
    async def update_order(self, order_id: str, update_data: dict) -> Optional[OrderInDB]:
        """Update order"""
        update_data["updated_at"] = datetime.utcnow()
        
        # Handle status updates
        if "status" in update_data:
            if update_data["status"] == OrderStatus.SHIPPED.value:
                update_data["shipped_at"] = datetime.utcnow()
            elif update_data["status"] == OrderStatus.DELIVERED.value:
                update_data["delivered_at"] = datetime.utcnow()
        
        result = await self.orders_collection.update_one(
            {"id": order_id},
            {"$set": update_data}
        )
        
        if result.modified_count > 0:
            return await self.get_order_by_id(order_id)
        return None
    
    async def validate_order_items(self, items: List[OrderItem]) -> bool:
        """Validate order items against product availability"""
        for item in items:
            product_doc = await self.products_collection.find_one({"id": item.product_id})
            if not product_doc:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Product {item.product_id} not found"
                )
            
            product = ProductInDB(**product_doc)
            
            if not product.is_active:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Product {product.name} is not available"
                )
            
            if product.stock_quantity < item.quantity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Insufficient stock for {product.name}"
                )
        
        return True

@router.post("/", response_model=APIResponse)
async def create_order(
    order_data: OrderCreate,
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends()
):
    """Create new order"""
    try:
        order_service = OrderService(db)
        
        # Validate order items
        await order_service.validate_order_items(order_data.items)
        
        # Create order
        order = await order_service.create_order(current_user.id, order_data.dict())
        
        # Create response
        order_response = OrderResponse(**order.dict())
        
        return APIResponse(
            success=True,
            message="Order created successfully",
            data=order_response.dict()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create order"
        )

@router.get("/", response_model=PaginatedResponse)
async def get_user_orders(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends()
):
    """Get user's orders"""
    try:
        order_service = OrderService(db)
        
        result = await order_service.get_user_orders(
            current_user.id,
            page=page,
            per_page=per_page,
            status=status
        )
        
        # Convert to response format
        order_responses = []
        for order_doc in result["orders"]:
            order = OrderInDB(**order_doc)
            order_responses.append(OrderResponse(**order.dict()).dict())
        
        return PaginatedResponse(
            success=True,
            message="Orders retrieved successfully",
            data=order_responses,
            total=result["total"],
            page=result["page"],
            per_page=result["per_page"],
            total_pages=result["total_pages"]
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve orders"
        )

@router.get("/{order_id}", response_model=APIResponse)
async def get_order(
    order_id: str,
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends()
):
    """Get order by ID"""
    try:
        order_service = OrderService(db)
        
        order = await order_service.get_order_by_id(order_id)
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found"
            )
        
        # Check if user owns the order or is admin
        if order.user_id != current_user.id and current_user.role not in ["admin", "super_admin"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view this order"
            )
        
        order_response = OrderResponse(**order.dict())
        
        return APIResponse(
            success=True,
            message="Order retrieved successfully",
            data=order_response.dict()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve order"
        )

@router.get("/admin/all", response_model=PaginatedResponse)
async def get_all_orders(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    user_id: Optional[str] = None,
    admin_user: UserInDB = Depends(get_admin_user),
    db: AsyncIOMotorDatabase = Depends()
):
    """Get all orders (admin only)"""
    try:
        order_service = OrderService(db)
        
        result = await order_service.get_all_orders(
            page=page,
            per_page=per_page,
            status=status,
            user_id=user_id
        )
        
        # Convert to response format
        order_responses = []
        for order_doc in result["orders"]:
            order = OrderInDB(**order_doc)
            order_responses.append(OrderResponse(**order.dict()).dict())
        
        return PaginatedResponse(
            success=True,
            message="Orders retrieved successfully",
            data=order_responses,
            total=result["total"],
            page=result["page"],
            per_page=result["per_page"],
            total_pages=result["total_pages"]
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve orders"
        )

@router.put("/{order_id}", response_model=APIResponse)
async def update_order(
    order_id: str,
    update_data: OrderUpdate,
    admin_user: UserInDB = Depends(get_admin_user),
    db: AsyncIOMotorDatabase = Depends()
):
    """Update order (admin only)"""
    try:
        order_service = OrderService(db)
        
        # Check if order exists
        order = await order_service.get_order_by_id(order_id)
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found"
            )
        
        # Update order
        updated_order = await order_service.update_order(
            order_id,
            update_data.dict(exclude_unset=True)
        )
        
        order_response = OrderResponse(**updated_order.dict())
        
        return APIResponse(
            success=True,
            message="Order updated successfully",
            data=order_response.dict()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update order"
        )

@router.get("/number/{order_number}", response_model=APIResponse)
async def get_order_by_number(
    order_number: str,
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends()
):
    """Get order by order number"""
    try:
        order_service = OrderService(db)
        
        order = await order_service.get_order_by_number(order_number)
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found"
            )
        
        # Check if user owns the order or is admin
        if order.user_id != current_user.id and current_user.role not in ["admin", "super_admin"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view this order"
            )
        
        order_response = OrderResponse(**order.dict())
        
        return APIResponse(
            success=True,
            message="Order retrieved successfully",
            data=order_response.dict()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve order"
        )

@router.post("/guest", response_model=APIResponse)
async def create_guest_order(
    order_data: GuestOrderCreate,
    session_id: Optional[str] = Header(None, alias="X-Session-Id"),
    db: AsyncIOMotorDatabase = Depends()
):
    """Create new order for guest user"""
    try:
        if not session_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Session ID is required for guest checkout"
            )
        
        order_service = OrderService(db)
        
        # Validate order items
        await order_service.validate_order_items(order_data.items)
        
        # Create order data dict
        order_dict = order_data.dict()
        
        # Create order
        order = await order_service.create_guest_order(session_id, order_dict)
        
        # Create response
        order_response = OrderResponse(**order.dict())
        
        return APIResponse(
            success=True,
            message="Order created successfully",
            data=order_response.dict()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Guest order creation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create order"
        )