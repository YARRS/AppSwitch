from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional
from datetime import datetime, timedelta
import re
from pydantic import BaseModel, validator

from models import APIResponse

router = APIRouter(prefix="/api/otp", tags=["OTP"])

# Database dependency
async def get_db():
    from server import db
    return db

# Request models
class OTPSendRequest(BaseModel):
    phone_number: str
    
    @validator('phone_number')
    def validate_phone(cls, v):
        # Remove any non-digit characters
        phone = re.sub(r'\D', '', v)
        
        # Check if it's a valid 10-digit Indian mobile number
        if len(phone) == 10 and phone.startswith(('6', '7', '8', '9')):
            return phone
        elif len(phone) == 12 and phone.startswith('91'):
            return phone[2:]  # Remove country code
        elif len(phone) == 13 and phone.startswith('+91'):
            return phone[3:]  # Remove country code with +
        
        raise ValueError('Invalid phone number format. Please provide a valid 10-digit mobile number.')

class OTPVerifyRequest(BaseModel):
    phone_number: str
    otp: str
    
    @validator('phone_number')
    def validate_phone(cls, v):
        # Remove any non-digit characters
        phone = re.sub(r'\D', '', v)
        
        # Check if it's a valid 10-digit Indian mobile number
        if len(phone) == 10 and phone.startswith(('6', '7', '8', '9')):
            return phone
        elif len(phone) == 12 and phone.startswith('91'):
            return phone[2:]  # Remove country code
        elif len(phone) == 13 and phone.startswith('+91'):
            return phone[3:]  # Remove country code with +
        
        raise ValueError('Invalid phone number format. Please provide a valid 10-digit mobile number.')

class OTPService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.otp_collection = db.otp_sessions
        self.default_otp = "123456"  # Default OTP for testing
    
    async def send_otp(self, phone_number: str) -> dict:
        """Send OTP to phone number (mock implementation for testing)"""
        try:
            # Generate OTP session
            session_data = {
                "phone_number": phone_number,
                "otp": self.default_otp,
                "created_at": datetime.utcnow(),
                "expires_at": datetime.utcnow() + timedelta(minutes=10),
                "attempts": 0,
                "is_verified": False
            }
            
            # Remove any existing OTP for this phone number
            await self.otp_collection.delete_many({"phone_number": phone_number})
            
            # Insert new OTP session
            await self.otp_collection.insert_one(session_data)
            
            return {
                "message": f"OTP sent to {phone_number}",
                "expires_in": 600,  # 10 minutes in seconds
                "test_otp": self.default_otp  # For testing purposes only
            }
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to send OTP"
            )
    
    async def verify_otp(self, phone_number: str, otp: str) -> bool:
        """Verify OTP for phone number"""
        try:
            # Find OTP session
            otp_session = await self.otp_collection.find_one({
                "phone_number": phone_number,
                "is_verified": False
            })
            
            if not otp_session:
                return False
            
            # Check if OTP has expired
            if datetime.utcnow() > otp_session["expires_at"]:
                # Clean up expired OTP
                await self.otp_collection.delete_one({"_id": otp_session["_id"]})
                return False
            
            # Check attempts limit (max 3 attempts)
            if otp_session["attempts"] >= 3:
                await self.otp_collection.delete_one({"_id": otp_session["_id"]})
                return False
            
            # Verify OTP
            if otp_session["otp"] == otp:
                # Mark as verified and clean up
                await self.otp_collection.update_one(
                    {"_id": otp_session["_id"]},
                    {"$set": {"is_verified": True, "verified_at": datetime.utcnow()}}
                )
                return True
            else:
                # Increment attempts
                await self.otp_collection.update_one(
                    {"_id": otp_session["_id"]},
                    {"$inc": {"attempts": 1}}
                )
                return False
                
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to verify OTP"
            )
    
    async def cleanup_expired_otps(self):
        """Clean up expired OTP sessions"""
        try:
            await self.otp_collection.delete_many({
                "expires_at": {"$lt": datetime.utcnow()}
            })
        except Exception:
            pass  # Ignore cleanup errors

@router.post("/send", response_model=APIResponse)
async def send_otp(
    request: OTPSendRequest,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Send OTP to phone number"""
    try:
        otp_service = OTPService(db)
        
        # Clean up expired OTPs first
        await otp_service.cleanup_expired_otps()
        
        # Send OTP
        result = await otp_service.send_otp(request.phone_number)
        
        return APIResponse(
            success=True,
            message="OTP sent successfully",
            data=result
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send OTP"
        )

@router.post("/verify", response_model=APIResponse)
async def verify_otp(
    request: OTPVerifyRequest,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Verify OTP for phone number"""
    try:
        otp_service = OTPService(db)
        
        # Verify OTP
        is_valid = await otp_service.verify_otp(request.phone_number, request.otp)
        
        if is_valid:
            return APIResponse(
                success=True,
                message="OTP verified successfully",
                data={"phone_verified": True, "phone_number": request.phone_number}
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired OTP"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to verify OTP"
        )