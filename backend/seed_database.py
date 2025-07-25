#!/usr/bin/env python3
"""
Database seeding script for SmartSwitch IoT E-commerce
Creates initial users with different roles for testing and development
"""

import asyncio
import os
import sys
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from models import UserInDB, UserRole
from auth import AuthService

# Load environment variables
load_dotenv()

# MongoDB connection
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017/smartswitch_db")

# Default users to create
DEFAULT_USERS = [
    {
        "email": "superadmin@vallmark.com",
        "username": "superadmin",
        "password": "SuperAdmin123!",
        "full_name": "Super Administrator",
        "phone": "+1234567890",
        "role": UserRole.SUPER_ADMIN,
        "is_active": True,
        "email_verified": True
    },
    {
        "email": "admin@vallmark.com", 
        "username": "admin",
        "password": "Admin123!",
        "full_name": "System Administrator",
        "phone": "+1234567891",
        "role": UserRole.ADMIN,
        "is_active": True,
        "email_verified": True
    },
    {
        "email": "storeowner@vallmark.com",
        "username": "storeowner", 
        "password": "StoreOwner123!",
        "full_name": "Store Owner",
        "phone": "+1234567892",
        "role": UserRole.STORE_OWNER,
        "is_active": True,
        "email_verified": True
    },
    {
        "email": "storemanager@vallmark.com",
        "username": "storemanager",
        "password": "StoreManager123!",
        "full_name": "Store Manager", 
        "phone": "+1234567893",
        "role": UserRole.STORE_ADMIN,
        "is_active": True,
        "email_verified": True
    },
    {
        "email": "salesperson@vallmark.com",
        "username": "salesperson",
        "password": "Salesperson123!",
        "full_name": "Sales Person",
        "phone": "+1234567894", 
        "role": UserRole.SALESPERSON,
        "is_active": True,
        "email_verified": True
    },
    {
        "email": "salesmanager@vallmark.com",
        "username": "salesmanager",
        "password": "SalesManager123!",
        "full_name": "Sales Manager",
        "phone": "+1234567895",
        "role": UserRole.SALES_MANAGER,
        "is_active": True,
        "email_verified": True
    },
    {
        "email": "support@vallmark.com",
        "username": "support",
        "password": "Support123!",
        "full_name": "Support Executive", 
        "phone": "+1234567896",
        "role": UserRole.SUPPORT_EXECUTIVE,
        "is_active": True,
        "email_verified": True
    },
    {
        "email": "marketing@vallmark.com",
        "username": "marketing",
        "password": "Marketing123!",
        "full_name": "Marketing Manager",
        "phone": "+1234567897",
        "role": UserRole.MARKETING_MANAGER,
        "is_active": True,
        "email_verified": True
    },
    {
        "email": "customer@vallmark.com",
        "username": "customer",
        "password": "Customer123!",
        "full_name": "Test Customer",
        "phone": "+1234567898",
        "role": UserRole.CUSTOMER,
        "is_active": True,
        "email_verified": True
    }
]

class DatabaseSeeder:
    def __init__(self):
        self.client = None
        self.db = None
    
    async def connect(self):
        """Connect to MongoDB"""
        try:
            self.client = AsyncIOMotorClient(MONGO_URL)
            self.db = self.client.get_default_database()
            
            # Test connection
            await self.db.list_collection_names()
            print("✅ Connected to MongoDB successfully")
            return True
        except Exception as e:
            print(f"❌ Failed to connect to MongoDB: {e}")
            return False
    
    async def disconnect(self):
        """Disconnect from MongoDB"""
        if self.client:
            self.client.close()
            print("✅ Disconnected from MongoDB")
    
    async def user_exists(self, email: str, username: str) -> bool:
        """Check if user already exists"""
        existing_email = await self.db.users.find_one({"email": email})
        existing_username = await self.db.users.find_one({"username": username})
        return existing_email is not None or existing_username is not None
    
    async def create_user(self, user_data: dict) -> bool:
        """Create a single user"""
        try:
            # Check if user already exists
            if await self.user_exists(user_data["email"], user_data["username"]):
                print(f"⚠️  User {user_data['username']} ({user_data['email']}) already exists, skipping...")
                return False
            
            # Encrypt sensitive data
            if user_data.get("phone"):
                user_data["phone"] = AuthService.encrypt_sensitive_data(user_data["phone"])
            
            # Hash password
            user_data["password_hash"] = AuthService.hash_password(user_data.pop("password"))
            
            # Create user document
            user = UserInDB(**user_data)
            user_dict = user.dict()
            
            # Insert into database
            await self.db.users.insert_one(user_dict)
            print(f"✅ Created user: {user.username} ({user.email}) - Role: {user.role}")
            return True
            
        except Exception as e:
            print(f"❌ Failed to create user {user_data.get('username', 'unknown')}: {e}")
            return False
    
    async def seed_users(self):
        """Seed all default users"""
        print("\n🌱 Starting user seeding process...")
        print("=" * 50)
        
        created_count = 0
        skipped_count = 0
        
        for user_data in DEFAULT_USERS:
            success = await self.create_user(user_data.copy())
            if success:
                created_count += 1
            else:
                skipped_count += 1
        
        print("=" * 50)
        print(f"🎉 Seeding completed!")
        print(f"   Created: {created_count} users")
        print(f"   Skipped: {skipped_count} users (already existed)")
        print(f"   Total: {len(DEFAULT_USERS)} users processed")
        
        # Return counts for logging
        return created_count, skipped_count
    
    async def display_login_credentials(self):
        """Display login credentials for all created users"""
        print("\n🔑 LOGIN CREDENTIALS")
        print("=" * 60)
        print("Use these credentials to login with different roles:")
        print()
        
        for user_data in DEFAULT_USERS:
            # Skip showing the password for users that already existed
            if not await self.user_exists(user_data["email"], user_data["username"]):
                continue
                
            print(f"👤 {user_data['role'].upper()} ACCESS:")
            print(f"   Email/Username: {user_data['email']} or {user_data['username']}")
            print(f"   Password: {user_data['password']}")
            print(f"   Full Name: {user_data['full_name']}")
            print()
        
        print("=" * 60)
        print("💡 TIPS:")
        print("   1. Use either email or username to login")
        print("   2. All passwords follow the format: [Role]123!")
        print("   3. You can change passwords after first login")
        print("   4. Super Admin can manage all other users")
        print("   5. Admin can manage most users except Super Admin")
        print()
    
    async def create_indexes(self):
        """Create database indexes for better performance"""
        try:
            # Create indexes on users collection
            await self.db.users.create_index("email", unique=True)
            await self.db.users.create_index("username", unique=True)
            await self.db.users.create_index("role")
            await self.db.users.create_index("is_active") 
            
            print("✅ Created database indexes")
        except Exception as e:
            print(f"⚠️  Warning: Could not create indexes: {e}")
    
    async def run(self):
        """Run the complete seeding process"""
        print("🚀 SmartSwitch Database Seeding Script")
        print("=" * 50)
        
        # Connect to database
        if not await self.connect():
            return False
        
        try:
            # Create indexes
            await self.create_indexes()
            
            # Seed users
            await self.seed_users()
            
            # Display credentials
            await self.display_login_credentials()
            
            return True
            
        finally:
            await self.disconnect()

async def main():
    """Main function"""
    seeder = DatabaseSeeder()
    success = await seeder.run()
    
    if success:
        print("🎊 Database seeding completed successfully!")
        print("   You can now login with the credentials shown above.")
    else:
        print("💥 Database seeding failed!")
        sys.exit(1)

if __name__ == "__main__":
    # Run the seeding script
    asyncio.run(main())