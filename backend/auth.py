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
import re

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
    def format_phone_number(phone_input: str) -> str:
        """Format and validate Indian phone number"""
        if not phone_input:
            raise ValueError("Phone number is required")
        
        # Remove all non-digit characters
        phone = re.sub(r'\D', '', phone_input.strip())
        
        # Handle different input formats
        if phone.startswith('0'):
            # Remove leading 0 (Indian format: 09876543210)
            phone = phone[1:]
        elif phone.startswith('91') and len(phone) == 12:
            # Remove country code 91 (format: 919876543210)
            phone = phone[2:]
        elif phone.startswith('91') and len(phone) == 13:
            # Handle +91 case where + was removed (format: +919876543210)
            phone = phone[2:]
        
        # Validate final phone number
        if len(phone) != 10:
            raise ValueError("Phone number must be exactly 10 digits")
        
        if not phone.startswith(('6', '7', '8', '9')):
            raise ValueError("Invalid Indian mobile number format")
        
        return phone
    
    @staticmethod
    def is_email(input_str: str) -> bool:
        """Check if input string is an email address"""
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(email_pattern, input_str.strip()))
    
    @staticmethod
    def is_phone_number(input_str: str) -> bool:
        """Check if input string looks like a phone number"""
        # Check if it contains mostly digits and phone-like patterns
        phone_clean = re.sub(r'\D', '', input_str.strip())
        
        # Must have between 10-13 digits (accounting for country codes)
        if len(phone_clean) < 10 or len(phone_clean) > 13:
            return False
        
        # Check for common phone number patterns
        phone_patterns = [
            r'^[0-9]{10}$',  # 9876543210
            r'^0[0-9]{10}$',  # 09876543210
            r'^91[0-9]{10}$',  # 919876543210
            r'^\+91[0-9]{10}$',  # +919876543210
        ]
        
        for pattern in phone_patterns:
            if re.match(pattern, input_str.strip()):
                return True
        
        return False

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
    
    async def get_user_by_phone(self, phone: str) -> Optional[UserInDB]:
        """Get user by phone number (handles both encrypted and plain phone numbers)"""
        try:
            # Clean and format the phone number
            clean_phone = AuthService.format_phone_number(phone)
            
            # Try to find by encrypted phone (standard way)
            encrypted_phone = AuthService.encrypt_sensitive_data(clean_phone)
            user_doc = await self.users_collection.find_one({"phone": encrypted_phone})
            
            if user_doc:
                return UserInDB(**user_doc)
            
            # If not found, try to find by plain phone (for legacy data)
            user_doc = await self.users_collection.find_one({"phone": clean_phone})
            
            if user_doc:
                # Update to encrypted phone for consistency
                await self.users_collection.update_one(
                    {"id": user_doc["id"]},
                    {"$set": {"phone": encrypted_phone, "updated_at": datetime.utcnow()}}
                )
                user_doc["phone"] = encrypted_phone
                return UserInDB(**user_doc)
                
            return None
            
        except ValueError as e:
            # Invalid phone format
            return None
        except Exception as e:
            # Other errors in processing
            return None
    
    async def create_user(self, user_data: dict) -> UserInDB:
        """Create new user"""
        # Encrypt sensitive data
        if user_data.get("phone"):
            user_data["phone"] = AuthService.encrypt_sensitive_data(user_data["phone"])
        
        # Hash password
        user_data["hashed_password"] = AuthService.hash_password(user_data.pop("password"))
        
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
    
    async def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify password against hash"""
        return AuthService.verify_password(plain_password, hashed_password)
    
    async def authenticate_user(self, username_or_email: str, password: str) -> Optional[UserInDB]:
        """Authenticate user with username/email and password"""
        # Try to find user by email first
        user = await self.get_user_by_email(username_or_email)
        
        # If not found by email, try by username
        if not user:
            user = await self.get_user_by_username(username_or_email)
        
        if not user:
            return None
        
        if not AuthService.verify_password(password, user.hashed_password):
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