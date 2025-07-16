from pydantic import BaseModel, EmailStr, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum
import uuid

# User roles enum
class UserRole(str, Enum):
    CUSTOMER = "customer"
    ADMIN = "admin"
    SUPER_ADMIN = "super_admin"
    SALESPERSON = "salesperson"
    STORE_ADMIN = "store_admin"
    SALES_MANAGER = "sales_manager"
    STORE_OWNER = "store_owner"
    SUPPORT_EXECUTIVE = "support_executive"
    MARKETING_MANAGER = "marketing_manager"

# Order status enum
class OrderStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"

# Campaign status enum
class CampaignStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SCHEDULED = "scheduled"
    EXPIRED = "expired"

# Commission status enum
class CommissionStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    PAID = "paid"
    CANCELLED = "cancelled"

# Inventory action enum
class InventoryAction(str, Enum):
    STOCK_IN = "stock_in"
    STOCK_OUT = "stock_out"
    ADJUSTMENT = "adjustment"
    REASSIGNMENT = "reassignment"
    RETURN = "return"

# Product category enum
class ProductCategory(str, Enum):
    SMART_SWITCH = "smart_switch"
    DIMMER_SWITCH = "dimmer_switch"
    MOTION_SENSOR = "motion_sensor"
    SMART_PLUG = "smart_plug"
    GATEWAY = "gateway"
    ACCESSORIES = "accessories"

# Base models
class BaseDocument(BaseModel):
    id: str = None
    created_at: datetime = None
    updated_at: datetime = None
    
    def __init__(self, **data):
        if not data.get('id'):
            data['id'] = str(uuid.uuid4())
        if not data.get('created_at'):
            data['created_at'] = datetime.utcnow()
        if not data.get('updated_at'):
            data['updated_at'] = datetime.utcnow()
        super().__init__(**data)

# User models
class UserBase(BaseModel):
    email: EmailStr
    username: str
    full_name: Optional[str] = None
    phone: Optional[str] = None
    role: UserRole = UserRole.CUSTOMER
    is_active: bool = True

class UserCreate(UserBase):
    password: str
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not any(char.isdigit() for char in v):
            raise ValueError('Password must contain at least one digit')
        if not any(char.isupper() for char in v):
            raise ValueError('Password must contain at least one uppercase letter')
        return v

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None

class UserInDB(UserBase, BaseDocument):
    password_hash: str
    email_verified: bool = False
    last_login: Optional[datetime] = None

class UserResponse(UserBase, BaseDocument):
    email_verified: bool
    last_login: Optional[datetime] = None

# Authentication models
class Token(BaseModel):
    access_token: str
    token_type: str
    expires_in: int
    user: UserResponse

class TokenData(BaseModel):
    user_id: Optional[str] = None
    email: Optional[str] = None

# Product models
class ProductBase(BaseModel):
    name: str
    description: str
    category: ProductCategory
    price: float
    discount_price: Optional[float] = None
    sku: str
    brand: str = "SmartSwitch"
    specifications: Dict[str, Any] = {}
    features: List[str] = []
    images: List[str] = []  # Base64 encoded images
    is_active: bool = True
    stock_quantity: int = 0
    min_stock_level: int = 5

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[ProductCategory] = None
    price: Optional[float] = None
    discount_price: Optional[float] = None
    specifications: Optional[Dict[str, Any]] = None
    features: Optional[List[str]] = None
    images: Optional[List[str]] = None
    is_active: Optional[bool] = None
    stock_quantity: Optional[int] = None
    min_stock_level: Optional[int] = None

class ProductInDB(ProductBase, BaseDocument):
    views: int = 0
    sales_count: int = 0
    rating: float = 0.0
    review_count: int = 0

class ProductResponse(ProductBase, BaseDocument):
    views: int
    sales_count: int
    rating: float
    review_count: int
    is_in_stock: bool
    
    @validator('is_in_stock', pre=True, always=True)
    def calculate_stock_status(cls, v, values):
        return values.get('stock_quantity', 0) > 0

# Shopping cart models
class CartItem(BaseModel):
    product_id: str
    quantity: int = 1
    price: float
    product_name: str
    product_image: Optional[str] = None

class CartBase(BaseModel):
    user_id: str
    items: List[CartItem] = []
    total_amount: float = 0.0
    total_items: int = 0

class CartInDB(CartBase, BaseDocument):
    pass

class CartResponse(CartBase, BaseDocument):
    pass

# Order models
class OrderItem(BaseModel):
    product_id: str
    product_name: str
    product_image: Optional[str] = None
    quantity: int
    price: float
    total_price: float

class ShippingAddress(BaseModel):
    full_name: str
    phone: str
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    state: str
    zip_code: str
    country: str = "India"

class OrderBase(BaseModel):
    user_id: str
    items: List[OrderItem]
    shipping_address: ShippingAddress
    total_amount: float
    tax_amount: float = 0.0
    shipping_cost: float = 0.0
    discount_amount: float = 0.0
    final_amount: float
    status: OrderStatus = OrderStatus.PENDING
    payment_method: str = "COD"
    notes: Optional[str] = None

class OrderCreate(OrderBase):
    pass

class OrderUpdate(BaseModel):
    status: Optional[OrderStatus] = None
    tracking_number: Optional[str] = None
    notes: Optional[str] = None

class OrderInDB(OrderBase, BaseDocument):
    order_number: str
    tracking_number: Optional[str] = None
    shipped_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None

class OrderResponse(OrderBase, BaseDocument):
    order_number: str
    tracking_number: Optional[str] = None
    shipped_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None

# Category models
class CategoryBase(BaseModel):
    name: str
    description: str
    slug: str
    image: Optional[str] = None  # Base64 encoded image
    is_active: bool = True
    sort_order: int = 0

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    image: Optional[str] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None

class CategoryInDB(CategoryBase, BaseDocument):
    product_count: int = 0

class CategoryResponse(CategoryBase, BaseDocument):
    product_count: int

# Inquiry models
class InquiryBase(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    subject: str
    message: str
    status: str = "pending"

class InquiryCreate(InquiryBase):
    pass

class InquiryUpdate(BaseModel):
    status: Optional[str] = None
    admin_notes: Optional[str] = None

class InquiryInDB(InquiryBase, BaseDocument):
    admin_notes: Optional[str] = None
    responded_at: Optional[datetime] = None

class InquiryResponse(InquiryBase, BaseDocument):
    admin_notes: Optional[str] = None
    responded_at: Optional[datetime] = None

# API Response models
class APIResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Any] = None
    errors: Optional[List[str]] = None

class PaginatedResponse(BaseModel):
    success: bool
    message: str
    data: List[Any]
    total: int
    page: int
    per_page: int
    total_pages: int