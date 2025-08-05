#!/usr/bin/env python3
"""
Enhanced Database seeding script for Vallmark Gift Articles E-commerce Platform
Creates comprehensive initial users with different roles for production-ready testing
Version: 2.0 - Updated with enhanced security and additional user types
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
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017/vallmark_db")

# Enhanced default users to create with production-ready scenarios
DEFAULT_USERS = [
    {
        "email": "superadmin@vallmark.com",
        "username": "superadmin",
        "password": "SuperAdmin2024!",
        "full_name": "System Super Administrator",
        "phone": "+1-555-000-0001",
        "role": UserRole.SUPER_ADMIN,
        "is_active": True,
        "email_verified": True
    },
    {
        "email": "admin@vallmark.com", 
        "username": "admin",
        "password": "Admin2024!",
        "full_name": "System Administrator",
        "phone": "+1-555-000-0002",
        "role": UserRole.ADMIN,
        "is_active": True,
        "email_verified": True
    },
    {
        "email": "owner@vallmark.com",
        "username": "storeowner", 
        "password": "StoreOwner2024!",
        "full_name": "Store Owner - John Smith",
        "phone": "+1-555-000-0003",
        "role": UserRole.STORE_OWNER,
        "is_active": True,
        "email_verified": True
    },
    {
        "email": "manager@vallmark.com",
        "username": "storemanager",
        "password": "StoreManager2024!",
        "full_name": "Store Manager - Jane Doe", 
        "phone": "+1-555-000-0004",
        "role": UserRole.STORE_ADMIN,
        "is_active": True,
        "email_verified": True,
        "store_owner_id": None  # Will be set to store owner's ID after creation
    },
    {
        "email": "sales@vallmark.com",
        "username": "salesperson",
        "password": "Sales2024!",
        "full_name": "Sales Person - Alice Johnson",
        "phone": "+1-555-000-0005", 
        "role": UserRole.SALESPERSON,
        "is_active": True,
        "email_verified": True,
        "store_owner_id": None  # Will be set to store owner's ID after creation
    },
    {
        "email": "sales2@vallmark.com",
        "username": "salesperson2",
        "password": "Sales2024!",
        "full_name": "Sales Person - Bob Wilson",
        "phone": "+1-555-000-0006",
        "role": UserRole.SALESPERSON,
        "is_active": True,
        "email_verified": True,
        "store_owner_id": None  # Will be set to store owner's ID after creation
    },
    {
        "email": "salesmanager@vallmark.com",
        "username": "salesmanager",
        "password": "SalesManager2024!",
        "full_name": "Sales Manager - Carol Davis",
        "phone": "+1-555-000-0007",
        "role": UserRole.SALES_MANAGER,
        "is_active": True,
        "email_verified": True
    },
    {
        "email": "support@vallmark.com",
        "username": "support",
        "password": "Support2024!",
        "full_name": "Support Executive - David Brown", 
        "phone": "+1-555-000-0008",
        "role": UserRole.SUPPORT_EXECUTIVE,
        "is_active": True,
        "email_verified": True
    },
    {
        "email": "marketing@vallmark.com",
        "username": "marketing",
        "password": "Marketing2024!",
        "full_name": "Marketing Manager - Eva Green",
        "phone": "+1-555-000-0009",
        "role": UserRole.MARKETING_MANAGER,
        "is_active": True,
        "email_verified": True
    },
    {
        "email": "customer@vallmark.com",
        "username": "customer",
        "password": "Customer2024!",
        "full_name": "Test Customer - Frank Miller",
        "phone": "+1-555-000-0010",
        "role": UserRole.CUSTOMER,
        "is_active": True,
        "email_verified": True
    },
    # Additional test customers for realistic data
    {
        "email": "customer2@vallmark.com",
        "username": "customer2",
        "password": "Customer2024!",
        "full_name": "Premium Customer - Grace Lee",
        "phone": "+1-555-000-0011",
        "role": UserRole.CUSTOMER,
        "is_active": True,
        "email_verified": True
    },
    {
        "email": "customer3@vallmark.com",
        "username": "customer3",
        "password": "Customer2024!",
        "full_name": "VIP Customer - Henry Taylor",
        "phone": "+1-555-000-0012",
        "role": UserRole.CUSTOMER,
        "is_active": True,
        "email_verified": True
    }
]

class DatabaseSeeder:
    def __init__(self):
        self.client = None
        self.db = None
        self.created_users = {}  # Track created users for relationship building
    
    async def connect(self):
        """Connect to MongoDB with enhanced error handling"""
        try:
            self.client = AsyncIOMotorClient(
                MONGO_URL,
                serverSelectionTimeoutMS=5000,  # 5 second timeout
                connectTimeoutMS=10000,         # 10 second connection timeout
                maxPoolSize=10                  # Limit connection pool
            )
            self.db = self.client.get_default_database()
            
            # Test connection with ping
            await self.client.admin.command('ping')
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
        """Check if user already exists by email or username"""
        existing_email = await self.db.users.find_one({"email": email})
        existing_username = await self.db.users.find_one({"username": username})
        return existing_email is not None or existing_username is not None
    
    async def create_user(self, user_data: dict) -> dict:
        """Create a single user and return user info"""
        try:
            # Check if user already exists
            if await self.user_exists(user_data["email"], user_data["username"]):
                print(f"⚠️  User {user_data['username']} ({user_data['email']}) already exists, skipping...")
                # Return existing user for relationship building
                existing_user = await self.db.users.find_one({
                    "$or": [
                        {"email": user_data["email"]},
                        {"username": user_data["username"]}
                    ]
                })
                return existing_user
            
            # Create a copy to avoid modifying original data
            user_data_copy = user_data.copy()
            
            # Encrypt sensitive data
            if user_data_copy.get("phone"):
                user_data_copy["phone"] = AuthService.encrypt_sensitive_data(user_data_copy["phone"])
            
            # Hash password
            user_data_copy["password_hash"] = AuthService.hash_password(user_data_copy.pop("password"))
            
            # Create user document
            user = UserInDB(**user_data_copy)
            user_dict = user.dict()
            
            # Insert into database
            await self.db.users.insert_one(user_dict)
            print(f"✅ Created user: {user.username} ({user.email}) - Role: {user.role}")
            
            return user_dict
            
        except Exception as e:
            print(f"❌ Failed to create user {user_data.get('username', 'unknown')}: {e}")
            return None
    
    async def build_user_relationships(self):
        """Build relationships between users (store_owner_id assignments)"""
        try:
            print("\n🔗 Building user relationships...")
            
            # Find store owner
            store_owner = await self.db.users.find_one({"role": "store_owner"})
            if not store_owner:
                print("⚠️  No store owner found, skipping relationship building")
                return
            
            store_owner_id = store_owner["id"]
            
            # Update salespeople to belong to the store owner
            salesperson_roles = ["salesperson", "store_admin"]
            result = await self.db.users.update_many(
                {"role": {"$in": salesperson_roles}},
                {"$set": {"store_owner_id": store_owner_id, "updated_at": datetime.utcnow()}}
            )
            
            if result.modified_count > 0:
                print(f"✅ Assigned {result.modified_count} users to store owner")
            
        except Exception as e:
            print(f"❌ Failed to build user relationships: {e}")
    
    async def seed_users(self):
        """Seed all default users with enhanced process"""
        print("\n🌱 Starting enhanced user seeding process...")
        print("=" * 60)
        
        created_count = 0
        skipped_count = 0
        
        for user_data in DEFAULT_USERS:
            user_result = await self.create_user(user_data.copy())
            if user_result and "password_hash" in user_result:  # New user created
                created_count += 1
                self.created_users[user_data["role"]] = user_result
            else:
                skipped_count += 1
        
        # Build relationships between users
        await self.build_user_relationships()
        
        print("=" * 60)
        print(f"🎉 Enhanced seeding completed!")
        print(f"   Created: {created_count} users")
        print(f"   Skipped: {skipped_count} users (already existed)")
        print(f"   Total: {len(DEFAULT_USERS)} users processed")
        print(f"   Relationships: Store owner assignments completed")
        
        return created_count, skipped_count
    
    async def seed_sample_data(self):
        """Seed additional sample data for development"""
        try:
            print("\n📊 Seeding sample data...")
            
            # Create sample categories
            sample_categories = [
                {
                    "id": "cat_home_decor",
                    "name": "Home Decor",
                    "description": "Beautiful decorative items for your home",
                    "slug": "home-decor",
                    "is_active": True,
                    "sort_order": 1,
                    "product_count": 0,
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                },
                {
                    "id": "cat_personalized_gifts", 
                    "name": "Personalized Gifts",
                    "description": "Custom gifts for special occasions",
                    "slug": "personalized-gifts",
                    "is_active": True,
                    "sort_order": 2,
                    "product_count": 0,
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
            ]
            
            for category in sample_categories:
                existing = await self.db.categories.find_one({"slug": category["slug"]})
                if not existing:
                    await self.db.categories.insert_one(category)
                    print(f"✅ Created category: {category['name']}")
            
            print("✅ Sample data seeding completed")
            
        except Exception as e:
            print(f"❌ Failed to seed sample data: {e}")
    
    async def display_login_credentials(self):
        """Display comprehensive login credentials with enhanced formatting"""
        print("\n🔑 PRODUCTION-READY LOGIN CREDENTIALS")
        print("=" * 80)
        print("Use these credentials to access different system roles:")
        print()
        
        # Group users by role type for better organization
        role_groups = {
            "SYSTEM ADMINISTRATION": ["super_admin", "admin"],
            "STORE MANAGEMENT": ["store_owner", "store_admin", "sales_manager"],
            "SALES TEAM": ["salesperson"],
            "SUPPORT & MARKETING": ["support_executive", "marketing_manager"], 
            "CUSTOMERS": ["customer"]
        }
        
        for group_name, roles in role_groups.items():
            print(f"📋 {group_name}")
            print("-" * 40)
            
            for user_data in DEFAULT_USERS:
                if user_data["role"].value in roles:
                    print(f"👤 {user_data['role'].value.upper().replace('_', ' ')} ACCESS:")
                    print(f"   Name: {user_data['full_name']}")
                    print(f"   Email: {user_data['email']}")
                    print(f"   Username: {user_data['username']}")
                    print(f"   Password: {user_data['password']}")
                    print()
            print()
        
        print("=" * 80)
        print("🛡️  SECURITY RECOMMENDATIONS:")
        print("   1. Change ALL passwords immediately in production")
        print("   2. Enable 2FA for admin accounts")
        print("   3. Review and restrict IP access")
        print("   4. Monitor login attempts and activities")
        print("   5. Set up account lockout policies")
        print()
        print("📈 ROLE CAPABILITIES:")
        print("   • Super Admin: Full system control")
        print("   • Admin: User and system management")
        print("   • Store Owner: Business operations oversight")
        print("   • Sales Manager: Team and performance management")
        print("   • Salesperson: Product and customer management")
        print("   • Support: Customer service and inquiries")
        print("   • Marketing: Campaigns and promotions")
        print("   • Customer: Shopping and account management")
        print()
    
    async def create_indexes(self):
        """Create comprehensive database indexes for optimal performance"""
        try:
            print("\n📊 Creating database indexes for optimal performance...")
            
            # Users collection indexes
            await self.db.users.create_index("email", unique=True)
            await self.db.users.create_index("username", unique=True)
            await self.db.users.create_index([("role", 1), ("is_active", 1)])
            await self.db.users.create_index("store_owner_id")
            await self.db.users.create_index("created_at")
            
            # Products collection indexes (for future use)
            await self.db.products.create_index("sku", unique=True)
            await self.db.products.create_index([("is_active", 1), ("category", 1)])
            await self.db.products.create_index("assigned_to")
            await self.db.products.create_index("uploaded_by")
            await self.db.products.create_index([("name", "text"), ("description", "text")])
            
            # Orders collection indexes (for future use)
            await self.db.orders.create_index("user_id")
            await self.db.orders.create_index("order_number", unique=True)
            await self.db.orders.create_index([("status", 1), ("created_at", -1)])
            
            # Categories collection indexes
            await self.db.categories.create_index("slug", unique=True)
            await self.db.categories.create_index([("is_active", 1), ("sort_order", 1)])
            
            # Commission-related indexes (for future use)
            await self.db.commission_earnings.create_index([("user_id", 1), ("status", 1)])
            await self.db.commission_earnings.create_index("product_id")
            await self.db.commission_earnings.create_index("order_id")
            
            print("✅ Database indexes created successfully")
            
        except Exception as e:
            print(f"⚠️  Warning: Could not create some indexes: {e}")
    
    async def verify_setup(self):
        """Verify the database setup is correct"""
        try:
            print("\n🔍 Verifying database setup...")
            
            # Count users by role
            user_counts = {}
            for role in UserRole:
                count = await self.db.users.count_documents({"role": role.value})
                user_counts[role.value] = count
            
            print("📊 User count by role:")
            for role, count in user_counts.items():
                print(f"   {role.replace('_', ' ').title()}: {count}")
            
            # Verify relationships
            salespeople_with_owner = await self.db.users.count_documents({
                "role": {"$in": ["salesperson", "store_admin"]},
                "store_owner_id": {"$ne": None}
            })
            print(f"   Salespeople assigned to store owner: {salespeople_with_owner}")
            
            # Check indexes
            indexes = await self.db.users.index_information()
            print(f"   Database indexes created: {len(indexes)}")
            
            print("✅ Database verification completed")
            
        except Exception as e:
            print(f"❌ Database verification failed: {e}")
    
    async def run(self):
        """Run the complete enhanced seeding process"""
        print("🚀 Vallmark Gift Articles - Enhanced Database Seeding v2.0")
        print("=" * 80)
        
        # Connect to database
        if not await self.connect():
            return False
        
        try:
            # Create indexes first for optimal performance
            await self.create_indexes()
            
            # Seed users
            await self.seed_users()
            
            # Seed additional sample data
            await self.seed_sample_data()
            
            # Verify setup
            await self.verify_setup()
            
            # Display credentials
            await self.display_login_credentials()
            
            return True
            
        finally:
            await self.disconnect()

async def main():
    """Main function with enhanced error handling"""
    seeder = DatabaseSeeder()
    
    try:
        success = await seeder.run()
        
        if success:
            print("🎊 Enhanced database seeding completed successfully!")
            print("   Your Vallmark Gift Articles platform is ready for testing.")
            print("   Remember to change default passwords in production!")
        else:
            print("💥 Enhanced database seeding failed!")
            sys.exit(1)
            
    except KeyboardInterrupt:
        print("\n⚠️  Seeding interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"💥 Unexpected error during seeding: {e}")
        sys.exit(1)

if __name__ == "__main__":
    # Run the enhanced seeding script
    asyncio.run(main())