from fastapi import APIRouter, Depends, HTTPException, status, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional, List
from datetime import datetime

from models import (
    CampaignCreate, CampaignUpdate, CampaignResponse, CampaignInDB,
    CampaignStatus, APIResponse, PaginatedResponse, UserInDB
)
from auth import get_current_active_user, get_admin_user

router = APIRouter(prefix="/api/campaigns", tags=["Campaign Management"])

# Database dependency
async def get_db():
    from server import db
    return db

class CampaignService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.campaigns_collection = db.campaigns
        self.orders_collection = db.orders
        self.products_collection = db.products
    
    async def create_campaign(self, campaign_data: dict) -> CampaignInDB:
        """Create new campaign"""
        campaign = CampaignInDB(**campaign_data)
        campaign_dict = campaign.dict()
        
        await self.campaigns_collection.insert_one(campaign_dict)
        return campaign
    
    async def get_campaign_by_id(self, campaign_id: str) -> Optional[CampaignInDB]:
        """Get campaign by ID"""
        campaign_doc = await self.campaigns_collection.find_one({"id": campaign_id})
        if campaign_doc:
            return CampaignInDB(**campaign_doc)
        return None
    
    async def update_campaign(self, campaign_id: str, update_data: dict) -> Optional[CampaignInDB]:
        """Update campaign"""
        update_data["updated_at"] = datetime.utcnow()
        
        result = await self.campaigns_collection.update_one(
            {"id": campaign_id},
            {"$set": update_data}
        )
        
        if result.modified_count > 0:
            return await self.get_campaign_by_id(campaign_id)
        return None
    
    async def delete_campaign(self, campaign_id: str) -> bool:
        """Delete campaign"""
        result = await self.campaigns_collection.delete_one({"id": campaign_id})
        return result.deleted_count > 0
    
    async def get_campaigns(
        self,
        page: int = 1,
        per_page: int = 20,
        status: Optional[str] = None,
        created_by: Optional[str] = None
    ) -> dict:
        """Get campaigns with filtering and pagination"""
        # Build query
        query = {}
        
        if status:
            query["status"] = status
        
        if created_by:
            query["created_by"] = created_by
        
        # Calculate skip value
        skip = (page - 1) * per_page
        
        # Get campaigns with pagination
        cursor = self.campaigns_collection.find(query).sort("created_at", -1).skip(skip).limit(per_page)
        campaigns = await cursor.to_list(length=per_page)
        
        # Get total count
        total = await self.campaigns_collection.count_documents(query)
        
        return {
            "campaigns": campaigns,
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": (total + per_page - 1) // per_page
        }
    
    async def get_active_campaigns(self, user_role: str = None) -> List[CampaignInDB]:
        """Get active campaigns"""
        current_time = datetime.utcnow()
        
        query = {
            "status": CampaignStatus.ACTIVE.value,
            "start_date": {"$lte": current_time},
            "end_date": {"$gte": current_time}
        }
        
        # Filter by user role if specified
        if user_role:
            query["$or"] = [
                {"user_roles": []},  # Empty means all users
                {"user_roles": {"$in": [user_role]}}
            ]
        
        cursor = self.campaigns_collection.find(query)
        campaigns = await cursor.to_list(length=100)
        
        return [CampaignInDB(**campaign) for campaign in campaigns]
    
    async def calculate_discount(self, campaign_id: str, order_amount: float, product_ids: List[str] = None) -> dict:
        """Calculate discount for an order"""
        campaign = await self.get_campaign_by_id(campaign_id)
        if not campaign:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Campaign not found"
            )
        
        # Check if campaign is active
        current_time = datetime.utcnow()
        if campaign.status != CampaignStatus.ACTIVE or campaign.start_date > current_time or campaign.end_date < current_time:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Campaign is not active"
            )
        
        # Check usage limit
        if campaign.usage_limit and campaign.usage_count >= campaign.usage_limit:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Campaign usage limit reached"
            )
        
        # Check minimum order amount
        if campaign.min_order_amount and order_amount < campaign.min_order_amount:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Minimum order amount is {campaign.min_order_amount}"
            )
        
        # Check product eligibility
        if campaign.product_ids and product_ids:
            eligible_products = set(campaign.product_ids).intersection(set(product_ids))
            if not eligible_products:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No eligible products for this campaign"
                )
        
        # Calculate discount
        if campaign.discount_type == "percentage":
            discount_amount = (order_amount * campaign.discount_value) / 100
        else:  # fixed
            discount_amount = campaign.discount_value
        
        # Apply maximum discount limit
        if campaign.max_discount_amount and discount_amount > campaign.max_discount_amount:
            discount_amount = campaign.max_discount_amount
        
        return {
            "campaign_id": campaign_id,
            "discount_amount": discount_amount,
            "discount_type": campaign.discount_type,
            "discount_value": campaign.discount_value
        }
    
    async def apply_campaign_usage(self, campaign_id: str):
        """Increment campaign usage count"""
        await self.campaigns_collection.update_one(
            {"id": campaign_id},
            {"$inc": {"usage_count": 1}}
        )
    
    async def update_campaign_status(self):
        """Update campaign status based on dates"""
        current_time = datetime.utcnow()
        
        # Activate scheduled campaigns
        await self.campaigns_collection.update_many(
            {
                "status": CampaignStatus.SCHEDULED.value,
                "start_date": {"$lte": current_time},
                "end_date": {"$gte": current_time}
            },
            {"$set": {"status": CampaignStatus.ACTIVE.value}}
        )
        
        # Expire active campaigns
        await self.campaigns_collection.update_many(
            {
                "status": CampaignStatus.ACTIVE.value,
                "end_date": {"$lt": current_time}
            },
            {"$set": {"status": CampaignStatus.EXPIRED.value}}
        )

