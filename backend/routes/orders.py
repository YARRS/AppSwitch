from fastapi import APIRouter, Depends, HTTPException, status, Query, Header
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional, List
from datetime import datetime
import uuid
from pydantic import BaseModel
import re

from models import (
    OrderCreate, OrderUpdate, OrderResponse, OrderInDB,
    OrderItem, OrderStatus, APIResponse, PaginatedResponse,
    UserInDB, ProductInDB, CartInDB, GuestCart, ShippingAddress,
    UserRole
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
        self.users_collection = db.users
        self.guest_carts_collection = db.guest_carts
    
    async def find_or_create_user_by_phone(self, phone_number: str, customer_email: Optional[str] = None, full_name: Optional[str] = None) -> UserInDB:
        """Find existing user by phone or create new one"""
        try:
            # Clean phone number
            clean_phone = re.sub(r'\D', '', phone_number)
            if len(clean_phone) >= 10:
                clean_phone = clean_phone[-10:]  # Take last 10 digits
            
            # Try to find existing user by phone
            existing_user = await self.users_collection.find_one({"phone": clean_phone})
            
            if existing_user:
                return UserInDB(**existing_user)
            
            # Create new user with phone as primary identifier
            from auth import AuthService
            
            # Generate unique username based on phone
            username = f"user_{clean_phone}"
            counter = 1
            while await self.users_collection.find_one({"username": username}):
                username = f"user_{clean_phone}_{counter}"
                counter += 1
            
            # Check if email already exists
            if customer_email:
                existing_email_user = await self.users_collection.find_one({"email": customer_email})
                if existing_email_user:
                    customer_email = None  # Don't set email if already exists
            
            user_data = {
                "id": str(uuid.uuid4()),
                "username": username,
                "email": customer_email or f"{username}@placeholder.com",  # Placeholder email
                "phone": clean_phone,
                "full_name": full_name or f"Customer {clean_phone}",
                "role": UserRole.CUSTOMER.value,
                "is_active": True,
                "email_verified": False,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "hashed_password": None,  # No password initially
                "needs_password_setup": True  # Flag to indicate password setup needed
            }
            
            await self.users_collection.insert_one(user_data)
            return UserInDB(**user_data)
            
        except Exception as e:
            # If user creation fails, return a temporary user object
            return UserInDB(
                id=f"temp_{clean_phone}",
                username=f"guest_{clean_phone}",
                email=customer_email or f"guest_{clean_phone}@temp.com",
                phone=clean_phone,
                full_name=full_name or f"Guest {clean_phone}",
                role=UserRole.CUSTOMER.value,
                is_active=True,
                email_verified=False,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
    
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

async def get_db():
    from server import db
    return db

@router.post("/", response_model=APIResponse)
async def create_order(
    order_data: OrderCreate,
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
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

@router.post("/guest", response_model=APIResponse)
async def create_guest_order(
    order_data: GuestOrderCreate,
    session_id: Optional[str] = Header(None, alias="X-Session-Id"),
    db: AsyncIOMotorDatabase = Depends()
):
    """Create order for guest user with auto-user creation"""
    try:
        order_service = OrderService(db)
        
        # Validate order items
        await order_service.validate_order_items(order_data.items)
        
        # Extract phone number from shipping address
        phone_number = order_data.shipping_address.phone
        if not phone_number:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Phone number is required for guest orders"
            )
        
        # Find or create user based on phone number
        user = await order_service.find_or_create_user_by_phone(
            phone_number=phone_number,
            customer_email=order_data.customer_email,
            full_name=order_data.shipping_address.full_name
        )
        
        # Create order data
        order_dict = order_data.dict()
        order_dict["user_id"] = user.id
        
        # Create order
        order = await order_service.create_order(user.id, order_dict)
        
        # Clear guest cart if session ID provided
        if session_id:
            await order_service.guest_carts_collection.delete_one({"session_id": session_id})
        
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
            detail="Failed to create guest order"
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

