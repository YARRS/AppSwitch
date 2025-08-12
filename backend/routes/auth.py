from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import timedelta, datetime
from typing import Optional
from pydantic import BaseModel
from typing import Optional

from models import (
    UserCreate, UserResponse, UserUpdate, Token, APIResponse,
    UserInDB, UserRole
)
from auth import AuthService, UserService, get_current_active_user, get_admin_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# New models for mobile login and password reset
class LoginDetectRequest(BaseModel):
    identifier: str  # Can be email or phone number

class MobileLoginRequest(BaseModel):
    phone_number: str
    otp: str

class PasswordResetRequest(BaseModel):
    email: str

class PasswordResetConfirm(BaseModel):
    email: str
    reset_code: str
    new_password: str

# Database dependency
async def get_db():
    from server import db
    return db

@router.post("/login/detect", response_model=APIResponse)
async def detect_login_type(request: LoginDetectRequest, db: AsyncIOMotorDatabase = Depends(get_db)):
    """Detect if identifier is email or phone number and return appropriate login method"""
    try:
        identifier = request.identifier.strip()
        
        # Check if it's an email
        if AuthService.is_email(identifier):
            return APIResponse(
                success=True,
                message="Email detected",
                data={
                    "login_type": "email",
                    "identifier": identifier,
                    "requires": "password"
                }
            )
        
        # Check if it's a phone number
        if AuthService.is_phone_number(identifier):
            try:
                formatted_phone = AuthService.format_phone_number(identifier)
                return APIResponse(
                    success=True,
                    message="Phone number detected",
                    data={
                        "login_type": "phone",
                        "identifier": formatted_phone,
                        "requires": "otp"
                    }
                )
            except ValueError as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=str(e)
                )
        
        # If neither email nor phone, return error
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email address or phone number format"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to detect login type"
        )

@router.post("/login/mobile", response_model=Token)
async def mobile_login(request: MobileLoginRequest, db: AsyncIOMotorDatabase = Depends(get_db)):
    """Login with mobile number and OTP"""
    try:
        user_service = UserService(db)
        
        # Format phone number
        formatted_phone = AuthService.format_phone_number(request.phone_number)
        
        # Verify OTP first
        from routes.otp import OTPService
        otp_service = OTPService(db)
        
        # For testing, accept static OTP "123456"
        if request.otp == "123456":
            is_otp_valid = True
        else:
            is_otp_valid = await otp_service.verify_otp(formatted_phone, request.otp)
        
        if not is_otp_valid:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired OTP",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Find user by phone
        user = await user_service.get_user_by_phone(formatted_phone)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found with this phone number",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Account is inactive",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Update last login
        await user_service.update_last_login(user.id)
        
        # Create access token
        access_token_expires = timedelta(hours=24)
        access_token = AuthService.create_access_token(
            data={"sub": user.id, "email": user.email, "role": user.role},
            expires_delta=access_token_expires
        )
        
        # Create user response
        user_response = UserResponse(
            id=user.id,
            email=user.email,
            username=user.username,
            full_name=user.full_name,
            phone=user.phone,
            role=user.role,
            is_active=user.is_active,
            email_verified=user.email_verified,
            last_login=user.last_login,
            created_at=user.created_at,
            updated_at=user.updated_at
        )
        
        return Token(
            access_token=access_token,
            token_type="bearer",
            expires_in=86400,  # 24 hours in seconds
            user=user_response
        )
        
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Mobile login failed"
        )

@router.post("/password/reset-request", response_model=APIResponse)
async def request_password_reset(request: PasswordResetRequest, db: AsyncIOMotorDatabase = Depends(get_db)):
    """Request password reset for email"""
    try:
        user_service = UserService(db)
        
        # Check if user exists
        user = await user_service.get_user_by_email(request.email)
        if not user:
            # Don't reveal if email exists or not for security
            return APIResponse(
                success=True,
                message="If the email exists, a reset code has been sent",
                data={"email": request.email}
            )
        
        # Generate reset code (for testing, use static code)
        reset_code = "RESET123"  # In production, generate random code
        
        # Store reset code in database (simple implementation)
        reset_data = {
            "email": request.email,
            "reset_code": reset_code,
            "created_at": datetime.utcnow(),
            "expires_at": datetime.utcnow() + timedelta(hours=1),
            "used": False
        }
        
        # Remove any existing reset codes for this email
        await db.password_resets.delete_many({"email": request.email})
        
        # Insert new reset code
        await db.password_resets.insert_one(reset_data)
        
        return APIResponse(
            success=True,
            message="Password reset code sent to your email",
            data={
                "email": request.email,
                "test_reset_code": reset_code  # For testing only
            }
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process password reset request"
        )

