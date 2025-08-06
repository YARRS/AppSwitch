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

# Inquiry status enum
class InquiryStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    RESPONDED = "responded"
    RESOLVED = "resolved"
    CLOSED = "closed"

# Product category enum
class ProductCategory(str, Enum):
    HOME_DECOR = "home_decor"
    PERSONALIZED_GIFTS = "personalized_gifts"
    JEWELRY = "jewelry"
    KEEPSAKES = "keepsakes"
    SPECIAL_OCCASIONS = "special_occasions"
    ACCESSORIES = "accessories"

# Product assignment status enum
class ProductAssignmentStatus(str, Enum):
    ACTIVE = "active"
    REASSIGNED = "reassigned"
    REVOKED = "revoked"
    PENDING = "pending"

# Reallocation reason enum
class ReallocationReason(str, Enum):
    TIME_BASED = "time_based"
    PERFORMANCE_BASED = "performance_based"
    MANUAL_ADMIN = "manual_admin"
    INVENTORY_ISSUES = "inventory_issues"
    HIGH_PERFORMER_ROTATION = "high_performer_rotation"

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
    store_owner_id: Optional[str] = None  # For salespeople, ID of their store owner

class UserResponse(UserBase, BaseDocument):
    email_verified: bool
    last_login: Optional[datetime] = None
    store_owner_id: Optional[str] = None  # For salespeople, ID of their store owner

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
    category: str  # Category slug instead of enum
    price: float
    discount_price: Optional[float] = None
    sku: str
    brand: str = "Vallmark"
    specifications: Dict[str, Any] = {}
    features: List[str] = []
    images: List[str] = []  # Base64 encoded images
    videos: List[str] = []  # Base64 encoded videos
    is_active: bool = True
    stock_quantity: int = 0
    min_stock_level: int = 5

class ProductCreate(ProductBase):
    # Fields for salesman assignment
    uploaded_by: Optional[str] = None  # User ID of the salesman who uploaded
    assigned_to: Optional[str] = None  # User ID of the salesman assigned to manage

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None  # Category slug instead of enum
    price: Optional[float] = None
    discount_price: Optional[float] = None
    specifications: Optional[Dict[str, Any]] = None
    features: Optional[List[str]] = None
    images: Optional[List[str]] = None
    videos: Optional[List[str]] = None
    is_active: Optional[bool] = None
    stock_quantity: Optional[int] = None
    min_stock_level: Optional[int] = None
    # Assignment fields
    assigned_to: Optional[str] = None

class ProductInDB(ProductBase, BaseDocument):
    views: int = 0
    sales_count: int = 0
    rating: float = 0.0
    review_count: int = 0
    # Enhanced fields for salesman assignment
    uploaded_by: Optional[str] = None  # User ID of the salesman who uploaded
    assigned_to: Optional[str] = None  # Current assigned salesman
    assigned_by: Optional[str] = None  # User ID who assigned the product (usually store owner)
    last_updated_by: Optional[str] = None  # Last person to update product
    assignment_history: List[str] = []  # List of assignment record IDs
    total_earnings: float = 0.0  # Total commission earned from this product
    last_sale_date: Optional[datetime] = None  # Last time this product was sold

class ProductResponse(ProductBase, BaseDocument):
    views: int
    sales_count: int
    rating: float
    review_count: int
    is_in_stock: bool
    uploaded_by: Optional[str] = None
    assigned_to: Optional[str] = None
    assigned_by: Optional[str] = None
    assigned_salesman_name: Optional[str] = None
    uploader_name: Optional[str] = None
    assigned_by_name: Optional[str] = None
    total_earnings: float = 0.0
    last_sale_date: Optional[datetime] = None
    
    @validator('is_in_stock', pre=True, always=True)
    def calculate_stock_status(cls, v, values):
        return values.get('stock_quantity', 0) > 0

# Product Assignment History Models
class ProductAssignmentBase(BaseModel):
    product_id: str
    assigned_to: str  # User ID of salesman
    assigned_by: Optional[str] = None  # User ID of admin who made assignment (set automatically)
    reason: ReallocationReason
    status: ProductAssignmentStatus = ProductAssignmentStatus.ACTIVE
    notes: Optional[str] = None

class ProductAssignmentCreate(ProductAssignmentBase):
    pass

class ProductAssignmentUpdate(BaseModel):
    status: Optional[ProductAssignmentStatus] = None
    notes: Optional[str] = None
    end_date: Optional[datetime] = None

class ProductAssignmentInDB(ProductAssignmentBase, BaseDocument):
    assigned_by: str  # Will be set in backend
    start_date: datetime = None
    end_date: Optional[datetime] = None
    performance_data: Dict[str, Any] = {}  # Sales, revenue, etc.
    
    def __init__(self, **data):
        if not data.get('start_date'):
            data['start_date'] = datetime.utcnow()
        super().__init__(**data)

