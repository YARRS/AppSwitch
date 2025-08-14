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
    UserRole, AuthenticatedOrderCreate
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
            # Use consistent phone formatting from AuthService
            from auth import AuthService, UserService
            
            # Format phone number using the same logic as the login system
            try:
                clean_phone = AuthService.format_phone_number(phone_number)
            except ValueError as e:
                # If formatting fails, fall back to simple cleaning but log the issue
                print(f"Phone formatting failed for '{phone_number}': {e}")
                clean_phone = re.sub(r'\D', '', phone_number)
                if len(clean_phone) >= 10:
                    clean_phone = clean_phone[-10:]  # Take last 10 digits
            
            # Try to find existing user by phone using UserService (which handles format variations)
            user_service = UserService(self.db)
            existing_user = await user_service.get_user_by_phone(clean_phone)
            
            if existing_user:
                # Update the full_name if provided and different
                if full_name and full_name != existing_user.get("full_name"):
                    await self.users_collection.update_one(
                        {"id": existing_user["id"]},
                        {"$set": {"full_name": full_name, "updated_at": datetime.utcnow()}}
                    )
                    existing_user["full_name"] = full_name
                
                return UserInDB(**existing_user)
            
            # Create new user using UserService for consistency
            from auth import UserService
            
            # Generate username based on full_name or phone
            if full_name:
                # Create username from full_name, removing spaces and special chars
                base_username = re.sub(r'[^a-zA-Z0-9]', '', full_name.lower())
                if len(base_username) < 3:
                    base_username = f"user_{clean_phone}"
            else:
                base_username = f"user_{clean_phone}"
            
            # Ensure username is unique
            username = base_username
            counter = 1
            while await self.users_collection.find_one({"username": username}):
                username = f"{base_username}_{counter}"
                counter += 1
            
            # Check if email already exists
            if customer_email:
                existing_email_user = await self.users_collection.find_one({"email": customer_email})
                if existing_email_user:
                    customer_email = None  # Don't set email if already exists
            
            # Generate a secure password that the user can use to login
            # Use a combination of name and phone for memorable password
            if full_name:
                # Use first name + last 4 digits of phone
                name_part = re.sub(r'[^a-zA-Z]', '', full_name.split()[0].lower())[:4]
                phone_part = clean_phone[-4:]
                temp_password = f"{name_part.capitalize()}{phone_part}"
            else:
                temp_password = f"Guest{clean_phone[-4:]}"
            
            # Create user data for UserService
            user_create_data = {
                "id": str(uuid.uuid4()),
                "username": username,
                "email": customer_email or f"{username}@placeholder.com",
                "phone": clean_phone,  # UserService will encrypt this
                "full_name": full_name or f"Customer {clean_phone}",
                "role": UserRole.CUSTOMER.value,
                "is_active": True,
                "email_verified": False,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "password": temp_password,  # UserService will hash this correctly
                "needs_password_setup": False  # User can login with the generated password
            }
            
            # Use UserService to create user (ensures consistency with auth system)
            user_service = UserService(self.db)
            user = await user_service.create_user(user_create_data)
            
            return user
            
        except Exception as e:
            # If user creation fails, return a temporary user object
            clean_phone = re.sub(r'\D', '', phone_number)[-10:]
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
                updated_at=datetime.utcnow(),
                hashed_password=""  # Empty password hash
            )
    
    async def create_order(self, user_id: str, order_data: dict) -> OrderInDB:
        """Create new order"""
        # Generate order number
        order_number = f"VL{datetime.now().strftime('%Y%m%d')}{str(uuid.uuid4())[:8].upper()}"
        
        # Prepare complete order data
        complete_order_data = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "order_number": order_number,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "status": "pending",  # Default status
            **order_data
        }
        
        order = OrderInDB(**complete_order_data)
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
        order_number = f"VL{datetime.now().strftime('%Y%m%d')}{str(uuid.uuid4())[:8].upper()}"
        
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
    order_data: AuthenticatedOrderCreate,
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Create new order"""
    try:
        order_service = OrderService(db)
        
        # Validate order items
        await order_service.validate_order_items(order_data.items)
        
        # Add user_id to order data (extracted from JWT token)
        order_dict = order_data.dict()
        order_dict["user_id"] = current_user.id
        
        # Create order
        order = await order_service.create_order(current_user.id, order_dict)
        
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
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Create order for guest user with auto-user creation and login"""
    try:
        order_service = OrderService(db)
        
        # Validate order items
        await order_service.validate_order_items(order_data.items)
        
        # Extract phone number from shipping address (use single verified phone)
        phone_number = order_data.shipping_address.phone
        if not phone_number:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Phone number is required for guest orders"
            )
        
        # Find or create user based on phone number with proper name handling
        user = await order_service.find_or_create_user_by_phone(
            phone_number=phone_number,
            customer_email=order_data.customer_email,
            full_name=order_data.shipping_address.full_name  # Use the name from shipping address
        )
        
        # Create order data
        order_dict = order_data.dict()
        order_dict["user_id"] = user.id
        
        # Create order
        order = await order_service.create_order(user.id, order_dict)
        
        # Clear guest cart if session ID provided
        if session_id:
            await order_service.guest_carts_collection.delete_one({"session_id": session_id})
        
        # Generate login token for the created/found user
        from auth import AuthService
        from datetime import timedelta
        access_token_expires = timedelta(hours=24)
        access_token = AuthService.create_access_token(
            data={"sub": user.id, "email": user.email, "role": user.role},
            expires_delta=access_token_expires
        )
        
        # Create response with order data and login token
        order_response = OrderResponse(**order.dict())
        
        # Include user login information in response
        response_data = {
            "order": order_response.dict(),
            "user_logged_in": True,
            "access_token": access_token,
            "token_type": "bearer",
            "expires_in": 86400,  # 24 hours in seconds
            "user": {
                "id": user.id,
                "email": user.email,
                "username": user.username,
                "full_name": user.full_name,
                "phone": user.phone,
                "role": user.role,
                "is_active": user.is_active,
                "email_verified": user.email_verified,
                "needs_password_setup": getattr(user, 'needs_password_setup', False)
            }
        }
        
        return APIResponse(
            success=True,
            message="Order created successfully and user logged in",
            data=response_data
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Guest order creation error: {e}")
        print(f"Error type: {type(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
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
    db: AsyncIOMotorDatabase = Depends(get_db)
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
    db: AsyncIOMotorDatabase = Depends(get_db)
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
    db: AsyncIOMotorDatabase = Depends(get_db)
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
    db: AsyncIOMotorDatabase = Depends(get_db)
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
    db: AsyncIOMotorDatabase = Depends(get_db)
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