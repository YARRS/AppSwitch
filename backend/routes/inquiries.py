from fastapi import APIRouter, Depends, HTTPException, status, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional, List
from datetime import datetime

from models import (
    InquiryCreate, InquiryUpdate, InquiryResponse, InquiryInDB,
    APIResponse, PaginatedResponse, UserInDB
)
from auth import get_current_active_user, get_admin_user

router = APIRouter(prefix="/api/inquiries", tags=["Customer Inquiries"])

# Database dependency
async def get_db():
    from server import db
    return db

class InquiryService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.inquiries_collection = db.inquiries
    
    async def create_inquiry(self, inquiry_data: dict) -> InquiryInDB:
        """Create new inquiry"""
        inquiry = InquiryInDB(**inquiry_data)
        inquiry_dict = inquiry.dict()
        
        await self.inquiries_collection.insert_one(inquiry_dict)
        return inquiry
    
    async def get_inquiry_by_id(self, inquiry_id: str) -> Optional[InquiryInDB]:
        """Get inquiry by ID"""
        inquiry_doc = await self.inquiries_collection.find_one({"id": inquiry_id})
        if inquiry_doc:
            return InquiryInDB(**inquiry_doc)
        return None
    
    async def update_inquiry(self, inquiry_id: str, update_data: dict) -> Optional[InquiryInDB]:
        """Update inquiry"""
        update_data["updated_at"] = datetime.utcnow()
        
        result = await self.inquiries_collection.update_one(
            {"id": inquiry_id},
            {"$set": update_data}
        )
        
        if result.modified_count > 0:
            return await self.get_inquiry_by_id(inquiry_id)
        return None
    
    async def get_inquiries(
        self,
        page: int = 1,
        per_page: int = 20,
        status: Optional[str] = None,
        search: Optional[str] = None
    ) -> dict:
        """Get inquiries with filtering and pagination"""
        # Build query
        query = {}
        
        if status:
            query["status"] = status
        
        if search:
            query["$or"] = [
                {"name": {"$regex": search, "$options": "i"}},
                {"email": {"$regex": search, "$options": "i"}},
                {"subject": {"$regex": search, "$options": "i"}},
                {"message": {"$regex": search, "$options": "i"}}
            ]
        
        # Calculate skip value
        skip = (page - 1) * per_page
        
        # Get inquiries with pagination
        cursor = self.inquiries_collection.find(query).sort("created_at", -1).skip(skip).limit(per_page)
        inquiries = await cursor.to_list(length=per_page)
        
        # Get total count
        total = await self.inquiries_collection.count_documents(query)
        
        return {
            "inquiries": inquiries,
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": (total + per_page - 1) // per_page
        }

# Permission checks
async def check_inquiry_permissions(current_user: UserInDB = Depends(get_current_active_user)):
    """Check if user has inquiry management permissions"""
    allowed_roles = ["admin", "super_admin", "support_executive", "store_owner"]
    if current_user.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions for inquiry management"
        )
    return current_user

# Inquiry endpoints
@router.post("/", response_model=APIResponse)
async def create_inquiry(
    inquiry_data: InquiryCreate,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Create new inquiry (public endpoint)"""
    try:
        inquiry_service = InquiryService(db)
        
        # Create inquiry
        inquiry = await inquiry_service.create_inquiry(inquiry_data.dict())
        
        # Create response
        inquiry_response = InquiryResponse(**inquiry.dict())
        
        return APIResponse(
            success=True,
            message="Inquiry submitted successfully",
            data=inquiry_response.dict()
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit inquiry"
        )

@router.get("/", response_model=PaginatedResponse)
async def get_inquiries(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    search: Optional[str] = None,
    current_user: UserInDB = Depends(check_inquiry_permissions),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get inquiries with filtering and pagination"""
    try:
        inquiry_service = InquiryService(db)
        
        result = await inquiry_service.get_inquiries(
            page=page,
            per_page=per_page,
            status=status,
            search=search
        )
        
        # Convert to response format
        inquiry_responses = []
        for inquiry_doc in result["inquiries"]:
            inquiry = InquiryInDB(**inquiry_doc)
            inquiry_responses.append(InquiryResponse(**inquiry.dict()).dict())
        
        return PaginatedResponse(
            success=True,
            message="Inquiries retrieved successfully",
            data=inquiry_responses,
            total=result["total"],
            page=result["page"],
            per_page=result["per_page"],
            total_pages=result["total_pages"]
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve inquiries"
        )

@router.get("/{inquiry_id}", response_model=APIResponse)
async def get_inquiry(
    inquiry_id: str,
    current_user: UserInDB = Depends(check_inquiry_permissions),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get inquiry by ID"""
    try:
        inquiry_service = InquiryService(db)
        
        inquiry = await inquiry_service.get_inquiry_by_id(inquiry_id)
        if not inquiry:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Inquiry not found"
            )
        
        # Create response
        inquiry_response = InquiryResponse(**inquiry.dict())
        
        return APIResponse(
            success=True,
            message="Inquiry retrieved successfully",
            data=inquiry_response.dict()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve inquiry"
        )

@router.put("/{inquiry_id}", response_model=APIResponse)
async def update_inquiry(
    inquiry_id: str,
    update_data: InquiryUpdate,
    current_user: UserInDB = Depends(check_inquiry_permissions),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Update inquiry"""
    try:
        inquiry_service = InquiryService(db)
        
        # Check if inquiry exists
        inquiry = await inquiry_service.get_inquiry_by_id(inquiry_id)
        if not inquiry:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Inquiry not found"
            )
        
        # Update inquiry
        update_dict = update_data.dict(exclude_unset=True)
        if update_dict.get("status") == "responded":
            update_dict["responded_at"] = datetime.utcnow()
        
        updated_inquiry = await inquiry_service.update_inquiry(inquiry_id, update_dict)
        
        # Create response
        inquiry_response = InquiryResponse(**updated_inquiry.dict())
        
        return APIResponse(
            success=True,
            message="Inquiry updated successfully",
            data=inquiry_response.dict()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update inquiry"
        )