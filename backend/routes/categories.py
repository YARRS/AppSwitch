from fastapi import APIRouter, Depends, HTTPException, status, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional, List
from datetime import datetime

from models import (
    CategoryCreate, CategoryUpdate, CategoryResponse, CategoryInDB,
    APIResponse, PaginatedResponse, UserInDB
)
from auth import get_current_active_user, get_admin_user

router = APIRouter(prefix="/api/categories", tags=["Categories"])

# Database dependency
async def get_db():
    from server import db
    return db

class CategoryService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.categories_collection = db.categories
        self.products_collection = db.products
    
    async def create_category(self, category_data: dict) -> CategoryInDB:
        """Create new category"""
        category = CategoryInDB(**category_data)
        category_dict = category.dict()
        
        await self.categories_collection.insert_one(category_dict)
        return category
    
    async def get_category_by_id(self, category_id: str) -> Optional[CategoryInDB]:
        """Get category by ID"""
        category_doc = await self.categories_collection.find_one({"id": category_id})
        if category_doc:
            return CategoryInDB(**category_doc)
        return None
    
    async def get_category_by_slug(self, slug: str) -> Optional[CategoryInDB]:
        """Get category by slug"""
        category_doc = await self.categories_collection.find_one({"slug": slug})
        if category_doc:
            return CategoryInDB(**category_doc)
        return None
    
    async def update_category(self, category_id: str, update_data: dict) -> Optional[CategoryInDB]:
        """Update category"""
        update_data["updated_at"] = datetime.utcnow()
        
        result = await self.categories_collection.update_one(
            {"id": category_id},
            {"$set": update_data}
        )
        
        if result.modified_count > 0:
            return await self.get_category_by_id(category_id)
        return None
    
    async def delete_category(self, category_id: str) -> bool:
        """Delete category"""
        result = await self.categories_collection.delete_one({"id": category_id})
        return result.deleted_count > 0
    
    async def get_categories(
        self,
        page: int = 1,
        per_page: int = 20,
        search: Optional[str] = None,
        is_active: Optional[bool] = None
    ) -> dict:
        """Get categories with filtering and pagination"""
        # Build query
        query = {}
        
        if search:
            query["$or"] = [
                {"name": {"$regex": search, "$options": "i"}},
                {"description": {"$regex": search, "$options": "i"}}
            ]
        
        if is_active is not None:
            query["is_active"] = is_active
        
        # Calculate skip value
        skip = (page - 1) * per_page
        
        # Get categories with pagination
        cursor = self.categories_collection.find(query).sort("sort_order", 1).skip(skip).limit(per_page)
        categories = await cursor.to_list(length=per_page)
        
        # Get total count
        total = await self.categories_collection.count_documents(query)
        
        # Update product counts for each category
        for category in categories:
            product_count = await self.products_collection.count_documents({"category": category["slug"]})
            category["product_count"] = product_count
        
        return {
            "categories": categories,
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": (total + per_page - 1) // per_page
        }
    
    async def get_categories_with_products(self) -> List[dict]:
        """Get all active categories with product counts"""
        pipeline = [
            {"$match": {"is_active": True}},
            {
                "$lookup": {
                    "from": "products",
                    "localField": "slug",
                    "foreignField": "category",
                    "as": "products"
                }
            },
            {
                "$addFields": {
                    "product_count": {"$size": "$products"}
                }
            },
            {
                "$project": {
                    "products": 0  # Exclude products array from result
                }
            },
            {"$sort": {"sort_order": 1}}
        ]
        
        categories = await self.categories_collection.aggregate(pipeline).to_list(length=None)
        return categories

# Category endpoints
@router.post("/", response_model=APIResponse)
async def create_category(
    category_data: CategoryCreate,
    admin_user: UserInDB = Depends(get_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Create new category (admin only)"""
    try:
        category_service = CategoryService(db)
        
        # Check if slug already exists
        existing_category = await category_service.get_category_by_slug(category_data.slug)
        if existing_category:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Category with this slug already exists"
            )
        
        # Create category
        category = await category_service.create_category(category_data.dict())
        
        # Create response
        category_response = CategoryResponse(
            **category.dict(),
            product_count=0
        )
        
        return APIResponse(
            success=True,
            message="Category created successfully",
            data=category_response.dict()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create category"
        )

@router.get("/", response_model=PaginatedResponse)
async def get_categories(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get categories with filtering and pagination"""
    try:
        category_service = CategoryService(db)
        
        result = await category_service.get_categories(
            page=page,
            per_page=per_page,
            search=search,
            is_active=is_active
        )
        
        # Convert to response format
        category_responses = []
        for category_doc in result["categories"]:
            category = CategoryInDB(**category_doc)
            category_responses.append(CategoryResponse(
                **category.dict(),
                product_count=category_doc.get("product_count", 0)
            ).dict())
        
        return PaginatedResponse(
            success=True,
            message="Categories retrieved successfully",
            data=category_responses,
            total=result["total"],
            page=result["page"],
            per_page=result["per_page"],
            total_pages=result["total_pages"]
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve categories"
        )

@router.get("/with-products", response_model=APIResponse)
async def get_categories_with_products(db: AsyncIOMotorDatabase = Depends(get_db)):
    """Get active categories with product counts"""
    try:
        category_service = CategoryService(db)
        
        categories = await category_service.get_categories_with_products()
        
        return APIResponse(
            success=True,
            message="Categories with products retrieved successfully",
            data=categories
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve categories"
        )

@router.get("/{category_id}", response_model=APIResponse)
async def get_category(
    category_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get category by ID"""
    try:
        category_service = CategoryService(db)
        
        category = await category_service.get_category_by_id(category_id)
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found"
            )
        
        # Get product count
        product_count = await category_service.products_collection.count_documents({"category": category.slug})
        
        # Create response
        category_response = CategoryResponse(
            **category.dict(),
            product_count=product_count
        )
        
        return APIResponse(
            success=True,
            message="Category retrieved successfully",
            data=category_response.dict()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve category"
        )

@router.put("/{category_id}", response_model=APIResponse)
async def update_category(
    category_id: str,
    update_data: CategoryUpdate,
    admin_user: UserInDB = Depends(get_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Update category (admin only)"""
    try:
        category_service = CategoryService(db)
        
        # Check if category exists
        category = await category_service.get_category_by_id(category_id)
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found"
            )
        
        # Update category
        updated_category = await category_service.update_category(
            category_id,
            update_data.dict(exclude_unset=True)
        )
        
        # Get product count
        product_count = await category_service.products_collection.count_documents({"category": updated_category.slug})
        
        # Create response
        category_response = CategoryResponse(
            **updated_category.dict(),
            product_count=product_count
        )
        
        return APIResponse(
            success=True,
            message="Category updated successfully",
            data=category_response.dict()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update category"
        )

@router.delete("/{category_id}", response_model=APIResponse)
async def delete_category(
    category_id: str,
    admin_user: UserInDB = Depends(get_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Delete category (admin only)"""
    try:
        category_service = CategoryService(db)
        
        # Check if category exists
        category = await category_service.get_category_by_id(category_id)
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found"
            )
        
        # Check if category has products
        product_count = await category_service.products_collection.count_documents({"category": category.slug})
        if product_count > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete category with {product_count} products. Move products to another category first."
            )
        
        # Delete category
        success = await category_service.delete_category(category_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete category"
            )
        
        return APIResponse(
            success=True,
            message="Category deleted successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete category"
        )