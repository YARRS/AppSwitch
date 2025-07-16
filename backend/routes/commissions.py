from fastapi import APIRouter, Depends, HTTPException, status, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional, List, Dict, Any
from datetime import datetime

from models import (
    CommissionRuleCreate, CommissionRuleUpdate, CommissionRuleResponse, CommissionRuleInDB,
    CommissionEarningCreate, CommissionEarningUpdate, CommissionEarningResponse, CommissionEarningInDB,
    CommissionStatus, UserRole, APIResponse, PaginatedResponse, UserInDB
)
from auth import get_current_active_user, get_admin_user

router = APIRouter(prefix="/api/commissions", tags=["Commission Management"])

# Database dependency
async def get_db():
    from server import db
    return db

class CommissionService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.commission_rules_collection = db.commission_rules
        self.commission_earnings_collection = db.commission_earnings
        self.orders_collection = db.orders
        self.users_collection = db.users
    
    async def create_commission_rule(self, rule_data: dict) -> CommissionRuleInDB:
        """Create new commission rule"""
        rule = CommissionRuleInDB(**rule_data)
        rule_dict = rule.dict()
        
        await self.commission_rules_collection.insert_one(rule_dict)
        return rule
    
    async def get_commission_rule_by_id(self, rule_id: str) -> Optional[CommissionRuleInDB]:
        """Get commission rule by ID"""
        rule_doc = await self.commission_rules_collection.find_one({"id": rule_id})
        if rule_doc:
            return CommissionRuleInDB(**rule_doc)
        return None
    
    async def get_commission_rules_by_user(self, user_id: str) -> List[CommissionRuleInDB]:
        """Get active commission rules for a user"""
        cursor = self.commission_rules_collection.find({
            "user_id": user_id,
            "is_active": True
        })
        rules = await cursor.to_list(length=100)
        return [CommissionRuleInDB(**rule) for rule in rules]
    
    async def update_commission_rule(self, rule_id: str, update_data: dict) -> Optional[CommissionRuleInDB]:
        """Update commission rule"""
        update_data["updated_at"] = datetime.utcnow()
        
        result = await self.commission_rules_collection.update_one(
            {"id": rule_id},
            {"$set": update_data}
        )
        
        if result.modified_count > 0:
            return await self.get_commission_rule_by_id(rule_id)
        return None
    
    async def delete_commission_rule(self, rule_id: str) -> bool:
        """Delete commission rule"""
        result = await self.commission_rules_collection.delete_one({"id": rule_id})
        return result.deleted_count > 0
    
    async def get_commission_rules(
        self,
        page: int = 1,
        per_page: int = 20,
        user_id: Optional[str] = None,
        user_role: Optional[str] = None,
        is_active: Optional[bool] = None
    ) -> dict:
        """Get commission rules with filtering and pagination"""
        # Build query
        query = {}
        
        if user_id:
            query["user_id"] = user_id
        
        if user_role:
            query["user_role"] = user_role
        
        if is_active is not None:
            query["is_active"] = is_active
        
        # Calculate skip value
        skip = (page - 1) * per_page
        
        # Get rules with pagination
        cursor = self.commission_rules_collection.find(query).sort("created_at", -1).skip(skip).limit(per_page)
        rules = await cursor.to_list(length=per_page)
        
        # Get total count
        total = await self.commission_rules_collection.count_documents(query)
        
        return {
            "rules": rules,
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": (total + per_page - 1) // per_page
        }
    
    async def create_commission_earning(self, earning_data: dict) -> CommissionEarningInDB:
        """Create new commission earning"""
        earning = CommissionEarningInDB(**earning_data)
        earning_dict = earning.dict()
        
        await self.commission_earnings_collection.insert_one(earning_dict)
        return earning
    
    async def calculate_commission_for_order(self, order_id: str, user_id: str) -> List[Dict[str, Any]]:
        """Calculate commission for an order"""
        # Get order details
        order_doc = await self.orders_collection.find_one({"id": order_id})
        if not order_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found"
            )
        
        # Get user's commission rules
        rules = await self.get_commission_rules_by_user(user_id)
        if not rules:
            return []
        
        commissions = []
        for item in order_doc["items"]:
            for rule in rules:
                # Check if rule applies to this product category
                if rule.product_categories and item.get("category") not in rule.product_categories:
                    continue
                
                # Check minimum order amount
                if rule.min_order_amount and item["total_price"] < rule.min_order_amount:
                    continue
                
                # Calculate commission
                if rule.commission_type == "percentage":
                    commission_amount = (item["total_price"] * rule.commission_value) / 100
                else:  # fixed
                    commission_amount = rule.commission_value
                
                # Apply maximum commission limit
                if rule.max_commission_amount and commission_amount > rule.max_commission_amount:
                    commission_amount = rule.max_commission_amount
                
                commission_data = {
                    "user_id": user_id,
                    "order_id": order_id,
                    "product_id": item["product_id"],
                    "commission_rule_id": rule.id,
                    "order_amount": item["total_price"],
                    "commission_amount": commission_amount,
                    "commission_rate": rule.commission_value,
                    "status": CommissionStatus.PENDING
                }
                
                commissions.append(commission_data)
        
        return commissions
    
    async def get_commission_earnings(
        self,
        page: int = 1,
        per_page: int = 20,
        user_id: Optional[str] = None,
        status: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> dict:
        """Get commission earnings with filtering and pagination"""
        # Build query
        query = {}
        
        if user_id:
            query["user_id"] = user_id
        
        if status:
            query["status"] = status
        
        if start_date or end_date:
            date_query = {}
            if start_date:
                date_query["$gte"] = start_date
            if end_date:
                date_query["$lte"] = end_date
            query["created_at"] = date_query
        
        # Calculate skip value
        skip = (page - 1) * per_page
        
        # Get earnings with pagination
        cursor = self.commission_earnings_collection.find(query).sort("created_at", -1).skip(skip).limit(per_page)
        earnings = await cursor.to_list(length=per_page)
        
        # Get total count
        total = await self.commission_earnings_collection.count_documents(query)
        
        return {
            "earnings": earnings,
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": (total + per_page - 1) // per_page
        }
    
    async def update_commission_earning(self, earning_id: str, update_data: dict) -> Optional[CommissionEarningInDB]:
        """Update commission earning"""
        update_data["updated_at"] = datetime.utcnow()
        
        result = await self.commission_earnings_collection.update_one(
            {"id": earning_id},
            {"$set": update_data}
        )
        
        if result.modified_count > 0:
            earning_doc = await self.commission_earnings_collection.find_one({"id": earning_id})
            return CommissionEarningInDB(**earning_doc)
        return None
    
    async def get_commission_summary(self, user_id: str) -> Dict[str, Any]:
        """Get commission summary for a user"""
        # Get total earnings
        pipeline = [
            {"$match": {"user_id": user_id}},
            {"$group": {
                "_id": "$status",
                "total_amount": {"$sum": "$commission_amount"},
                "count": {"$sum": 1}
            }}
        ]
        
        results = await self.commission_earnings_collection.aggregate(pipeline).to_list(length=100)
        
        summary = {
            "total_pending": 0,
            "total_approved": 0,
            "total_paid": 0,
            "pending_count": 0,
            "approved_count": 0,
            "paid_count": 0
        }
        
        for result in results:
            status = result["_id"]
            if status == CommissionStatus.PENDING:
                summary["total_pending"] = result["total_amount"]
                summary["pending_count"] = result["count"]
            elif status == CommissionStatus.APPROVED:
                summary["total_approved"] = result["total_amount"]
                summary["approved_count"] = result["count"]
            elif status == CommissionStatus.PAID:
                summary["total_paid"] = result["total_amount"]
                summary["paid_count"] = result["count"]
        
        return summary

# Permission checks
async def check_commission_permissions(current_user: UserInDB = Depends(get_current_active_user)):
    """Check if user has commission management permissions"""
    allowed_roles = ["admin", "super_admin", "store_owner", "sales_manager"]
    if current_user.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions for commission management"
        )
    return current_user

