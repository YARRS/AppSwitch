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
        """Format and validate phone number - supports multiple international formats"""
        if not phone_input:
            raise ValueError("Phone number is required")
        
        original_phone = phone_input.strip()
        
        # Remove all non-digit characters for processing
        phone = re.sub(r'\D', '', original_phone)
        
        # Handle different input formats based on original input and length
        
        # US phone number with +1 prefix: +1234567890 (11 chars original, 10 digits cleaned)
        if original_phone.startswith('+1') and len(phone) == 10:
            return original_phone  # Keep +1234567890 format
        
        # US phone number with 1 prefix: 12345678901 (11 digits cleaned)
        elif len(phone) == 11 and phone.startswith('1') and not original_phone.startswith('+'):
            return phone  # Keep 12345678901 format
        
        # Indian phone number with +91 prefix
        elif original_phone.startswith('+91'):
            if len(phone) == 12 and phone.startswith('91'):
                # +919876543210 -> 9876543210
                return phone[2:]
            elif len(phone) == 11:
                # +91987654321 -> 987654321 (only 9 digits, invalid)
                raise ValueError(f"Invalid Indian phone format. Expected +91 followed by 10 digits, got {len(phone) - 2} digits after +91")
            elif len(phone) == 10:
                # +91987654321 where input was malformed, but we got 10 digits somehow
                return phone
            else:
                raise ValueError(f"Invalid Indian phone format with +91 prefix. Expected 12 total digits, got {len(phone)}")
        
        # Indian phone number with 91 prefix: 919876543210 (12 digits cleaned)
        elif len(phone) == 12 and phone.startswith('91') and not original_phone.startswith('+'):
            return phone[2:]  # Return 9876543210
        
        # Indian phone number with 0 prefix: 09876543210 (11 digits cleaned)
        elif len(phone) == 11 and phone.startswith('0'):
            return phone[1:]  # Return 9876543210
        
        # 10-digit number (could be Indian mobile or US without country code)
        elif len(phone) == 10:
            return phone  # Return as-is
        
        else:
            raise ValueError(f"Invalid phone number format. Input: '{original_phone}', Cleaned: '{phone}' ({len(phone)} digits)")
        
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
        
        # Check for common phone number patterns (expanded for international support)
        phone_patterns = [
            r'^[0-9]{10}$',        # 9876543210 (10 digits)
            r'^0[0-9]{10}$',       # 09876543210 (11 digits with leading 0)
            r'^91[0-9]{10}$',      # 919876543210 (Indian with country code)
            r'^\+91[0-9]{10}$',    # +919876543210 (Indian with +)
            r'^1[0-9]{10}$',       # 12345678901 (US with country code)
            r'^\+1[0-9]{10}$',     # +12345678901 (US with +)
            r'^\+[0-9]{10,12}$',   # Generic international format
        ]
        
        for pattern in phone_patterns:
            if re.match(pattern, input_str.strip()):
                return True
        
        # Additional check: if it's mostly numbers and reasonable length
        if len(phone_clean) >= 10 and len(phone_clean) <= 13:
            # Check if at least 80% of characters are digits in original string
            total_chars = len(input_str.strip())
            digit_ratio = len(phone_clean) / total_chars if total_chars > 0 else 0
            if digit_ratio >= 0.7:  # 70% digits threshold
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
    
    async def get_user_by_username(self, username: str) -> Optional[UserInDB]:
        """Get user by username"""
        user_doc = await self.users_collection.find_one({"username": username})
        if user_doc:
            return UserInDB(**user_doc)
        return None
    
    async def get_user_by_phone(self, phone: str) -> Optional[UserInDB]:
        """Get user by phone number (handles both encrypted and plain phone numbers)"""
        try:
            # Clean and format the phone number consistently
            clean_phone = AuthService.format_phone_number(phone)
            print(f"Looking for user with formatted phone: {clean_phone} (original: {phone})")
            
            # Strategy 1: Try to find by exact encrypted match (unlikely to work with Fernet)
            try:
                encrypted_phone = AuthService.encrypt_sensitive_data(clean_phone)
                user_doc = await self.users_collection.find_one({"phone": encrypted_phone})
                if user_doc:
                    print(f"Found user by encrypted phone match: {user_doc.get('username', 'N/A')}")
                    return UserInDB(**user_doc)
            except Exception as e:
                print(f"Encrypted phone lookup failed: {e}")
            
            # Strategy 2: Try to find by plain phone (for legacy/unencrypted data)
            user_doc = await self.users_collection.find_one({"phone": clean_phone})
            if user_doc:
                print(f"Found user by plain phone match: {user_doc.get('username', 'N/A')}")
                # Update to encrypted phone for consistency
                try:
                    encrypted_phone = AuthService.encrypt_sensitive_data(clean_phone)
                    await self.users_collection.update_one(
                        {"id": user_doc["id"]},
                        {"$set": {"phone": encrypted_phone, "updated_at": datetime.utcnow()}}
                    )
                    user_doc["phone"] = encrypted_phone
                    print(f"Updated user {user_doc.get('username', 'N/A')} phone to encrypted format")
                except Exception as e:
                    print(f"Failed to encrypt phone for user {user_doc.get('username', 'N/A')}: {e}")
                return UserInDB(**user_doc)
            
            # Strategy 3: Decrypt all phone numbers and compare (required for Fernet encryption)
            print(f"Attempting comprehensive phone search by decrypting all stored phones...")
            users_cursor = self.users_collection.find({}, {"id": 1, "email": 1, "phone": 1, "username": 1, "full_name": 1, "role": 1, "is_active": 1, "hashed_password": 1, "email_verified": 1, "last_login": 1, "created_at": 1, "updated_at": 1, "store_owner_id": 1, "needs_password_setup": 1})
            users = await users_cursor.to_list(length=1000)  # Reasonable limit
            
            for user_doc in users:
                stored_phone = user_doc.get('phone')
                if not stored_phone:
                    continue
                
                try:
                    # Try to decrypt the stored phone
                    decrypted_phone = AuthService.decrypt_sensitive_data(stored_phone)
                    # Format the decrypted phone to ensure consistent comparison
                    formatted_decrypted = AuthService.format_phone_number(decrypted_phone)
                    if formatted_decrypted == clean_phone:
                        print(f"Found user by decrypted phone match: {user_doc.get('username', 'N/A')} (stored: {decrypted_phone} → formatted: {formatted_decrypted})")
                        return UserInDB(**user_doc)
                except Exception as e:
                    # If decryption fails, maybe it's plain text
                    try:
                        formatted_stored = AuthService.format_phone_number(stored_phone)
                        if formatted_stored == clean_phone:
                            print(f"Found user by plain phone format match: {user_doc.get('username', 'N/A')} (stored: {stored_phone} → formatted: {formatted_stored})")
                            return UserInDB(**user_doc)
                    except:
                        # Last resort: direct comparison
                        if stored_phone == clean_phone:
                            print(f"Found user by direct phone match: {user_doc.get('username', 'N/A')} (stored: {stored_phone})")
                            return UserInDB(**user_doc)
            
            # Strategy 4: Try some variations if not found
            # This handles cases where phone might be stored in different formats
            possible_formats = set()
            
            # For 10-digit numbers, try with +1 prefix (US format)
            if len(clean_phone) == 10 and not clean_phone.startswith('+'):
                possible_formats.add(f"+1{clean_phone}")
                
            # For 11-digit numbers starting with 1, try without the 1
            elif len(clean_phone) == 11 and clean_phone.startswith('1'):
                possible_formats.add(clean_phone[1:])
                
            # For +1 format, try without +
            elif clean_phone.startswith('+1'):
                possible_formats.add(clean_phone[2:])  # Remove +1
                possible_formats.add(clean_phone[1:])   # Remove just +
            
            # Try to find with these alternate formats using the same decrypt-all approach
            for alt_phone in possible_formats:
                if alt_phone == clean_phone:
                    continue  # Already tried this
                    
                # Use the same decrypt-all approach for variations
                for user_doc in users:
                    stored_phone = user_doc.get('phone')
                    if not stored_phone:
                        continue
                    
                    try:
                        decrypted_phone = AuthService.decrypt_sensitive_data(stored_phone)
                        if decrypted_phone == alt_phone:
                            return UserInDB(**user_doc)
                    except:
                        if stored_phone == alt_phone:
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
    
    async def authenticate_user(self, email_or_phone_or_username: str, password: str) -> Optional[UserInDB]:
        """Authenticate user with email/phone/username and password"""
        # First try to find user by email
        user = await self.get_user_by_email(email_or_phone_or_username)
        
        # If not found by email, check if it looks like a phone number
        if not user and AuthService.is_phone_number(email_or_phone_or_username):
            try:
                # Try to find by phone with proper formatting
                user = await self.get_user_by_phone(email_or_phone_or_username)
            except (ValueError, Exception) as e:
                # If phone formatting fails, try original input as username
                pass
        
        # If still not found, try by username
        if not user:
            user = await self.get_user_by_username(email_or_phone_or_username)
        
        # If no user found at all
        if not user:
            return None
        
        # Check if user has a password set
        if not user.hashed_password:
            # User doesn't have a password (probably registered via phone/OTP)
            return None
        
        # Verify password
        if not AuthService.verify_password(password, user.hashed_password):
            return None
        
        # Check if user is active
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