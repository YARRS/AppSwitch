from fastapi import APIRouter, Depends, HTTPException, status, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional, List
from datetime import datetime
import uuid

from models import (
    AddressCreate, AddressUpdate, AddressResponse, AddressInDB,
    APIResponse, UserInDB
)
from auth import get_current_active_user

router = APIRouter(prefix="/api/addresses", tags=["Addresses"])

class AddressService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.addresses_collection = db.addresses
    
    async def create_address(self, user_id: str, address_data: dict) -> AddressInDB:
        """Create new address for user"""
        
        # If this is set as default, unset any existing default addresses
        if address_data.get('is_default', False):
            await self.addresses_collection.update_many(
                {"user_id": user_id, "is_default": True},
                {"$set": {"is_default": False, "updated_at": now_ist()}}
            )
        
        # If this is the user's first address, make it default
        existing_count = await self.addresses_collection.count_documents({"user_id": user_id})
        if existing_count == 0:
            address_data['is_default'] = True
        
        # Prepare complete address data
        complete_address_data = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "created_at": now_ist(),
            "updated_at": now_ist(),
            **address_data
        }
        
        address = AddressInDB(**complete_address_data)
        address_dict = address.dict()
        
        # Insert address
        await self.addresses_collection.insert_one(address_dict)
        
        return address
    
    async def get_user_addresses(self, user_id: str) -> List[AddressInDB]:
        """Get all addresses for a user"""
        cursor = self.addresses_collection.find({"user_id": user_id}).sort("is_default", -1)
        addresses = await cursor.to_list(length=None)
        
        return [AddressInDB(**addr) for addr in addresses]
    
    async def get_address_by_id(self, address_id: str, user_id: str) -> Optional[AddressInDB]:
        """Get address by ID, ensuring it belongs to the user"""
        address_doc = await self.addresses_collection.find_one({
            "id": address_id,
            "user_id": user_id
        })
        if address_doc:
            return AddressInDB(**address_doc)
        return None
    
    async def update_address(self, address_id: str, user_id: str, update_data: dict) -> Optional[AddressInDB]:
        """Update address"""
        
        # If setting as default, unset other default addresses first
        if update_data.get('is_default', False):
            await self.addresses_collection.update_many(
                {"user_id": user_id, "is_default": True, "id": {"$ne": address_id}},
                {"$set": {"is_default": False, "updated_at": now_ist()}}
            )
        
        update_data["updated_at"] = now_ist()
        
        result = await self.addresses_collection.update_one(
            {"id": address_id, "user_id": user_id},
            {"$set": update_data}
        )
        
        if result.modified_count > 0:
            return await self.get_address_by_id(address_id, user_id)
        return None
    
    async def delete_address(self, address_id: str, user_id: str) -> bool:
        """Delete address"""
        # Check if this is the default address
        address = await self.get_address_by_id(address_id, user_id)
        if not address:
            return False
        
        result = await self.addresses_collection.delete_one({
            "id": address_id,
            "user_id": user_id
        })
        
        # If we deleted the default address, set another address as default
        if result.deleted_count > 0 and address.is_default:
            await self.addresses_collection.update_one(
                {"user_id": user_id},
                {"$set": {"is_default": True, "updated_at": now_ist()}}
            )
        
        return result.deleted_count > 0
    
    async def set_default_address(self, address_id: str, user_id: str) -> bool:
        """Set an address as default"""
        # Unset all default addresses for the user
        await self.addresses_collection.update_many(
            {"user_id": user_id, "is_default": True},
            {"$set": {"is_default": False, "updated_at": now_ist()}}
        )
        
        # Set the specified address as default
        result = await self.addresses_collection.update_one(
            {"id": address_id, "user_id": user_id},
            {"$set": {"is_default": True, "updated_at": now_ist()}}
        )
        
        return result.modified_count > 0

async def get_db():
    from server import db
    return db

@router.post("/", response_model=APIResponse)
async def create_address(
    address_data: AddressCreate,
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Create new address for current user"""
    try:
        address_service = AddressService(db)
        
        # Validate phone number (using existing phone validation logic)
        from auth import AuthService
        try:
            formatted_phone = AuthService.format_phone_number(address_data.phone)
            address_dict = address_data.dict()
            address_dict['phone'] = formatted_phone
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
        
        # Create address
        address = await address_service.create_address(current_user.id, address_dict)
        
        # Create response
        address_response = AddressResponse(**address.dict())
        
        return APIResponse(
            success=True,
            message="Address created successfully",
            data=address_response.dict()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create address"
        )

@router.get("/", response_model=APIResponse)
async def get_user_addresses(
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all addresses for current user"""
    try:
        address_service = AddressService(db)
        
        addresses = await address_service.get_user_addresses(current_user.id)
        
        # Convert to response format
        address_responses = []
        for address in addresses:
            address_responses.append(AddressResponse(**address.dict()).dict())
        
        return APIResponse(
            success=True,
            message="Addresses retrieved successfully",
            data=address_responses
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve addresses"
        )

@router.get("/{address_id}", response_model=APIResponse)
async def get_address(
    address_id: str,
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get address by ID"""
    try:
        address_service = AddressService(db)
        
        address = await address_service.get_address_by_id(address_id, current_user.id)
        if not address:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Address not found"
            )
        
        address_response = AddressResponse(**address.dict())
        
        return APIResponse(
            success=True,
            message="Address retrieved successfully",
            data=address_response.dict()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve address"
        )

@router.put("/{address_id}", response_model=APIResponse)
async def update_address(
    address_id: str,
    update_data: AddressUpdate,
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Update address"""
    try:
        address_service = AddressService(db)
        
        # Check if address exists and belongs to user
        existing_address = await address_service.get_address_by_id(address_id, current_user.id)
        if not existing_address:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Address not found"
            )
        
        # Validate phone number if provided
        update_dict = update_data.dict(exclude_unset=True)
        if 'phone' in update_dict:
            from auth import AuthService
            try:
                formatted_phone = AuthService.format_phone_number(update_dict['phone'])
                update_dict['phone'] = formatted_phone
            except ValueError as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=str(e)
                )
        
        # Update address
        updated_address = await address_service.update_address(
            address_id,
            current_user.id,
            update_dict
        )
        
        if not updated_address:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Address not found"
            )
        
        address_response = AddressResponse(**updated_address.dict())
        
        return APIResponse(
            success=True,
            message="Address updated successfully",
            data=address_response.dict()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update address"
        )

@router.delete("/{address_id}", response_model=APIResponse)
async def delete_address(
    address_id: str,
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Delete address"""
    try:
        address_service = AddressService(db)
        
        # Check if address exists and belongs to user
        address = await address_service.get_address_by_id(address_id, current_user.id)
        if not address:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Address not found"
            )
        
        # Delete address
        deleted = await address_service.delete_address(address_id, current_user.id)
        
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Address not found"
            )
        
        return APIResponse(
            success=True,
            message="Address deleted successfully",
            data={"deleted_address_id": address_id}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete address"
        )

@router.post("/{address_id}/set-default", response_model=APIResponse)
async def set_default_address(
    address_id: str,
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Set address as default"""
    try:
        address_service = AddressService(db)
        
        # Check if address exists and belongs to user
        address = await address_service.get_address_by_id(address_id, current_user.id)
        if not address:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Address not found"
            )
        
        # Set as default
        success = await address_service.set_default_address(address_id, current_user.id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Address not found"
            )
        
        return APIResponse(
            success=True,
            message="Default address updated successfully",
            data={"default_address_id": address_id}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to set default address"
        )