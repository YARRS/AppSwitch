from fastapi import APIRouter, Depends, HTTPException, status, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta

from models import (
    CommissionRuleCreate, CommissionRuleUpdate, CommissionRuleResponse, CommissionRuleInDB,
    CommissionEarningCreate, CommissionEarningUpdate, CommissionEarningResponse, CommissionEarningInDB,
    ProductAssignmentCreate, ProductAssignmentUpdate, ProductAssignmentResponse, ProductAssignmentInDB,
    CommissionStatus, UserRole, APIResponse, PaginatedResponse, UserInDB,
    ProductCategory, ReallocationReason, ProductAssignmentStatus,
    ReallocationCandidate, ReallocationRecommendation, ProductPerformanceMetrics,
    BulkCommissionRuleUpdate, BulkProductReassignment
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
        self.product_assignments_collection = db.product_assignments
        self.orders_collection = db.orders
        self.products_collection = db.products
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
    
    async def get_applicable_commission_rules(self, user_id: str, product_id: str, order_amount: float) -> List[CommissionRuleInDB]:
        """Get applicable commission rules for a user and product"""
        # Get user info
        user_doc = await self.users_collection.find_one({"id": user_id})
        if not user_doc:
            return []
        
        # Get product info
        product_doc = await self.products_collection.find_one({"id": product_id})
        if not product_doc:
            return []
        
        user_role = user_doc.get("role")
        product_category = product_doc.get("category")
        current_time = now_ist()
        
        # Build query for applicable rules
        query = {
            "is_active": True,
            "effective_from": {"$lte": current_time},
            "$or": [
                {"effective_until": None},
                {"effective_until": {"$gte": current_time}}
            ],
            "$and": [
                {
                    "$or": [
                        {"min_order_amount": None},
                        {"min_order_amount": {"$lte": order_amount}}
                    ]
                }
            ]
        }
        
        # Add specific matching criteria
        rule_queries = []
        
        # Individual user rule
        rule_queries.append({"user_id": user_id})
        
        # Role-based rule
        rule_queries.append({"user_role": user_role, "user_id": None})
        
        # Individual product rule
        rule_queries.append({"product_id": product_id})
        
        # Category-based rule
        rule_queries.append({"product_category": product_category, "product_id": None})
        
        # General rules (no specific user/product/category)
        rule_queries.append({
            "user_id": None,
            "user_role": None,
            "product_id": None,
            "product_category": None
        })
        
        query["$or"] = rule_queries
        
        cursor = self.commission_rules_collection.find(query).sort("priority", -1)
        rules = await cursor.to_list(length=100)
        
        return [CommissionRuleInDB(**rule) for rule in rules]
    
    async def update_commission_rule(self, rule_id: str, update_data: dict) -> Optional[CommissionRuleInDB]:
        """Update commission rule"""
        update_data["updated_at"] = now_ist()
        
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
        product_id: Optional[str] = None,
        product_category: Optional[str] = None,
        is_active: Optional[bool] = None
    ) -> dict:
        """Get commission rules with filtering and pagination"""
        # Build query
        query = {}
        
        if user_id:
            query["user_id"] = user_id
        
        if user_role:
            query["user_role"] = user_role
        
        if product_id:
            query["product_id"] = product_id
            
        if product_category:
            query["product_category"] = product_category
        
        if is_active is not None:
            query["is_active"] = is_active
        
        # Calculate skip value
        skip = (page - 1) * per_page
        
        # Get rules with pagination
        cursor = self.commission_rules_collection.find(query).sort([("priority", -1), ("created_at", -1)]).skip(skip).limit(per_page)
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
        
        # Update rule usage statistics
        await self.commission_rules_collection.update_one(
            {"id": earning_data["commission_rule_id"]},
            {
                "$inc": {
                    "usage_count": 1,
                    "total_commission_paid": earning_data["commission_amount"]
                }
            }
        )
        
        return earning
    
    async def calculate_commission_for_order(self, order_id: str) -> List[Dict[str, Any]]:
        """Calculate commission for an order based on product assignments"""
        # Get order details
        order_doc = await self.orders_collection.find_one({"id": order_id})
        if not order_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found"
            )
        
        commissions = []
        for item in order_doc["items"]:
            product_id = item["product_id"]
            
            # Get product assignment (who should get commission)
            product_doc = await self.products_collection.find_one({"id": product_id})
            if not product_doc:
                continue
            
            # Determine who gets commission (assigned_to or uploaded_by)
            salesman_id = product_doc.get("assigned_to") or product_doc.get("uploaded_by")
            if not salesman_id:
                continue
            
            # Get applicable commission rules
            rules = await self.get_applicable_commission_rules(
                salesman_id, product_id, item["total_price"]
            )
            
            if not rules:
                continue
            
            # Use the highest priority rule
            rule = rules[0]
            
            # Calculate commission
            if rule.commission_type == "percentage":
                commission_amount = (item["total_price"] * rule.commission_value) / 100
            else:  # fixed
                commission_amount = rule.commission_value
            
            # Apply maximum commission limit
            if rule.max_commission_amount and commission_amount > rule.max_commission_amount:
                commission_amount = rule.max_commission_amount
            
            commission_data = {
                "user_id": salesman_id,
                "order_id": order_id,
                "product_id": product_id,
                "commission_rule_id": rule.id,
                "order_amount": item["total_price"],
                "commission_amount": commission_amount,
                "commission_rate": rule.commission_value,
                "commission_type": rule.commission_type,
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
        update_data["updated_at"] = now_ist()
        
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

    # Product Assignment Methods
    async def create_product_assignment(self, assignment_data: dict) -> ProductAssignmentInDB:
        """Create new product assignment"""
        assignment = ProductAssignmentInDB(**assignment_data)
        assignment_dict = assignment.dict()
        
        # End previous assignment for this product
        await self.product_assignments_collection.update_many(
            {
                "product_id": assignment_data["product_id"],
                "status": ProductAssignmentStatus.ACTIVE
            },
            {
                "$set": {
                    "status": ProductAssignmentStatus.REASSIGNED,
                    "end_date": now_ist(),
                    "updated_at": now_ist()
                }
            }
        )
        
        # Create new assignment
        await self.product_assignments_collection.insert_one(assignment_dict)
        
        # Update product record
        await self.products_collection.update_one(
            {"id": assignment_data["product_id"]},
            {
                "$set": {
                    "assigned_to": assignment_data["assigned_to"],
                    "updated_at": now_ist()
                },
                "$push": {"assignment_history": assignment.id}
            }
        )
        
        return assignment
    
    async def get_product_assignments(
        self,
        page: int = 1,
        per_page: int = 20,
        assigned_to: Optional[str] = None,
        product_id: Optional[str] = None,
        status: Optional[str] = None
    ) -> dict:
        """Get product assignments with filtering and pagination"""
        query = {}
        
        if assigned_to:
            query["assigned_to"] = assigned_to
        
        if product_id:
            query["product_id"] = product_id
        
        if status:
            query["status"] = status
        
        skip = (page - 1) * per_page
        
        cursor = self.product_assignments_collection.find(query).sort("created_at", -1).skip(skip).limit(per_page)
        assignments = await cursor.to_list(length=per_page)
        
        total = await self.product_assignments_collection.count_documents(query)
        
        return {
            "assignments": assignments,
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": (total + per_page - 1) // per_page
        }
    
    async def analyze_product_performance(self, days_back: int = 30) -> List[ProductPerformanceMetrics]:
        """Analyze product performance for reallocation decisions"""
        start_date = now_ist() - timedelta(days=days_back)
        current_date = now_ist()
        
        # Get product performance metrics
        pipeline = [
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
                    "commission_earned": {"$sum": "$commission_data.commission_amount"},
                    "days_since_update": {
                        "$divide": [
                            {"$subtract": [current_date, "$updated_at"]},
                            86400000  # milliseconds in a day
                        ]
                    }
                }
            },
            {
                "$match": {
                    "assigned_to": {"$ne": None}
                }
            },
            {
                "$project": {
                    "product_id": "$id",
                    "assigned_to": 1,
                    "sales_count": {"$ifNull": ["$sales_info.sales_count", 0]},
                    "revenue": {"$ifNull": ["$sales_info.revenue", 0]},
                    "commission_earned": 1,
                    "last_update": "$updated_at",
                    "days_since_update": 1,
                    "performance_score": {
                        "$add": [
                            {"$multiply": [{"$ifNull": ["$sales_info.sales_count", 0]}, 10]},
                            {"$divide": [{"$ifNull": ["$sales_info.revenue", 0]}, 100]},
                            {"$multiply": [{"$divide": ["$commission_earned", 100]}, 5]}
                        ]
                    }
                }
            }
        ]
        
        try:
            results = await self.products_collection.aggregate(pipeline).to_list(length=1000)
            return [ProductPerformanceMetrics(**result) for result in results]
        except Exception as e:
            # Return empty list if aggregation fails
            return []
    
    async def get_reallocation_recommendations(
        self,
        criteria: Dict[str, Any] = None
    ) -> ReallocationRecommendation:
        """Get product reallocation recommendations"""
        if criteria is None:
            criteria = {
                "max_days_inactive": 30,
                "min_performance_score": 50,
                "high_performer_rotation_days": 90
            }
        
        performance_metrics = await self.analyze_product_performance()
        candidates = []
        
        for metric in performance_metrics:
            # Time-based reallocation
            if metric.days_since_update > criteria.get("max_days_inactive", 30):
                candidates.append(ReallocationCandidate(
                    product_id=metric.product_id,
                    current_assignee=metric.assigned_to,
                    reason=ReallocationReason.TIME_BASED,
                    performance_metrics=metric,
                    priority_score=metric.days_since_update * 2
                ))
            
            # Performance-based reallocation
            elif metric.performance_score < criteria.get("min_performance_score", 50):
                candidates.append(ReallocationCandidate(
                    product_id=metric.product_id,
                    current_assignee=metric.assigned_to,
                    reason=ReallocationReason.PERFORMANCE_BASED,
                    performance_metrics=metric,
                    priority_score=(100 - metric.performance_score) * 1.5
                ))
            
            # High performer rotation
            elif (metric.performance_score > 150 and 
                  metric.days_since_update > criteria.get("high_performer_rotation_days", 90)):
                candidates.append(ReallocationCandidate(
                    product_id=metric.product_id,
                    current_assignee=metric.assigned_to,
                    reason=ReallocationReason.HIGH_PERFORMER_ROTATION,
                    performance_metrics=metric,
                    priority_score=metric.performance_score * 0.5
                ))
        
        # Sort by priority score
        candidates.sort(key=lambda x: x.priority_score, reverse=True)
        
        return ReallocationRecommendation(
            candidates=candidates,
            generated_at=now_ist(),
            criteria=criteria,
            total_candidates=len(candidates)
        )

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
        rule_dict = rule_data.dict()
        rule_dict["created_by"] = current_user.id
        
        rule = await commission_service.create_commission_rule(rule_dict)
        
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
    product_id: Optional[str] = None,
    product_category: Optional[str] = None,
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
            product_id=product_id,
            product_category=product_category,
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
            update_dict["paid_at"] = now_ist()
        
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
    current_user: UserInDB = Depends(check_commission_permissions),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Calculate and create commission for an order"""
    try:
        commission_service = CommissionService(db)
        
        # Calculate commissions
        commissions = await commission_service.calculate_commission_for_order(order_id)
        
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

# Product Assignment Endpoints
@router.post("/assignments", response_model=APIResponse)
async def create_product_assignment(
    assignment_data: ProductAssignmentCreate,
    current_user: UserInDB = Depends(check_commission_permissions),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Create new product assignment"""
    try:
        commission_service = CommissionService(db)
        
        # Add assigned_by
        assignment_dict = assignment_data.dict()
        assignment_dict["assigned_by"] = current_user.id
        
        assignment = await commission_service.create_product_assignment(assignment_dict)
        
        return APIResponse(
            success=True,
            message="Product assignment created successfully",
            data=ProductAssignmentResponse(**assignment.dict()).dict()
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create product assignment"
        )