# Commission rule endpoints
@router.post("/rules", response_model=APIResponse)
async def create_commission_rule(
    rule_data: CommissionRuleCreate,
    current_user: UserInDB = Depends(check_commission_permissions),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Create new commission rule"""
    try:
        commission_service = CommissionService(db)
        
        # Validate commission values
        if rule_data.commission_type == "percentage" and rule_data.commission_value > 100:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Percentage commission cannot exceed 100%"
            )
        
        # Create rule
        rule = await commission_service.create_commission_rule(rule_data.dict())
        
        # Create response
        rule_response = CommissionRuleResponse(**rule.dict())
        
        return APIResponse(
            success=True,
            message="Commission rule created successfully",
            data=rule_response.dict()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create commission rule"
        )

@router.get("/rules", response_model=PaginatedResponse)
async def get_commission_rules(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    user_id: Optional[str] = None,
    user_role: Optional[str] = None,
    is_active: Optional[bool] = None,
    current_user: UserInDB = Depends(check_commission_permissions),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get commission rules with filtering and pagination"""
    try:
        commission_service = CommissionService(db)
        
        result = await commission_service.get_commission_rules(
            page=page,
            per_page=per_page,
            user_id=user_id,
            user_role=user_role,
            is_active=is_active
        )
        
        # Convert to response format
        rule_responses = []
        for rule_doc in result["rules"]:
            rule = CommissionRuleInDB(**rule_doc)
            rule_responses.append(CommissionRuleResponse(**rule.dict()).dict())
        
        return PaginatedResponse(
            success=True,
            message="Commission rules retrieved successfully",
            data=rule_responses,
            total=result["total"],
            page=result["page"],
            per_page=result["per_page"],
            total_pages=result["total_pages"]
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve commission rules"
        )

@router.put("/rules/{rule_id}", response_model=APIResponse)
async def update_commission_rule(
    rule_id: str,
    update_data: CommissionRuleUpdate,
    current_user: UserInDB = Depends(check_commission_permissions),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Update commission rule"""
    try:
        commission_service = CommissionService(db)
        
        # Check if rule exists
        rule = await commission_service.get_commission_rule_by_id(rule_id)
        if not rule:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Commission rule not found"
            )
        
        # Update rule
        updated_rule = await commission_service.update_commission_rule(
            rule_id,
            update_data.dict(exclude_unset=True)
        )
        
        # Create response
        rule_response = CommissionRuleResponse(**updated_rule.dict())
        
        return APIResponse(
            success=True,
            message="Commission rule updated successfully",
            data=rule_response.dict()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update commission rule"
        )

@router.delete("/rules/{rule_id}", response_model=APIResponse)
async def delete_commission_rule(
    rule_id: str,
    current_user: UserInDB = Depends(check_commission_permissions),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Delete commission rule"""
    try:
        commission_service = CommissionService(db)
        
        # Check if rule exists
        rule = await commission_service.get_commission_rule_by_id(rule_id)
        if not rule:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Commission rule not found"
            )
        
        # Delete rule
        success = await commission_service.delete_commission_rule(rule_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete commission rule"
            )
        
        return APIResponse(
            success=True,
            message="Commission rule deleted successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete commission rule"
        )

# Commission earning endpoints
@router.get("/earnings", response_model=PaginatedResponse)
async def get_commission_earnings(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    user_id: Optional[str] = None,
    status: Optional[str] = None,
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get commission earnings with filtering and pagination"""
    try:
        commission_service = CommissionService(db)
        
        # Filter by user if not admin
        if current_user.role in ["salesperson"] and not user_id:
            user_id = current_user.id
        
        result = await commission_service.get_commission_earnings(
            page=page,
            per_page=per_page,
            user_id=user_id,
            status=status
        )
        
        # Convert to response format
        earning_responses = []
        for earning_doc in result["earnings"]:
            earning = CommissionEarningInDB(**earning_doc)
            earning_responses.append(CommissionEarningResponse(**earning.dict()).dict())
        
        return PaginatedResponse(
            success=True,
            message="Commission earnings retrieved successfully",
            data=earning_responses,
            total=result["total"],
            page=result["page"],
            per_page=result["per_page"],
            total_pages=result["total_pages"]
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve commission earnings"
        )

@router.put("/earnings/{earning_id}", response_model=APIResponse)
async def update_commission_earning(
    earning_id: str,
    update_data: CommissionEarningUpdate,
    current_user: UserInDB = Depends(check_commission_permissions),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Update commission earning (approve/pay)"""
    try:
        commission_service = CommissionService(db)
        
        # Add approved_by if approving
        update_dict = update_data.dict(exclude_unset=True)
        if update_dict.get("status") == CommissionStatus.APPROVED:
            update_dict["approved_by"] = current_user.id
        elif update_dict.get("status") == CommissionStatus.PAID:
            update_dict["paid_at"] = datetime.utcnow()
        
        # Update earning
        updated_earning = await commission_service.update_commission_earning(
            earning_id,
            update_dict
        )
        
        if not updated_earning:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Commission earning not found"
            )
        
        # Create response
        earning_response = CommissionEarningResponse(**updated_earning.dict())
        
        return APIResponse(
            success=True,
            message="Commission earning updated successfully",
            data=earning_response.dict()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update commission earning"
        )

@router.get("/summary", response_model=APIResponse)
async def get_commission_summary(
    user_id: Optional[str] = None,
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get commission summary for a user"""
    try:
        commission_service = CommissionService(db)
        
        # Use current user if not specified or not admin
        if not user_id or current_user.role not in ["admin", "super_admin", "store_owner"]:
            user_id = current_user.id
        
        summary = await commission_service.get_commission_summary(user_id)
        
        return APIResponse(
            success=True,
            message="Commission summary retrieved successfully",
            data=summary
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve commission summary"
        )

@router.post("/calculate/{order_id}", response_model=APIResponse)
async def calculate_commission_for_order(
    order_id: str,
    user_id: str,
    current_user: UserInDB = Depends(check_commission_permissions),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Calculate and create commission for an order"""
    try:
        commission_service = CommissionService(db)
        
        # Calculate commissions
        commissions = await commission_service.calculate_commission_for_order(order_id, user_id)
        
        # Create commission earnings
        created_earnings = []
        for commission_data in commissions:
            earning = await commission_service.create_commission_earning(commission_data)
            created_earnings.append(CommissionEarningResponse(**earning.dict()).dict())
        
        return APIResponse(
            success=True,
            message=f"Created {len(created_earnings)} commission earnings",
            data=created_earnings
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to calculate commission for order"
        )