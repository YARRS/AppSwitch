from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import timedelta
from typing import Optional

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
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncIOMotorDatabase = Depends()):
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
    db: AsyncIOMotorDatabase = Depends()
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
    admin_user: UserInDB = Depends(get_admin_user),
    db: AsyncIOMotorDatabase = Depends()
):
    """Get all users (admin only)"""
    try:
        users_collection = db.users
        
        # Calculate skip value
        skip = (page - 1) * per_page
        
        # Get users with pagination
        cursor = users_collection.find({}).skip(skip).limit(per_page)
        users = await cursor.to_list(length=per_page)
        
        # Get total count
        total = await users_collection.count_documents({})
        
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
            data={
                "users": user_responses,
                "total": total,
                "page": page,
                "per_page": per_page,
                "total_pages": (total + per_page - 1) // per_page
            }
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
    db: AsyncIOMotorDatabase = Depends()
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