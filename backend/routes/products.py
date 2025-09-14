from fastapi import APIRouter, Depends, HTTPException, status, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional, List
from datetime import datetime, timedelta

from models import (
    ProductCreate, ProductUpdate, ProductResponse, ProductInDB,
    CategoryCreate, CategoryUpdate, CategoryResponse, CategoryInDB,
    ProductCategory, APIResponse, PaginatedResponse, UserInDB
)
from auth import (
    get_current_active_user, get_admin_user, get_admin_or_manager_user, 
    get_inventory_user, get_salesperson_user, get_optional_current_user
)

router = APIRouter(prefix="/api/products", tags=["Products"])

# Database dependency
async def get_db():
    from server import db
    return db

class ProductService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.products_collection = db.products
        self.categories_collection = db.categories
        self.users_collection = db.users
    
    async def create_product(self, product_data: dict, user_id: str) -> ProductInDB:
        """Create new product with salesman assignment"""
        # Set uploaded_by and initially assigned_to
        product_data["uploaded_by"] = user_id
        if not product_data.get("assigned_to"):
            product_data["assigned_to"] = user_id
        
        product_data["last_updated_by"] = user_id
        
        # Auto-assignment logic: If salesman creates product, find their store owner
        if not product_data.get("assigned_by"):
            user_doc = await self.users_collection.find_one({"id": user_id})
            if user_doc and user_doc.get("role") == "salesperson" and user_doc.get("store_owner_id"):
                product_data["assigned_by"] = user_doc["store_owner_id"]
            else:
                product_data["assigned_by"] = user_id
        
        product = ProductInDB(**product_data)
        product_dict = product.dict()
        
        await self.products_collection.insert_one(product_dict)
        return product
    
    async def get_product_by_id(self, product_id: str) -> Optional[ProductInDB]:
        """Get product by ID"""
        product_doc = await self.products_collection.find_one({"id": product_id})
        if product_doc:
            return ProductInDB(**product_doc)
        return None
    
    async def get_product_by_sku(self, sku: str) -> Optional[ProductInDB]:
        """Get product by SKU"""
        product_doc = await self.products_collection.find_one({"sku": sku})
        if product_doc:
            return ProductInDB(**product_doc)
        return None
    
    async def update_product(self, product_id: str, update_data: dict, user_id: str) -> Optional[ProductInDB]:
        """Update product"""
        update_data["updated_at"] = now_ist()
        update_data["last_updated_by"] = user_id
        
        result = await self.products_collection.update_one(
            {"id": product_id},
            {"$set": update_data}
        )
        
        if result.modified_count > 0:
            return await self.get_product_by_id(product_id)
        return None
    
    async def delete_product(self, product_id: str) -> bool:
        """Delete product"""
        result = await self.products_collection.delete_one({"id": product_id})
        return result.deleted_count > 0
    
    async def get_products(
        self,
        page: int = 1,
        per_page: int = 20,
        categories: Optional[List[str]] = None,  # Multiple categories
        search: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        is_active: Optional[bool] = None,
        assigned_to: Optional[str] = None,
        uploaded_by: Optional[str] = None
    ) -> dict:
        """Get products with filtering and pagination"""
        # Build query
        query = {}
        
        if categories:
            query["categories"] = {"$in": categories}  # Use the new categories field
        
        if search:
            query["$or"] = [
                {"name": {"$regex": search, "$options": "i"}},
                {"description": {"$regex": search, "$options": "i"}},
                {"features": {"$regex": search, "$options": "i"}}
            ]
        
        if min_price is not None or max_price is not None:
            price_query = {}
            if min_price is not None:
                price_query["$gte"] = min_price
            if max_price is not None:
                price_query["$lte"] = max_price
            query["price"] = price_query
        
        if is_active is not None:
            query["is_active"] = is_active
        
        if assigned_to:
            query["assigned_to"] = assigned_to
        
        if uploaded_by:
            query["uploaded_by"] = uploaded_by
        
        # Calculate skip value
        skip = (page - 1) * per_page
        
        # Get products with pagination
        cursor = self.products_collection.find(query).skip(skip).limit(per_page)
        products = await cursor.to_list(length=per_page)
        
        # Get total count
        total = await self.products_collection.count_documents(query)
        
        return {
            "products": products,
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": (total + per_page - 1) // per_page
        }
    
    async def get_products_with_user_details(self, products: List[dict]) -> List[dict]:
        """Enrich products with user details for assigned_to, uploaded_by, and assigned_by"""
        # Get unique user IDs
        user_ids = set()
        for product in products:
            if product.get("assigned_to"):
                user_ids.add(product["assigned_to"])
            if product.get("uploaded_by"):
                user_ids.add(product["uploaded_by"])
            if product.get("assigned_by"):
                user_ids.add(product["assigned_by"])
        
        # Get user details
        user_details = {}
        if user_ids:
            cursor = self.users_collection.find(
                {"id": {"$in": list(user_ids)}},
                {"id": 1, "username": 1, "full_name": 1}
            )
            users = await cursor.to_list(length=len(user_ids))
            for user in users:
                user_details[user["id"]] = {
                    "username": user["username"],
                    "full_name": user.get("full_name")
                }
        
        # Enrich products
        enriched_products = []
        for product in products:
            assigned_to = product.get("assigned_to")
            uploaded_by = product.get("uploaded_by")
            assigned_by = product.get("assigned_by")
            
            product["assigned_salesman_name"] = None
            product["uploader_name"] = None
            product["assigned_by_name"] = None
            
            if assigned_to and assigned_to in user_details:
                user = user_details[assigned_to]
                product["assigned_salesman_name"] = user.get("full_name") or user["username"]
            
            if uploaded_by and uploaded_by in user_details:
                user = user_details[uploaded_by]
                product["uploader_name"] = user.get("full_name") or user["username"]
            
            if assigned_by and assigned_by in user_details:
                user = user_details[assigned_by]
                product["assigned_by_name"] = user.get("full_name") or user["username"]
            
            enriched_products.append(product)
        
        return enriched_products
    
    async def increment_views(self, product_id: str):
        """Increment product views"""
        await self.products_collection.update_one(
            {"id": product_id},
            {"$inc": {"views": 1}}
        )
    
    async def update_product_sale_stats(self, product_id: str, quantity: int, revenue: float):
        """Update product sales statistics"""
        await self.products_collection.update_one(
            {"id": product_id},
            {
                "$inc": {
                    "sales_count": quantity,
                    "total_earnings": revenue
                },
                "$set": {
                    "last_sale_date": now_ist()
                }
            }
        )
    
    async def reassign_product(self, product_id: str, new_assignee: str, assigned_by: str) -> bool:
        """Reassign product to new salesman"""
        result = await self.products_collection.update_one(
            {"id": product_id},
            {
                "$set": {
                    "assigned_to": new_assignee,
                    "last_updated_by": assigned_by,
                    "updated_at": now_ist()
                }
            }
        )
        return result.modified_count > 0