@router.post("/password/reset-confirm", response_model=APIResponse)
async def confirm_password_reset(request: PasswordResetConfirm, db: AsyncIOMotorDatabase = Depends(get_db)):
    """Confirm password reset with code and new password"""
    try:
        user_service = UserService(db)
        
        # Find reset request
        reset_doc = await db.password_resets.find_one({
            "email": request.email,
            "reset_code": request.reset_code,
            "used": False
        })
        
        if not reset_doc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset code"
            )
        
        # Check if reset code has expired
        if datetime.utcnow() > reset_doc["expires_at"]:
            await db.password_resets.delete_one({"_id": reset_doc["_id"]})
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Reset code has expired"
            )
        
        # Find user
        user = await user_service.get_user_by_email(request.email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Validate new password
        if len(request.new_password) < 6:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must be at least 6 characters long"
            )
        
        # Update password
        hashed_password = AuthService.hash_password(request.new_password)
        await user_service.update_user(
            user.id,
            {"hashed_password": hashed_password}
        )
        
        # Mark reset code as used
        await db.password_resets.update_one(
            {"_id": reset_doc["_id"]},
            {"$set": {"used": True, "used_at": datetime.utcnow()}}
        )
        
        return APIResponse(
            success=True,
            message="Password reset successfully",
            data={"email": request.email}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reset password"
        )

@router.post("/register", response_model=APIResponse)
async def register(user_data: UserCreate, db: AsyncIOMotorDatabase = Depends(get_db)):
    """Register a new user"""
    try:
        user_service = UserService(db)
        
        # Check if user already exists
        existing_user = await user_service.get_user_by_email(user_data.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Check if username already exists
        existing_username = await user_service.get_user_by_username(user_data.username)
        if existing_username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )
        
        # Check if phone already exists (if provided)
        if hasattr(user_data, 'phone') and user_data.phone:
            existing_phone = await user_service.get_user_by_phone(user_data.phone)
            if existing_phone:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Phone number already registered"
                )
        
        # Create user
        user = await user_service.create_user(user_data.dict())
        
        # Create user response (without sensitive data)
        user_response = UserResponse(
            id=user.id,
            email=user.email,
            username=user.username,
            full_name=user.full_name,
            phone=user.phone,
            role=user.role,
            is_active=user.is_active,
            email_verified=user.email_verified,
            last_login=user.last_login,
            created_at=user.created_at,
            updated_at=user.updated_at
        )
        
        return APIResponse(
            success=True,
            message="User registered successfully",
            data=user_response.dict()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncIOMotorDatabase = Depends(get_db)):
    """Login user and return access token"""
    try:
        user_service = UserService(db)
        
        # Authenticate user
        user = await user_service.authenticate_user(form_data.username, form_data.password)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Create access token
        access_token_expires = timedelta(hours=24)
        access_token = AuthService.create_access_token(
            data={"sub": user.id, "email": user.email, "role": user.role},
            expires_delta=access_token_expires
        )
        
        # Create user response
        user_response = UserResponse(
            id=user.id,
            email=user.email,
            username=user.username,
            full_name=user.full_name,
            phone=user.phone,
            role=user.role,
            is_active=user.is_active,
            email_verified=user.email_verified,
            last_login=user.last_login,
            created_at=user.created_at,
            updated_at=user.updated_at
        )
        
        return Token(
            access_token=access_token,
            token_type="bearer",
            expires_in=86400,  # 24 hours in seconds
            user=user_response
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: UserInDB = Depends(get_current_active_user)):
    """Get current user information"""
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        username=current_user.username,
        full_name=current_user.full_name,
        phone=current_user.phone,
        role=current_user.role,
        is_active=current_user.is_active,
        email_verified=current_user.email_verified,
        last_login=current_user.last_login,
        created_at=current_user.created_at,
        updated_at=current_user.updated_at
    )

