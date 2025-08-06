from datetime import datetime, timedelta
from typing import Optional
import jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status, Depends
from fastapi.security import OAuth2PasswordBearer
from motor.motor_asyncio import AsyncIOMotorDatabase
import os
from dotenv import load_dotenv
from cryptography.fernet import Fernet
import base64
import secrets

from models import UserInDB, TokenData

load_dotenv()

# Configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-here")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_HOURS = int(os.getenv("JWT_EXPIRATION_HOURS", "24"))

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="api/auth/login", auto_error=False)

# Encryption for sensitive data
def generate_encryption_key():
    """Generate a new encryption key"""
    return Fernet.generate_key()

def get_encryption_key():
    """Get encryption key from environment or generate one"""
    key = os.getenv("ENCRYPTION_KEY")
    if not key:
        # Generate a new key and save it to environment
        key = generate_encryption_key()
        print(f"Generated new encryption key: {key.decode()}")
        print("Please add this to your .env file: ENCRYPTION_KEY={key.decode()}")
    else:
        key = key.encode()
    return key

# Initialize encryption
encryption_key = get_encryption_key()
cipher_suite = Fernet(encryption_key)

class AuthService:
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash a password using bcrypt"""
        return pwd_context.hash(password)
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash"""
        return pwd_context.verify(plain_password, hashed_password)
    
    @staticmethod
    def encrypt_sensitive_data(data: str) -> str:
        """Encrypt sensitive data like phone numbers, addresses"""
        try:
            encrypted_data = cipher_suite.encrypt(data.encode())
            return base64.b64encode(encrypted_data).decode()
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to encrypt data"
            )
    
    @staticmethod
    def decrypt_sensitive_data(encrypted_data: str) -> str:
        """Decrypt sensitive data"""
        try:
            decoded_data = base64.b64decode(encrypted_data.encode())
            decrypted_data = cipher_suite.decrypt(decoded_data)
            return decrypted_data.decode()
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to decrypt data"
            )
    
    @staticmethod
    def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """Create JWT access token"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
        
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    
    @staticmethod
    def verify_token(token: str) -> TokenData:
        """Verify JWT token and extract user data"""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_id: str = payload.get("sub")
            email: str = payload.get("email")
            
            if user_id is None or email is None:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            
            token_data = TokenData(user_id=user_id, email=email)
            return token_data
            
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except Exception as jwt_error:
            # Handle different JWT library versions
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
                headers={"WWW-Authenticate": "Bearer"},
            )

class UserService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.users_collection = db.users
    
    async def get_user_by_email(self, email: str) -> Optional[UserInDB]:
        """Get user by email"""
        user_doc = await self.users_collection.find_one({"email": email})
        if user_doc:
            return UserInDB(**user_doc)
        return None
    
    async def get_user_by_id(self, user_id: str) -> Optional[UserInDB]:
        """Get user by ID"""
        user_doc = await self.users_collection.find_one({"id": user_id})
        if user_doc:
            return UserInDB(**user_doc)
        return None
    
    async def get_user_by_username(self, username: str) -> Optional[UserInDB]:
        """Get user by username"""
        user_doc = await self.users_collection.find_one({"username": username})
        if user_doc:
            return UserInDB(**user_doc)
        return None
    
    async def create_user(self, user_data: dict) -> UserInDB:
        """Create new user"""
        # Encrypt sensitive data
        if user_data.get("phone"):
            user_data["phone"] = AuthService.encrypt_sensitive_data(user_data["phone"])
        
        # Hash password
        user_data["password_hash"] = AuthService.hash_password(user_data.pop("password"))
        
        # Create user document
        user = UserInDB(**user_data)
        user_dict = user.dict()
        
        # Insert into database
        await self.users_collection.insert_one(user_dict)
        return user
    
    async def update_user(self, user_id: str, update_data: dict) -> Optional[UserInDB]:
        """Update user"""
        # Encrypt sensitive data
        if update_data.get("phone"):
            update_data["phone"] = AuthService.encrypt_sensitive_data(update_data["phone"])
        
        update_data["updated_at"] = datetime.utcnow()
        
        result = await self.users_collection.update_one(
            {"id": user_id},
            {"$set": update_data}
        )
        
        if result.modified_count > 0:
            return await self.get_user_by_id(user_id)
        return None
    
    async def update_last_login(self, user_id: str):
        """Update user's last login time"""
        await self.users_collection.update_one(
            {"id": user_id},
            {"$set": {"last_login": datetime.utcnow()}}
        )
    
    async def authenticate_user(self, email: str, password: str) -> Optional[UserInDB]:
        """Authenticate user with email and password"""
        user = await self.get_user_by_email(email)
        if not user:
            return None
        
        if not AuthService.verify_password(password, user.password_hash):
            return None
        
        if not user.is_active:
            return None
        
        # Update last login
        await self.update_last_login(user.id)
        
        return user