# Product endpoints
@router.post("/", response_model=APIResponse)
async def create_product(
    product_data: ProductCreate,
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Create new product - accessible to salespeople, admins, and managers"""
    try:
        # Check permissions
        allowed_roles = ["admin", "super_admin", "store_owner", "sales_manager", "marketing_manager", "salesperson", "store_admin"]
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions to create products"
            )
        
        product_service = ProductService(db)
        
        # Check if SKU already exists
        existing_product = await product_service.get_product_by_sku(product_data.sku)
        if existing_product:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Product with this SKU already exists"
            )
        
        # Create product
        product = await product_service.create_product(product_data.dict(), current_user.id)
        
        # Create response
        product_response = ProductResponse(
            **product.dict(),
            is_in_stock=product.stock_quantity > 0
        )
        
        return APIResponse(
            success=True,
            message="Product created successfully",
            data=product_response.dict()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create product"
        )

@router.get("/", response_model=PaginatedResponse)
async def get_products(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    category: Optional[str] = None,  # Keep for backward compatibility
    categories: Optional[List[str]] = Query(None),  # New multiple categories parameter
    search: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    is_active: Optional[bool] = None,
    assigned_to: Optional[str] = None,
    uploaded_by: Optional[str] = None,
    current_user: Optional[UserInDB] = Depends(get_optional_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get products with filtering and pagination - accessible to guests and authenticated users"""
    try:
        product_service = ProductService(db)
        
        # Handle category/categories parameter - merge single category with categories list
        final_categories = []
        if category:
            final_categories.append(category)
        if categories:
            final_categories.extend(categories)
        # Remove duplicates while preserving order
        final_categories = list(dict.fromkeys(final_categories)) if final_categories else None
        
        # For guests (non-authenticated users), only show active products
        if current_user is None:
            is_active = True  # Force active products only for guests
            assigned_to = None  # Clear user-specific filters
            uploaded_by = None  # Clear user-specific filters
        else:
            # Filter products for salesperson (only their assigned/uploaded products)
            if current_user.role == "salesperson":
                if not assigned_to and not uploaded_by:
                    # Default to showing their products
                    assigned_to = current_user.id
        
        result = await product_service.get_products(
            page=page,
            per_page=per_page,
            categories=final_categories,
            search=search,
            min_price=min_price,
            max_price=max_price,
            is_active=is_active,
            assigned_to=assigned_to,
            uploaded_by=uploaded_by
        )
        
        # Enrich products with user details
        enriched_products = await product_service.get_products_with_user_details(result["products"])
        
        # Convert to response format
        product_responses = []
        for product_doc in enriched_products:
            product = ProductInDB(**product_doc)
            # Create response using enriched data (already contains user details)
            product_responses.append(ProductResponse(
                **product_doc,  # Use enriched data directly
                is_in_stock=product.stock_quantity > 0
            ).dict())
        
        return PaginatedResponse(
            success=True,
            message="Products retrieved successfully",
            data=product_responses,
            total=result["total"],
            page=result["page"],
            per_page=result["per_page"],
            total_pages=result["total_pages"]
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve products"
        )

@router.get("/my-products", response_model=PaginatedResponse)
async def get_my_products(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    category: Optional[str] = None,  # Keep for backward compatibility
    categories: Optional[List[str]] = Query(None),  # New multiple categories parameter
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get products assigned to or uploaded by current user"""
    try:
        product_service = ProductService(db)
        
        # Get products assigned to or uploaded by the user
        query = {
            "$or": [
                {"assigned_to": current_user.id},
                {"uploaded_by": current_user.id}
            ]
        }
        
        # Handle category/categories parameter - merge single category with categories list
        final_categories = []
        if category:
            final_categories.append(category)
        if categories:
            final_categories.extend(categories)
        # Remove duplicates while preserving order
        final_categories = list(dict.fromkeys(final_categories)) if final_categories else None
        
        if final_categories:
            query["categories"] = {"$in": final_categories}  # Use the new categories field
        
        if search:
            query["$and"] = [{
                "$or": [
                    {"name": {"$regex": search, "$options": "i"}},
                    {"description": {"$regex": search, "$options": "i"}},
                    {"features": {"$regex": search, "$options": "i"}}
                ]
            }]
        
        if is_active is not None:
            query["is_active"] = is_active
        
        skip = (page - 1) * per_page
        cursor = product_service.products_collection.find(query).skip(skip).limit(per_page)
        products = await cursor.to_list(length=per_page)
        total = await product_service.products_collection.count_documents(query)
        
        # Enrich with user details
        enriched_products = await product_service.get_products_with_user_details(products)
        
        # Convert to response format
        product_responses = []
        for product_doc in enriched_products:
            product = ProductInDB(**product_doc)
            # Create response using enriched data (already contains user details)
            product_responses.append(ProductResponse(
                **product_doc,  # Use enriched data directly
                is_in_stock=product.stock_quantity > 0
            ).dict())
        
        return PaginatedResponse(
            success=True,
            message="My products retrieved successfully",
            data=product_responses,
            total=total,
            page=page,
            per_page=per_page,
            total_pages=(total + per_page - 1) // per_page
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve my products"
        )

@router.get("/{product_id}", response_model=APIResponse)
async def get_product(
    product_id: str,
    current_user: Optional[UserInDB] = Depends(get_optional_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get product by ID - accessible to guests and authenticated users"""
    try:
        product_service = ProductService(db)
        
        product = await product_service.get_product_by_id(product_id)
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found"
            )
        
        # Check if user can view this product
        can_view = True
        if current_user is None:
            # Guests can only view active products
            can_view = product.is_active
        elif current_user.role == "salesperson":
            can_view = (product.assigned_to == current_user.id or 
                       product.uploaded_by == current_user.id or
                       product.is_active)  # Allow viewing active products for sales
        
        if not can_view:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view this product"
            )
        
        # Increment views (only for active products)
        if product.is_active:
            await product_service.increment_views(product_id)
        
        # Enrich with user details
        enriched_products = await product_service.get_products_with_user_details([product.dict()])
        enriched_product = enriched_products[0] if enriched_products else product.dict()
        
        # Create response
        product_response = ProductResponse(
            **enriched_product,
            is_in_stock=product.stock_quantity > 0
        )
        
        return APIResponse(
            success=True,
            message="Product retrieved successfully",
            data=product_response.dict()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve product"
        )

