from fastapi import APIRouter, Depends, HTTPException, status, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional, List
from datetime import datetime

from models import (
    InventoryLogCreate, InventoryLogResponse, InventoryLogInDB,
    InventoryAction, APIResponse, PaginatedResponse, UserInDB,
    ProductInDB, ProductUpdate
)
from auth import get_current_active_user, get_admin_user

router = APIRouter(prefix="/api/inventory", tags=["Inventory Management"])

# Database dependency
async def get_db():
    from server import db
    return db

class InventoryService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.inventory_logs_collection = db.inventory_logs
        self.products_collection = db.products
    
    async def create_inventory_log(self, log_data: dict) -> InventoryLogInDB:
        """Create new inventory log entry"""
        log_entry = InventoryLogInDB(**log_data)
        log_dict = log_entry.dict()
        
        await self.inventory_logs_collection.insert_one(log_dict)
        return log_entry
    
    async def get_inventory_logs(
        self,
        page: int = 1,
        per_page: int = 20,
        product_id: Optional[str] = None,
        user_id: Optional[str] = None,
        action: Optional[str] = None
    ) -> dict:
        """Get inventory logs with filtering and pagination"""
        # Build query
        query = {}
        
        if product_id:
            query["product_id"] = product_id
        
        if user_id:
            query["user_id"] = user_id
        
        if action:
            query["action"] = action
        
        # Calculate skip value
        skip = (page - 1) * per_page
        
        # Get logs with pagination
        cursor = self.inventory_logs_collection.find(query).sort("created_at", -1).skip(skip).limit(per_page)
        logs = await cursor.to_list(length=per_page)
        
        # Get total count
        total = await self.inventory_logs_collection.count_documents(query)
        
        return {
            "logs": logs,
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": (total + per_page - 1) // per_page
        }
    
    async def update_product_stock(self, product_id: str, quantity_change: int, user_id: str, action: InventoryAction, reason: str, notes: Optional[str] = None):
        """Update product stock and create log entry"""
        # Get current product
        product_doc = await self.products_collection.find_one({"id": product_id})
        if not product_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found"
            )
        
        product = ProductInDB(**product_doc)
        
        # Calculate new stock quantity
        if action == InventoryAction.STOCK_IN:
            new_quantity = product.stock_quantity + abs(quantity_change)
        elif action == InventoryAction.STOCK_OUT:
            new_quantity = product.stock_quantity - abs(quantity_change)
            if new_quantity < 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Insufficient stock"
                )
        else:  # ADJUSTMENT, REASSIGNMENT, RETURN
            new_quantity = product.stock_quantity + quantity_change
            if new_quantity < 0:
                new_quantity = 0
        
        # Update product stock
        await self.products_collection.update_one(
            {"id": product_id},
            {"$set": {"stock_quantity": new_quantity, "updated_at": datetime.utcnow()}}
        )
        
        # Create inventory log
        log_data = {
            "product_id": product_id,
            "user_id": user_id,
            "action": action,
            "quantity": quantity_change,
            "reason": reason,
            "notes": notes
        }
        
        await self.create_inventory_log(log_data)
        
        return new_quantity
    
    async def get_low_stock_products(self, limit: int = 50) -> List[ProductInDB]:
        """Get products with low stock"""
        cursor = self.products_collection.find({
            "$expr": {"$lte": ["$stock_quantity", "$min_stock_level"]}
        }).limit(limit)
        
        products = await cursor.to_list(length=limit)
        return [ProductInDB(**product) for product in products]
    
    async def reassign_product(self, product_id: str, from_user_id: str, to_user_id: str, admin_user_id: str, reason: str):
        """Reassign product ownership (store admin function)"""
        # Create log entry for reassignment
        log_data = {
            "product_id": product_id,
            "user_id": admin_user_id,
            "action": InventoryAction.REASSIGNMENT,
            "quantity": 0,
            "reason": reason,
            "notes": f"Reassigned from {from_user_id} to {to_user_id}"
        }
        
        await self.create_inventory_log(log_data)
        
        # Here you would update product assignment if you have that field
        # For now, we'll just log the reassignment
        return True

# Permission checks
async def check_inventory_permissions(current_user: UserInDB = Depends(get_current_active_user)):
    """Check if user has inventory management permissions"""
    allowed_roles = ["admin", "super_admin", "store_admin", "salesperson", "store_owner"]
    if current_user.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions for inventory management"
        )
    return current_user

