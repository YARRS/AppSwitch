from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import timedelta
from typing import Optional
from pydantic import BaseModel

from models import (
    UserCreate, UserResponse, UserUpdate, Token, APIResponse,
    UserInDB, UserRole
)
from auth import AuthService, UserService, get_current_active_user, get_admin_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# Database dependency
async def get_db():
    from server import db
    return db

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