@router.put("/{product_id}", response_model=APIResponse)
async def update_product(
    product_id: str,
    update_data: ProductUpdate,
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Update product"""
    try:
        product_service = ProductService(db)
        
        # Check if product exists
        product = await product_service.get_product_by_id(product_id)
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found"
            )
        
        # Check permissions
        can_update = False
        if current_user.role in ["admin", "super_admin", "store_owner", "sales_manager", "marketing_manager", "store_admin"]:
            can_update = True
        elif current_user.role == "salesperson":
            # Salesperson can update their assigned or uploaded products
            can_update = (product.assigned_to == current_user.id or 
                         product.uploaded_by == current_user.id)
        
        if not can_update:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update this product"
            )
        
        # Update product
        updated_product = await product_service.update_product(
            product_id,
            update_data.dict(exclude_unset=True),
            current_user.id
        )
        
        # Enrich with user details
        enriched_products = await product_service.get_products_with_user_details([updated_product.dict()])
        enriched_product = enriched_products[0] if enriched_products else updated_product.dict()
        
        # Create response
        product_response = ProductResponse(
            **enriched_product,
            is_in_stock=updated_product.stock_quantity > 0,
            assigned_by_name=enriched_product.get("assigned_by_name")
        )
        
        return APIResponse(
            success=True,
            message="Product updated successfully",
            data=product_response.dict()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update product"
        )

@router.delete("/{product_id}", response_model=APIResponse)
async def delete_product(
    product_id: str,
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Delete product (admin, store_owner, or manager)"""
    try:
        # Check permissions - only high-level roles can delete
        if current_user.role not in ["admin", "super_admin", "store_owner", "sales_manager"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions to delete products"
            )
        
        product_service = ProductService(db)
        
        # Check if product exists
        product = await product_service.get_product_by_id(product_id)
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found"
            )
        
        # Delete product
        success = await product_service.delete_product(product_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete product"
            )
        
        return APIResponse(
            success=True,
            message="Product deleted successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete product"
        )

