from fastapi import APIRouter, Depends, HTTPException, status, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional, List
from datetime import datetime

from models import (
    ProductCreate, ProductUpdate, ProductResponse, ProductInDB,
    CategoryCreate, CategoryUpdate, CategoryResponse, CategoryInDB,
    ProductCategory, APIResponse, PaginatedResponse, UserInDB
)
from auth import get_current_active_user, get_admin_user

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
    
    async def create_product(self, product_data: dict) -> ProductInDB:
        """Create new product"""
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
    
    async def update_product(self, product_id: str, update_data: dict) -> Optional[ProductInDB]:
        """Update product"""
        update_data["updated_at"] = datetime.utcnow()
        
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
        category: Optional[str] = None,
        search: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        is_active: Optional[bool] = None
    ) -> dict:
        """Get products with filtering and pagination"""
        # Build query
        query = {}
        
        if category:
            query["category"] = category
        
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
    
    async def increment_views(self, product_id: str):
        """Increment product views"""
        await self.products_collection.update_one(
            {"id": product_id},
            {"$inc": {"views": 1}}
        )

# Product endpoints
@router.post("/", response_model=APIResponse)
async def create_product(
    product_data: ProductCreate,
    admin_user: UserInDB = Depends(get_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Create new product (admin only)"""
    try:
        product_service = ProductService(db)
        
        # Check if SKU already exists
        existing_product = await product_service.get_product_by_sku(product_data.sku)
        if existing_product:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Product with this SKU already exists"
            )
        
        # Create product
        product = await product_service.create_product(product_data.dict())
        
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
    category: Optional[str] = None,
    search: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    is_active: Optional[bool] = None,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get products with filtering and pagination"""
    try:
        product_service = ProductService(db)
        
        result = await product_service.get_products(
            page=page,
            per_page=per_page,
            category=category,
            search=search,
            min_price=min_price,
            max_price=max_price,
            is_active=is_active
        )
        
        # Convert to response format
        product_responses = []
        for product_doc in result["products"]:
            product = ProductInDB(**product_doc)
            product_responses.append(ProductResponse(
                **product.dict(),
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

@router.get("/{product_id}", response_model=APIResponse)
async def get_product(
    product_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get product by ID"""
    try:
        product_service = ProductService(db)
        
        product = await product_service.get_product_by_id(product_id)
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found"
            )
        
        # Increment views
        await product_service.increment_views(product_id)
        
        # Create response
        product_response = ProductResponse(
            **product.dict(),
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
    admin_user: UserInDB = Depends(get_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Update product (admin only)"""
    try:
        product_service = ProductService(db)
        
        # Check if product exists
        product = await product_service.get_product_by_id(product_id)
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found"
            )
        
        # Update product
        updated_product = await product_service.update_product(
            product_id,
            update_data.dict(exclude_unset=True)
        )
        
        # Create response
        product_response = ProductResponse(
            **updated_product.dict(),
            is_in_stock=updated_product.stock_quantity > 0
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
    admin_user: UserInDB = Depends(get_admin_user),
    db: AsyncIOMotorDatabase = Depends()
):
    """Delete product (admin only)"""
    try:
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

@router.get("/categories/available", response_model=APIResponse)
async def get_available_categories(db: AsyncIOMotorDatabase = Depends()):
    """Get available product categories"""
    try:
        categories = [
            {
                "value": category.value,
                "label": category.value.replace("_", " ").title(),
                "description": {
                    "smart_switch": "Standard smart switches for lights and appliances",
                    "dimmer_switch": "Dimmer switches for adjustable lighting",
                    "motion_sensor": "Motion sensors for automated lighting",
                    "smart_plug": "Smart plugs for any device",
                    "gateway": "Smart home gateways and hubs",
                    "accessories": "Accessories and add-ons"
                }.get(category.value, "")
            }
            for category in ProductCategory
        ]
        
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