class ProductAssignmentResponse(ProductAssignmentBase, BaseDocument):
    start_date: datetime
    end_date: Optional[datetime] = None
    assigned_to_name: Optional[str] = None
    assigned_by_name: Optional[str] = None
    product_name: Optional[str] = None
    performance_data: Dict[str, Any] = {}

# Enhanced Commission Management Models
class CommissionRuleBase(BaseModel):
    rule_name: str
    user_id: Optional[str] = None  # Specific user (if individual rule)
    user_role: Optional[UserRole] = None  # Role-based rule
    product_id: Optional[str] = None  # Individual product rule
    product_category: Optional[ProductCategory] = None  # Category-based rule
    commission_type: str  # "percentage" or "fixed"
    commission_value: float
    min_order_amount: Optional[float] = None
    max_commission_amount: Optional[float] = None
    priority: int = 0  # Higher priority rules take precedence
    is_active: bool = True
    effective_from: datetime = None
    effective_until: Optional[datetime] = None

class CommissionRuleCreate(CommissionRuleBase):
    pass  # created_by will be set automatically in backend

class CommissionRuleUpdate(BaseModel):
    rule_name: Optional[str] = None
    commission_type: Optional[str] = None
    commission_value: Optional[float] = None
    min_order_amount: Optional[float] = None
    max_commission_amount: Optional[float] = None
    priority: Optional[int] = None
    is_active: Optional[bool] = None
    effective_from: Optional[datetime] = None
    effective_until: Optional[datetime] = None

class CommissionRuleInDB(CommissionRuleBase, BaseDocument):
    created_by: str  # Will be set in backend
    usage_count: int = 0  # How many times this rule has been applied
    total_commission_paid: float = 0.0  # Total commission paid using this rule
    
    def __init__(self, **data):
        if not data.get('effective_from'):
            data['effective_from'] = datetime.utcnow()
        super().__init__(**data)

class CommissionRuleResponse(CommissionRuleBase, BaseDocument):
    created_by: str
    created_by_name: Optional[str] = None
    user_name: Optional[str] = None
    product_name: Optional[str] = None
    usage_count: int = 0
    total_commission_paid: float = 0.0

class CommissionEarningBase(BaseModel):
    user_id: str
    order_id: str
    product_id: str
    commission_rule_id: str
    order_amount: float
    commission_amount: float
    commission_rate: float
    commission_type: str  # "percentage" or "fixed"
    status: CommissionStatus = CommissionStatus.PENDING
    approved_by: Optional[str] = None
    paid_at: Optional[datetime] = None

class CommissionEarningCreate(CommissionEarningBase):
    pass

class CommissionEarningUpdate(BaseModel):
    status: Optional[CommissionStatus] = None
    approved_by: Optional[str] = None
    notes: Optional[str] = None

class CommissionEarningInDB(CommissionEarningBase, BaseDocument):
    notes: Optional[str] = None
    payment_reference: Optional[str] = None

class CommissionEarningResponse(CommissionEarningBase, BaseDocument):
    notes: Optional[str] = None
    payment_reference: Optional[str] = None
    user_name: Optional[str] = None
    product_name: Optional[str] = None
    order_number: Optional[str] = None
    approved_by_name: Optional[str] = None

# Shopping cart models
class CartItem(BaseModel):
    product_id: str
    quantity: int = 1
    price: float
    product_name: str
    product_image: Optional[str] = None

class CartBase(BaseModel):
    user_id: Optional[str] = None  # None for guest carts
    session_id: Optional[str] = None  # For guest cart identification
    items: List[CartItem] = []
    total_amount: float = 0.0
    total_items: int = 0

class CartInDB(CartBase, BaseDocument):
    pass

class CartResponse(CartBase, BaseDocument):
    pass

# Guest cart models for session-based storage
class GuestCartItem(BaseModel):
    product_id: str
    quantity: int = 1
    price: float
    product_name: str
    product_image: Optional[str] = None

class GuestCart(BaseModel):
    session_id: str
    items: List[GuestCartItem] = []
    total_amount: float = 0.0
    total_items: int = 0
    created_at: datetime = None
    updated_at: datetime = None
    
    def __init__(self, **data):
        if not data.get('created_at'):
            data['created_at'] = datetime.utcnow()
        if not data.get('updated_at'):
            data['updated_at'] = datetime.utcnow()
        super().__init__(**data)