@router.put("/me", response_model=APIResponse)
async def update_current_user(
    update_data: UserUpdate,
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Update current user information"""
    try:
        user_service = UserService(db)
        
        # Update user
        updated_user = await user_service.update_user(
            current_user.id,
            update_data.dict(exclude_unset=True)
        )
        
        if not updated_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Create user response
        user_response = UserResponse(
            id=updated_user.id,
            email=updated_user.email,
            username=updated_user.username,
            full_name=updated_user.full_name,
            phone=updated_user.phone,
            role=updated_user.role,
            is_active=updated_user.is_active,
            email_verified=updated_user.email_verified,
            last_login=updated_user.last_login,
            created_at=updated_user.created_at,
            updated_at=updated_user.updated_at
        )
        
        return APIResponse(
            success=True,
            message="User updated successfully",
            data=user_response.dict()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Update failed"
        )

@router.post("/logout", response_model=APIResponse)
async def logout(current_user: UserInDB = Depends(get_current_active_user)):
    """Logout user (client should discard token)"""
    return APIResponse(
        success=True,
        message="Logged out successfully"
    )

@router.get("/users", response_model=APIResponse)
async def get_all_users(
    page: int = 1,
    per_page: int = 20,
    role: Optional[str] = None,
    admin_user: UserInDB = Depends(get_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all users (admin only) - supports filtering by role"""
    try:
        users_collection = db.users
        
        # Build query
        query = {}
        if role:
            query["role"] = role
        
        # Calculate skip value
        skip = (page - 1) * per_page
        
        # Get users with pagination
        cursor = users_collection.find(query).skip(skip).limit(per_page)
        users = await cursor.to_list(length=per_page)
        
        # Get total count
        total = await users_collection.count_documents(query)
        
        # Convert to response format
        user_responses = []
        for user_doc in users:
            user = UserInDB(**user_doc)
            user_responses.append(UserResponse(
                id=user.id,
                email=user.email,
                username=user.username,
                full_name=user.full_name,
                phone=user.phone,
                role=user.role,
                is_active=user.is_active,
                email_verified=user.email_verified,
                last_login=user.last_login,
                created_at=user.created_at,
                updated_at=user.updated_at
            ).dict())
        
        return APIResponse(
            success=True,
            message="Users retrieved successfully",
            data=user_responses
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve users"
        )

@router.put("/users/{user_id}/role", response_model=APIResponse)
async def update_user_role(
    user_id: str,
    new_role: UserRole,
    admin_user: UserInDB = Depends(get_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Update user role (admin only)"""
    try:
        user_service = UserService(db)
        
        # Get user
        user = await user_service.get_user_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Update role
        updated_user = await user_service.update_user(
            user_id,
            {"role": new_role.value}
        )
        
        return APIResponse(
            success=True,
            message="User role updated successfully",
            data={"user_id": user_id, "new_role": new_role.value}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user role"
        )

# New models for profile management
class EmailUpdateRequest(BaseModel):
    email: str
    password: Optional[str] = None  # Current password for verification

class PasswordSetupRequest(BaseModel):
    password: str
    confirm_password: str

@router.put("/profile/email", response_model=APIResponse)
async def update_user_email(
    request: EmailUpdateRequest,
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Update user email address"""
    try:
        user_service = UserService(db)
        
        # Check if email is already in use
        existing_user = await user_service.get_user_by_email(request.email)
        if existing_user and existing_user.id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already in use by another account"
            )
        
        # If user has a password, verify it
        if current_user.hashed_password and request.password:
            is_valid = await user_service.verify_password(request.password, current_user.hashed_password)
            if not is_valid:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid password"
                )
        
        # Update email
        updated_user = await user_service.update_user(
            current_user.id,
            {
                "email": request.email,
                "email_verified": False  # Reset email verification
            }
        )
        
        return APIResponse(
            success=True,
            message="Email updated successfully",
            data={"email": request.email}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update email"
        )

@router.post("/profile/setup-password", response_model=APIResponse)
async def setup_user_password(
    request: PasswordSetupRequest,
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Set up password for users who don't have one (e.g., created via phone)"""
    try:
        # Validate password match
        if request.password != request.confirm_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Passwords do not match"
            )
        
        # Validate password strength
        if len(request.password) < 6:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must be at least 6 characters long"
            )
        
        user_service = UserService(db)
        
        # Hash the new password
        from auth import AuthService
        hashed_password = AuthService.get_password_hash(request.password)
        
        # Update user with new password
        await user_service.update_user(
            current_user.id,
            {
                "hashed_password": hashed_password,
                "needs_password_setup": False
            }
        )
        
        return APIResponse(
            success=True,
            message="Password set successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to set password"
        )

@router.put("/profile/password", response_model=APIResponse)
async def change_user_password(
    current_password: str,
    new_password: str,
    confirm_password: str,
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Change user password"""
    try:
        # Validate new password match
        if new_password != confirm_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="New passwords do not match"
            )
        
        # Validate password strength
        if len(new_password) < 6:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must be at least 6 characters long"
            )
        
        user_service = UserService(db)
        
        # Verify current password
        if not current_user.hashed_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No password set. Use setup-password endpoint first."
            )
        
        is_valid = await user_service.verify_password(current_password, current_user.hashed_password)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid current password"
            )
        
        # Hash the new password
        from auth import AuthService
        hashed_password = AuthService.get_password_hash(new_password)
        
        # Update user with new password
        await user_service.update_user(
            current_user.id,
            {"hashed_password": hashed_password}
        )
        
        return APIResponse(
            success=True,
            message="Password changed successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to change password"
        )