@router.put("/{product_id}/reassign", response_model=APIResponse)
async def reassign_product(
    product_id: str,
    new_assignee: str,
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Reassign product to another salesperson"""
    try:
        # Check permissions
        if current_user.role not in ["admin", "super_admin", "store_owner", "sales_manager", "store_admin"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions to reassign products"
            )
        
        product_service = ProductService(db)
        
        # Check if product exists
        product = await product_service.get_product_by_id(product_id)
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found"
            )
        
        # Check if new assignee exists and is a salesperson
        user_doc = await product_service.users_collection.find_one({"id": new_assignee})
        if not user_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="New assignee not found"
            )
        
        if user_doc.get("role") not in ["salesperson", "sales_manager", "store_admin"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="New assignee must be a salesperson, sales manager, or store admin"
            )
        
        # Reassign product
        success = await product_service.reassign_product(product_id, new_assignee, current_user.id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to reassign product"
            )
        
        return APIResponse(
            success=True,
            message="Product reassigned successfully",
            data={"new_assignee": new_assignee, "assigned_by": current_user.id}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reassign product"
        )

@router.get("/categories/available", response_model=APIResponse)
async def get_available_categories(
    include_hidden: bool = Query(False),
    current_user: Optional[UserInDB] = Depends(get_optional_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get available product categories for dropdown selection"""
    try:
        # Import CategoryService to avoid circular imports
        from routes.categories import CategoryService
        
        category_service = CategoryService(db)
        
        # Build query for active categories
        query = {"is_active": True}
        
        # Handle hidden categories based on user role
        if not include_hidden or not current_user:
            query["is_hidden"] = {"$ne": True}
        else:
            admin_roles = ["admin", "super_admin", "store_owner"]
            if current_user.role not in admin_roles:
                query["is_hidden"] = {"$ne": True}
        
        # Get categories from database
        cursor = category_service.categories_collection.find(query).sort("sort_order", 1)
        categories_from_db = await cursor.to_list(length=None)
        
        # Format for dropdown
        categories = []
        for category_doc in categories_from_db:
            categories.append({
                "value": category_doc["slug"],
                "label": category_doc["name"],
                "description": category_doc["description"],
                "is_seasonal": category_doc.get("is_seasonal", False),
                "is_hidden": category_doc.get("is_hidden", False)
            })
        
        return APIResponse(
            success=True,
            message="Categories retrieved successfully",
            data=categories
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve categories"
        )

@router.get("/analytics/performance", response_model=APIResponse)
async def get_product_performance_analytics(
    assigned_to: Optional[str] = None,
    days_back: int = Query(30, ge=1, le=365),
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get product performance analytics"""
    try:
        # Check permissions
        if current_user.role not in ["admin", "super_admin", "store_owner", "sales_manager", "store_admin"]:
            # Salesperson can only view their own analytics
            if current_user.role == "salesperson":
                assigned_to = current_user.id
            else:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not enough permissions"
                )
        
        product_service = ProductService(db)
        
        # Build match query
        match_query = {}
        if assigned_to:
            match_query["assigned_to"] = assigned_to
        
        start_date = now_ist() - timedelta(days=days_back)
        
        # Analytics pipeline
        pipeline = [
            {"$match": match_query},
            {
                "$lookup": {
                    "from": "orders",
                    "let": {"product_id": "$id"},
                    "pipeline": [
                        {"$unwind": "$items"},
                        {"$match": {
                            "$expr": {"$eq": ["$items.product_id", "$$product_id"]},
                            "created_at": {"$gte": start_date}
                        }},
                        {"$group": {
                            "_id": None,
                            "sales_count": {"$sum": "$items.quantity"},
                            "revenue": {"$sum": "$items.total_price"}
                        }}
                    ],
                    "as": "sales_data"
                }
            },
            {
                "$lookup": {
                    "from": "commission_earnings",
                    "localField": "id",
                    "foreignField": "product_id",
                    "as": "commission_data"
                }
            },
            {
                "$addFields": {
                    "sales_info": {"$arrayElemAt": ["$sales_data", 0]},
                    "total_commission": {"$sum": "$commission_data.commission_amount"}
                }
            },
            {
                "$project": {
                    "name": 1,
                    "sku": 1,
                    "category": 1,
                    "assigned_to": 1,
                    "uploaded_by": 1,
                    "stock_quantity": 1,
                    "sales_count": {"$ifNull": ["$sales_info.sales_count", 0]},
                    "revenue": {"$ifNull": ["$sales_info.revenue", 0]},
                    "total_commission": 1,
                    "views": 1,
                    "last_sale_date": 1,
                    "created_at": 1,
                    "updated_at": 1
                }
            },
            {"$sort": {"revenue": -1}}
        ]
        
        results = await product_service.products_collection.aggregate(pipeline).to_list(length=1000)
        
        # Calculate summary statistics
        total_products = len(results)
        total_revenue = sum(item["revenue"] for item in results)
        total_sales = sum(item["sales_count"] for item in results)
        total_commission = sum(item["total_commission"] for item in results)
        
        analytics_data = {
            "summary": {
                "total_products": total_products,
                "total_revenue": total_revenue,
                "total_sales": total_sales,
                "total_commission": total_commission,
                "days_analyzed": days_back
            },
            "products": results[:50],  # Top 50 products
            "generated_at": now_ist()
        }
        
        return APIResponse(
            success=True,
            message="Product performance analytics retrieved successfully",
            data=analytics_data
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve product analytics"
        )