class CartMergeRequest(BaseModel):
    guest_session_id: str

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
    is_hidden: bool = False  # Hidden categories only visible to admin users
    is_seasonal: bool = False  # Seasonal categories for campaign targeting
    seasonal_months: Optional[List[int]] = None  # Months when seasonal category is relevant [1-12]
    sort_order: int = 0

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    image: Optional[str] = None
    is_active: Optional[bool] = None
    is_hidden: Optional[bool] = None
    is_seasonal: Optional[bool] = None
    seasonal_months: Optional[List[int]] = None
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
    status: InquiryStatus = InquiryStatus.PENDING

class InquiryCreate(InquiryBase):
    pass

class InquiryUpdate(BaseModel):
    status: Optional[InquiryStatus] = None
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

# Inventory Management Models
class InventoryLogBase(BaseModel):
    product_id: str
    user_id: str
    action: InventoryAction
    quantity: int
    reason: str
    notes: Optional[str] = None

class InventoryLogCreate(InventoryLogBase):
    pass

class InventoryLogInDB(InventoryLogBase, BaseDocument):
    pass

class InventoryLogResponse(InventoryLogBase, BaseDocument):
    pass

# Campaign Management Models
class CampaignBase(BaseModel):
    name: str
    description: str
    discount_type: str  # "percentage" or "fixed"
    discount_value: float
    min_order_amount: Optional[float] = None
    max_discount_amount: Optional[float] = None
    start_date: datetime
    end_date: datetime
    status: CampaignStatus = CampaignStatus.SCHEDULED
    product_ids: List[str] = []  # Empty means all products
    category_ids: List[str] = []  # Specific category IDs to target
    category_slugs: List[str] = []  # Category slugs for easier targeting
    target_seasonal_categories: bool = False  # If true, applies to seasonal categories
    user_roles: List[str] = []  # Empty means all users
    usage_limit: Optional[int] = None
    usage_count: int = 0
    created_by: str

class CampaignCreate(CampaignBase):
    pass

class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    discount_type: Optional[str] = None
    discount_value: Optional[float] = None
    min_order_amount: Optional[float] = None
    max_discount_amount: Optional[float] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    status: Optional[CampaignStatus] = None
    product_ids: Optional[List[str]] = None
    category_ids: Optional[List[str]] = None
    category_slugs: Optional[List[str]] = None
    target_seasonal_categories: Optional[bool] = None
    user_roles: Optional[List[str]] = None
    usage_limit: Optional[int] = None

class CampaignInDB(CampaignBase, BaseDocument):
    pass

class CampaignResponse(CampaignBase, BaseDocument):
    pass

# Dashboard Analytics Models
class DashboardStatsBase(BaseModel):
    total_products: int = 0
    total_orders: int = 0
    total_revenue: float = 0.0
    total_customers: int = 0
    low_stock_products: int = 0
    pending_orders: int = 0
    active_campaigns: int = 0
    total_commissions: float = 0.0

class SalespersonDashboard(DashboardStatsBase):
    my_sales: float = 0.0
    my_commissions: float = 0.0
    my_products: int = 0
    my_customers: int = 0

class StoreAdminDashboard(DashboardStatsBase):
    inventory_alerts: int = 0
    reassignment_requests: int = 0

class SalesManagerDashboard(DashboardStatsBase):
    team_performance: List[Dict[str, Any]] = []
    campaign_performance: List[Dict[str, Any]] = []

class StoreOwnerDashboard(DashboardStatsBase):
    profit_margin: float = 0.0
    commission_payouts: float = 0.0
    inventory_value: float = 0.0

class SupportExecutiveDashboard(BaseModel):
    total_tickets: int = 0
    pending_tickets: int = 0
    resolved_tickets: int = 0
    customer_inquiries: int = 0

class MarketingManagerDashboard(DashboardStatsBase):
    conversion_rate: float = 0.0
    customer_acquisition: int = 0
    email_campaigns: int = 0

# Product Reallocation Analytics Models
class ProductPerformanceMetrics(BaseModel):
    product_id: str
    assigned_to: str
    sales_count: int = 0
    revenue: float = 0.0
    commission_earned: float = 0.0
    last_update: Optional[datetime] = None
    days_since_update: int = 0
    performance_score: float = 0.0  # Calculated score for reallocation decisions

class ReallocationCandidate(BaseModel):
    product_id: str
    current_assignee: str
    suggested_assignee: Optional[str] = None
    reason: ReallocationReason
    performance_metrics: ProductPerformanceMetrics
    priority_score: float = 0.0

class ReallocationRecommendation(BaseModel):
    candidates: List[ReallocationCandidate]
    generated_at: datetime
    criteria: Dict[str, Any]  # Criteria used for recommendations
    total_candidates: int = 0

# Bulk Operations Models
class BulkCommissionRuleUpdate(BaseModel):
    rule_ids: List[str]
    updates: CommissionRuleUpdate

class BulkProductReassignment(BaseModel):
    product_ids: List[str]
    new_assignee: str
    reason: ReallocationReason
    notes: Optional[str] = None