# Dependency to get current user
async def get_current_user(token: str = Depends(oauth2_scheme)) -> UserInDB:
    """Get current authenticated user"""
    from server import db  # Import here to avoid circular import
    
    token_data = AuthService.verify_token(token)
    user_service = UserService(db)
    user = await user_service.get_user_by_id(token_data.user_id)
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user

# Dependency to get current active user
async def get_current_active_user(current_user: UserInDB = Depends(get_current_user)) -> UserInDB:
    """Get current active user"""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    return current_user

# Admin role dependency
async def get_admin_user(current_user: UserInDB = Depends(get_current_active_user)) -> UserInDB:
    """Get current admin user"""
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user

# Super admin role dependency
async def get_super_admin_user(current_user: UserInDB = Depends(get_current_active_user)) -> UserInDB:
    """Get current super admin user"""
    if current_user.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin access required"
        )
    return current_user

# Role-based permission decorators
async def get_salesperson_user(current_user: UserInDB = Depends(get_current_active_user)) -> UserInDB:
    """Get current salesperson user"""
    if current_user.role != "salesperson":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Salesperson access required"
        )
    return current_user

async def get_store_admin_user(current_user: UserInDB = Depends(get_current_active_user)) -> UserInDB:
    """Get current store admin user"""
    if current_user.role != "store_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Store admin access required"
        )
    return current_user

async def get_sales_manager_user(current_user: UserInDB = Depends(get_current_active_user)) -> UserInDB:
    """Get current sales manager user"""
    if current_user.role != "sales_manager":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sales manager access required"
        )
    return current_user

async def get_store_owner_user(current_user: UserInDB = Depends(get_current_active_user)) -> UserInDB:
    """Get current store owner user"""
    if current_user.role != "store_owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Store owner access required"
        )
    return current_user

async def get_support_executive_user(current_user: UserInDB = Depends(get_current_active_user)) -> UserInDB:
    """Get current support executive user"""
    if current_user.role != "support_executive":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Support executive access required"
        )
    return current_user

async def get_marketing_manager_user(current_user: UserInDB = Depends(get_current_active_user)) -> UserInDB:
    """Get current marketing manager user"""
    if current_user.role != "marketing_manager":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Marketing manager access required"
        )
    return current_user

# Multi-role permission decorators
async def get_admin_or_manager_user(current_user: UserInDB = Depends(get_current_active_user)) -> UserInDB:
    """Get user with admin or manager permissions"""
    allowed_roles = ["admin", "super_admin", "store_owner", "sales_manager", "marketing_manager"]
    if current_user.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Manager or admin access required"
        )
    return current_user

async def get_inventory_user(current_user: UserInDB = Depends(get_current_active_user)) -> UserInDB:
    """Get user with inventory permissions"""
    allowed_roles = ["admin", "super_admin", "store_admin", "salesperson", "store_owner"]
    if current_user.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inventory access required"
        )
    return current_user

# Optional authentication dependency for public endpoints
async def get_optional_current_user(token: Optional[str] = Depends(oauth2_scheme_optional)) -> Optional[UserInDB]:
    """Get current user if authenticated, None if not"""
    if not token:
        return None
    
    try:
        from server import db  # Import here to avoid circular import
        
        token_data = AuthService.verify_token(token)
        user_service = UserService(db)
        user = await user_service.get_user_by_id(token_data.user_id)
        
        if user and user.is_active:
            return user
        return None
        
    except HTTPException:
        # If token is invalid, just return None (don't raise error)
        return None