# Permission checks
async def check_campaign_permissions(current_user: UserInDB = Depends(get_current_active_user)):
    """Check if user has campaign management permissions"""
    allowed_roles = ["admin", "super_admin", "sales_manager", "marketing_manager", "store_owner"]
    if current_user.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions for campaign management"
        )
    return current_user

# Campaign endpoints
@router.post("/", response_model=APIResponse)
async def create_campaign(
    campaign_data: CampaignCreate,
    current_user: UserInDB = Depends(check_campaign_permissions),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Create new campaign"""
    try:
        campaign_service = CampaignService(db)
        
        # Set created_by to current user
        campaign_dict = campaign_data.dict()
        campaign_dict["created_by"] = current_user.id
        
        # Validate dates
        if campaign_dict["start_date"] >= campaign_dict["end_date"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Start date must be before end date"
            )
        
        # Create campaign
        campaign = await campaign_service.create_campaign(campaign_dict)
        
        # Create response
        campaign_response = CampaignResponse(**campaign.dict())
        
        return APIResponse(
            success=True,
            message="Campaign created successfully",
            data=campaign_response.dict()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create campaign"
        )

@router.get("/", response_model=PaginatedResponse)
async def get_campaigns(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    created_by: Optional[str] = None,
    current_user: UserInDB = Depends(check_campaign_permissions),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get campaigns with filtering and pagination"""
    try:
        campaign_service = CampaignService(db)
        
        # Update campaign status before returning
        await campaign_service.update_campaign_status()
        
        # Filter by user if not admin
        if current_user.role in ["sales_manager", "marketing_manager"] and not created_by:
            created_by = current_user.id
        
        result = await campaign_service.get_campaigns(
            page=page,
            per_page=per_page,
            status=status,
            created_by=created_by
        )
        
        # Convert to response format
        campaign_responses = []
        for campaign_doc in result["campaigns"]:
            campaign = CampaignInDB(**campaign_doc)
            campaign_responses.append(CampaignResponse(**campaign.dict()).dict())
        
        return PaginatedResponse(
            success=True,
            message="Campaigns retrieved successfully",
            data=campaign_responses,
            total=result["total"],
            page=result["page"],
            per_page=result["per_page"],
            total_pages=result["total_pages"]
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve campaigns"
        )

@router.get("/{campaign_id}", response_model=APIResponse)
async def get_campaign(
    campaign_id: str,
    current_user: UserInDB = Depends(check_campaign_permissions),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get campaign by ID"""
    try:
        campaign_service = CampaignService(db)
        
        campaign = await campaign_service.get_campaign_by_id(campaign_id)
        if not campaign:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Campaign not found"
            )
        
        # Create response
        campaign_response = CampaignResponse(**campaign.dict())
        
        return APIResponse(
            success=True,
            message="Campaign retrieved successfully",
            data=campaign_response.dict()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve campaign"
        )

@router.put("/{campaign_id}", response_model=APIResponse)
async def update_campaign(
    campaign_id: str,
    update_data: CampaignUpdate,
    current_user: UserInDB = Depends(check_campaign_permissions),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Update campaign"""
    try:
        campaign_service = CampaignService(db)
        
        # Check if campaign exists
        campaign = await campaign_service.get_campaign_by_id(campaign_id)
        if not campaign:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Campaign not found"
            )
        
        # Check if user can update this campaign
        if current_user.role not in ["admin", "super_admin", "store_owner"] and campaign.created_by != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update this campaign"
            )
        
        # Update campaign
        updated_campaign = await campaign_service.update_campaign(
            campaign_id,
            update_data.dict(exclude_unset=True)
        )
        
        # Create response
        campaign_response = CampaignResponse(**updated_campaign.dict())
        
        return APIResponse(
            success=True,
            message="Campaign updated successfully",
            data=campaign_response.dict()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update campaign"
        )

@router.delete("/{campaign_id}", response_model=APIResponse)
async def delete_campaign(
    campaign_id: str,
    current_user: UserInDB = Depends(check_campaign_permissions),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Delete campaign"""
    try:
        campaign_service = CampaignService(db)
        
        # Check if campaign exists
        campaign = await campaign_service.get_campaign_by_id(campaign_id)
        if not campaign:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Campaign not found"
            )
        
        # Check if user can delete this campaign
        if current_user.role not in ["admin", "super_admin", "store_owner"] and campaign.created_by != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to delete this campaign"
            )
        
        # Delete campaign
        success = await campaign_service.delete_campaign(campaign_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete campaign"
            )
        
        return APIResponse(
            success=True,
            message="Campaign deleted successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete campaign"
        )

@router.get("/active/list", response_model=APIResponse)
async def get_active_campaigns(
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get active campaigns for current user"""
    try:
        campaign_service = CampaignService(db)
        
        # Update campaign status first
        await campaign_service.update_campaign_status()
        
        campaigns = await campaign_service.get_active_campaigns(current_user.role)
        
        campaign_responses = []
        for campaign in campaigns:
            campaign_responses.append(CampaignResponse(**campaign.dict()).dict())
        
        return APIResponse(
            success=True,
            message="Active campaigns retrieved successfully",
            data=campaign_responses
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve active campaigns"
        )

@router.post("/{campaign_id}/calculate-discount", response_model=APIResponse)
async def calculate_campaign_discount(
    campaign_id: str,
    order_amount: float,
    product_ids: List[str] = None,
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Calculate discount for an order"""
    try:
        campaign_service = CampaignService(db)
        
        discount_info = await campaign_service.calculate_discount(
            campaign_id=campaign_id,
            order_amount=order_amount,
            product_ids=product_ids or []
        )
        
        return APIResponse(
            success=True,
            message="Discount calculated successfully",
            data=discount_info
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to calculate discount"
        )