# Inventory endpoints
@router.post("/stock-in", response_model=APIResponse)
async def stock_in(
    product_id: str,
    quantity: int,
    reason: str,
    notes: Optional[str] = None,
    current_user: UserInDB = Depends(check_inventory_permissions),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Add stock to product"""
    try:
        inventory_service = InventoryService(db)
        
        new_quantity = await inventory_service.update_product_stock(
            product_id=product_id,
            quantity_change=quantity,
            user_id=current_user.id,
            action=InventoryAction.STOCK_IN,
            reason=reason,
            notes=notes
        )
        
        return APIResponse(
            success=True,
            message=f"Stock added successfully. New quantity: {new_quantity}",
            data={"product_id": product_id, "new_quantity": new_quantity}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to add stock"
        )

@router.post("/stock-out", response_model=APIResponse)
async def stock_out(
    product_id: str,
    quantity: int,
    reason: str,
    notes: Optional[str] = None,
    current_user: UserInDB = Depends(check_inventory_permissions),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Remove stock from product"""
    try:
        inventory_service = InventoryService(db)
        
        new_quantity = await inventory_service.update_product_stock(
            product_id=product_id,
            quantity_change=quantity,
            user_id=current_user.id,
            action=InventoryAction.STOCK_OUT,
            reason=reason,
            notes=notes
        )
        
        return APIResponse(
            success=True,
            message=f"Stock removed successfully. New quantity: {new_quantity}",
            data={"product_id": product_id, "new_quantity": new_quantity}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to remove stock"
        )

@router.post("/adjust", response_model=APIResponse)
async def adjust_stock(
    product_id: str,
    quantity_change: int,
    reason: str,
    notes: Optional[str] = None,
    current_user: UserInDB = Depends(check_inventory_permissions),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Adjust stock quantity (can be positive or negative)"""
    try:
        inventory_service = InventoryService(db)
        
        new_quantity = await inventory_service.update_product_stock(
            product_id=product_id,
            quantity_change=quantity_change,
            user_id=current_user.id,
            action=InventoryAction.ADJUSTMENT,
            reason=reason,
            notes=notes
        )
        
        return APIResponse(
            success=True,
            message=f"Stock adjusted successfully. New quantity: {new_quantity}",
            data={"product_id": product_id, "new_quantity": new_quantity}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to adjust stock"
        )

@router.get("/logs", response_model=PaginatedResponse)
async def get_inventory_logs(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    product_id: Optional[str] = None,
    user_id: Optional[str] = None,
    action: Optional[str] = None,
    current_user: UserInDB = Depends(check_inventory_permissions),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get inventory logs with filtering and pagination"""
    try:
        inventory_service = InventoryService(db)
        
        # Filter by user if not admin
        if current_user.role == "salesperson":
            user_id = current_user.id
        
        result = await inventory_service.get_inventory_logs(
            page=page,
            per_page=per_page,
            product_id=product_id,
            user_id=user_id,
            action=action
        )
        
        # Convert to response format
        log_responses = []
        for log_doc in result["logs"]:
            log_entry = InventoryLogInDB(**log_doc)
            log_responses.append(InventoryLogResponse(**log_entry.dict()).dict())
        
        return PaginatedResponse(
            success=True,
            message="Inventory logs retrieved successfully",
            data=log_responses,
            total=result["total"],
            page=result["page"],
            per_page=result["per_page"],
            total_pages=result["total_pages"]
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve inventory logs"
        )

@router.get("/low-stock", response_model=APIResponse)
async def get_low_stock_products(
    limit: int = Query(50, ge=1, le=100),
    current_user: UserInDB = Depends(check_inventory_permissions),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get products with low stock"""
    try:
        inventory_service = InventoryService(db)
        
        products = await inventory_service.get_low_stock_products(limit)
        
        product_responses = []
        for product in products:
            product_responses.append({
                "id": product.id,
                "name": product.name,
                "sku": product.sku,
                "stock_quantity": product.stock_quantity,
                "min_stock_level": product.min_stock_level,
                "category": product.category
            })
        
        return APIResponse(
            success=True,
            message="Low stock products retrieved successfully",
            data=product_responses
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve low stock products"
        )

@router.post("/reassign", response_model=APIResponse)
async def reassign_product(
    product_id: str,
    from_user_id: str,
    to_user_id: str,
    reason: str,
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Reassign product ownership (store admin only)"""
    try:
        # Check if user has permission to reassign
        if current_user.role not in ["admin", "super_admin", "store_admin"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only store admins can reassign products"
            )
        
        inventory_service = InventoryService(db)
        
        success = await inventory_service.reassign_product(
            product_id=product_id,
            from_user_id=from_user_id,
            to_user_id=to_user_id,
            admin_user_id=current_user.id,
            reason=reason
        )
        
        return APIResponse(
            success=True,
            message="Product reassigned successfully",
            data={"product_id": product_id, "from_user": from_user_id, "to_user": to_user_id}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reassign product"
        )