@router.get("/assignments", response_model=PaginatedResponse)
async def get_product_assignments(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    assigned_to: Optional[str] = None,
    product_id: Optional[str] = None,
    status: Optional[str] = None,
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get product assignments"""
    try:
        commission_service = CommissionService(db)
        
        # Filter by user if salesperson
        if current_user.role == "salesperson" and not assigned_to:
            assigned_to = current_user.id
        
        result = await commission_service.get_product_assignments(
            page=page,
            per_page=per_page,
            assigned_to=assigned_to,
            product_id=product_id,
            status=status
        )
        
        assignment_responses = []
        for assignment_doc in result["assignments"]:
            assignment = ProductAssignmentInDB(**assignment_doc)
            assignment_responses.append(ProductAssignmentResponse(**assignment.dict()).dict())
        
        return PaginatedResponse(
            success=True,
            message="Product assignments retrieved successfully",
            data=assignment_responses,
            total=result["total"],
            page=result["page"],
            per_page=result["per_page"],
            total_pages=result["total_pages"]
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve product assignments"
        )

# Product Reallocation Endpoints
@router.get("/reallocation/recommendations", response_model=APIResponse)
async def get_reallocation_recommendations(
    max_days_inactive: int = Query(30, ge=1),
    min_performance_score: float = Query(50.0, ge=0),
    high_performer_rotation_days: int = Query(90, ge=1),
    current_user: UserInDB = Depends(check_commission_permissions),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get product reallocation recommendations"""
    try:
        commission_service = CommissionService(db)
        
        criteria = {
            "max_days_inactive": max_days_inactive,
            "min_performance_score": min_performance_score,
            "high_performer_rotation_days": high_performer_rotation_days
        }
        
        recommendations = await commission_service.get_reallocation_recommendations(criteria)
        
        return APIResponse(
            success=True,
            message="Reallocation recommendations generated successfully",
            data=recommendations.dict()
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate reallocation recommendations"
        )

@router.post("/reallocation/bulk", response_model=APIResponse)
async def bulk_product_reassignment(
    reassignment_data: BulkProductReassignment,
    current_user: UserInDB = Depends(check_commission_permissions),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Bulk reassign products to new salesman"""
    try:
        commission_service = CommissionService(db)
        
        created_assignments = []
        for product_id in reassignment_data.product_ids:
            assignment_data = {
                "product_id": product_id,
                "assigned_to": reassignment_data.new_assignee,
                "assigned_by": current_user.id,
                "reason": reassignment_data.reason,
                "notes": reassignment_data.notes
            }
            
            assignment = await commission_service.create_product_assignment(assignment_data)
            created_assignments.append(assignment.id)
        
        return APIResponse(
            success=True,
            message=f"Successfully reassigned {len(created_assignments)} products",
            data={"assignment_ids": created_assignments}
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to bulk reassign products"
        )

# Bulk Operations
@router.put("/rules/bulk", response_model=APIResponse)
async def bulk_update_commission_rules(
    bulk_update: BulkCommissionRuleUpdate,
    current_user: UserInDB = Depends(check_commission_permissions),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Bulk update commission rules"""
    try:
        commission_service = CommissionService(db)
        
        updated_count = 0
        for rule_id in bulk_update.rule_ids:
            updated_rule = await commission_service.update_commission_rule(
                rule_id,
                bulk_update.updates.dict(exclude_unset=True)
            )
            if updated_rule:
                updated_count += 1
        
        return APIResponse(
            success=True,
            message=f"Successfully updated {updated_count} commission rules",
            data={"updated_count": updated_count}
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to bulk update commission rules"
        )