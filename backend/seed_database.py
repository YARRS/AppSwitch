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
import uuid
import json

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from models import UserInDB, UserRole, ProductInDB, CategoryInDB
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

# Default categories to create
DEFAULT_CATEGORIES = [
    {
        "name": "Home Decor",
        "description": "Beautiful decorative items to enhance your living space",
        "slug": "home_decor",
        "is_active": True,
        "is_hidden": False,
        "sort_order": 1
    },
    {
        "name": "Personalized Gifts", 
        "description": "Unique gifts customized with personal touches",
        "slug": "personalized_gifts",
        "is_active": True,
        "is_hidden": False,
        "sort_order": 2
    },
    {
        "name": "Jewelry",
        "description": "Elegant jewelry pieces for special occasions",
        "slug": "jewelry",
        "is_active": True,
        "is_hidden": False,
        "sort_order": 3
    },
    {
        "name": "Keepsakes",
        "description": "Memorial items to preserve precious memories",
        "slug": "keepsakes",
        "is_active": True,
        "is_hidden": False,
        "sort_order": 4
    },
    {
        "name": "Special Occasions",
        "description": "Perfect gifts for birthdays, anniversaries, and celebrations",
        "slug": "special_occasions",
        "is_active": True,
        "is_hidden": False,
        "sort_order": 5
    },
    {
        "name": "Accessories",
        "description": "Stylish accessories to complete your look",
        "slug": "accessories", 
        "is_active": True,
        "is_hidden": False,
        "sort_order": 6
    }
]

# Default products to create
DEFAULT_PRODUCTS = [
    {
        "name": "Elegant Crystal Vase",
        "description": "A beautiful handcrafted crystal vase perfect for displaying flowers or as a decorative piece.",
        "categories": ["home_decor"],
        "price": 89.99,
        "discount_price": 74.99,
        "sku": "VL-CV001",
        "brand": "Vallmark",
        "specifications": {
            "material": "Crystal Glass",
            "height": "12 inches",
            "diameter": "6 inches",
            "weight": "2.5 lbs"
        },
        "features": ["Handcrafted", "Lead Crystal", "Gift Box Included", "Care Instructions Provided"],
        "is_active": True,
        "stock_quantity": 25,
        "min_stock_level": 5
    },
    {
        "name": "Personalized Photo Frame",
        "description": "Custom engraved wooden photo frame with your personal message or name.",
        "categories": ["personalized_gifts", "keepsakes"],
        "price": 34.99,
        "discount_price": 27.99,
        "sku": "VL-PF002",
        "brand": "Vallmark",
        "specifications": {
            "material": "Premium Oak Wood",
            "size": "8x10 inches",
            "frame_width": "2 inches",
            "backing": "MDF with easel stand"
        },
        "features": ["Laser Engraving", "Custom Text", "Multiple Font Options", "Protective Glass"],
        "is_active": True,
        "stock_quantity": 50,
        "min_stock_level": 10
    },
    {
        "name": "Sterling Silver Necklace",
        "description": "Delicate sterling silver necklace with a beautiful pendant, perfect for everyday wear.",
        "categories": ["jewelry", "accessories"],
        "price": 125.00,
        "discount_price": 99.99,
        "sku": "VL-SN003",
        "brand": "Vallmark",
        "specifications": {
            "material": "925 Sterling Silver",
            "chain_length": "18 inches",
            "pendant_size": "1 inch",
            "clasp_type": "Spring Ring"
        },
        "features": ["Hypoallergenic", "Tarnish Resistant", "Gift Box Included", "Certificate of Authenticity"],
        "is_active": True,
        "stock_quantity": 15,
        "min_stock_level": 3
    },
    {
        "name": "Luxury Scented Candle Set",
        "description": "Set of 3 premium soy wax candles with exotic fragrances in elegant glass holders.",
        "categories": ["home_decor", "special_occasions"],
        "price": 55.00,
        "discount_price": 45.00,
        "sku": "VL-CS004",
        "brand": "Vallmark",
        "specifications": {
            "material": "100% Soy Wax",
            "burn_time": "45 hours each",
            "fragrances": "Vanilla, Lavender, Sandalwood",
            "container": "Glass with wooden lid"
        },
        "features": ["Natural Soy Wax", "Lead-Free Wicks", "Reusable Containers", "Gift Ready"],
        "is_active": True,
        "stock_quantity": 30,
        "min_stock_level": 8
    },
    {
        "name": "Handcrafted Wooden Music Box",
        "description": "Beautiful handcrafted wooden music box that plays a soothing melody.",
        "categories": ["keepsakes", "personalized_gifts"],
        "price": 78.99,
        "discount_price": 65.99,
        "sku": "VL-MB005",
        "brand": "Vallmark",
        "specifications": {
            "material": "Mahogany Wood",
            "dimensions": "6x4x3 inches",
            "melody": "Für Elise",
            "mechanism": "Swiss Movement"
        },
        "features": ["Hand Carved", "Swiss Music Movement", "Velvet Interior", "Custom Engraving Available"],
        "is_active": True,
        "stock_quantity": 20,
        "min_stock_level": 5
    },
    {
        "name": "Designer Silk Scarf",
        "description": "Luxurious silk scarf with an exclusive pattern design, perfect accessory for any outfit.",
        "categories": ["accessories", "special_occasions"],
        "price": 95.00,
        "discount_price": 76.00,
        "sku": "VL-SS006",
        "brand": "Vallmark",
        "specifications": {
            "material": "100% Mulberry Silk",
            "size": "35x35 inches",
            "pattern": "Abstract Floral",
            "edge_finish": "Hand-rolled hem"
        },
        "features": ["Pure Silk", "Exclusive Design", "Hand-rolled Edges", "Premium Gift Box"],
        "is_active": True,
        "stock_quantity": 12,
        "min_stock_level": 3
    },
    {
        "name": "Ceramic Coffee Mug Set",
        "description": "Set of 2 premium ceramic coffee mugs with matching saucers, perfect for morning coffee.",
        "categories": ["home_decor"],
        "price": 42.99,
        "discount_price": 34.99,
        "sku": "VL-CM007",
        "brand": "Vallmark",
        "specifications": {
            "material": "Fine Bone China",
            "capacity": "12 oz each",
            "microwave_safe": "Yes",
            "dishwasher_safe": "Yes"
        },
        "features": ["Lead-Free Ceramic", "Heat Resistant", "Elegant Design", "Matching Saucers"],
        "is_active": True,
        "stock_quantity": 40,
        "min_stock_level": 10
    },
    {
        "name": "Memory Album",
        "description": "Beautiful leather-bound photo album perfect for preserving precious memories.",
        "categories": ["keepsakes", "personalized_gifts"],
        "price": 67.50,
        "discount_price": 54.00,
        "sku": "VL-MA008",
        "brand": "Vallmark",
        "specifications": {
            "material": "Genuine Leather Cover",
            "pages": "50 pages (100 photos)",
            "photo_size": "4x6 inches",
            "binding": "Ring binding"
        },
        "features": ["Acid-Free Pages", "Photo Corners Included", "Personalization Available", "Protective Sleeve"],
        "is_active": True,
        "stock_quantity": 28,
        "min_stock_level": 7
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
    
    async def category_exists(self, slug: str) -> bool:
        """Check if category already exists"""
        existing_category = await self.db.categories.find_one({"slug": slug})
        return existing_category is not None
    
    async def product_exists(self, sku: str) -> bool:
        """Check if product already exists"""
        existing_product = await self.db.products.find_one({"sku": sku})
        return existing_product is not None
    
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
            user_data["hashed_password"] = AuthService.hash_password(user_data.pop("password"))
            
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
    
    async def create_category(self, category_data: dict) -> bool:
        """Create a single category"""
        try:
            # Check if category already exists
            if await self.category_exists(category_data["slug"]):
                print(f"⚠️  Category {category_data['name']} ({category_data['slug']}) already exists, skipping...")
                return False
            
            # Create category document
            category = CategoryInDB(**category_data)
            category_dict = category.dict()
            
            # Insert into database
            await self.db.categories.insert_one(category_dict)
            print(f"✅ Created category: {category.name} ({category.slug})")
            return True
            
        except Exception as e:
            print(f"❌ Failed to create category {category_data.get('name', 'unknown')}: {e}")
            return False
    
    async def create_product(self, product_data: dict) -> bool:
        """Create a single product"""
        try:
            # Check if product already exists
            if await self.product_exists(product_data["sku"]):
                print(f"⚠️  Product {product_data['name']} ({product_data['sku']}) already exists, skipping...")
                return False
            
            # Create product document
            product = ProductInDB(**product_data)
            product_dict = product.dict()
            
            # Insert into database
            await self.db.products.insert_one(product_dict)
            print(f"✅ Created product: {product.name} ({product.sku}) - ${product.price}")
            return True
            
        except Exception as e:
            print(f"❌ Failed to create product {product_data.get('name', 'unknown')}: {e}")
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
        print(f"🎉 User seeding completed!")
        print(f"   Created: {created_count} users")
        print(f"   Skipped: {skipped_count} users (already existed)")
        print(f"   Total: {len(DEFAULT_USERS)} users processed")
        
        return created_count, skipped_count
    
    async def seed_categories(self):
        """Seed all default categories"""
        print("\n🏷️  Starting category seeding process...")
        print("=" * 50)
        
        created_count = 0
        skipped_count = 0
        
        for category_data in DEFAULT_CATEGORIES:
            success = await self.create_category(category_data.copy())
            if success:
                created_count += 1
            else:
                skipped_count += 1
        
        print("=" * 50)
        print(f"🎉 Category seeding completed!")
        print(f"   Created: {created_count} categories")
        print(f"   Skipped: {skipped_count} categories (already existed)")
        print(f"   Total: {len(DEFAULT_CATEGORIES)} categories processed")
        
        return created_count, skipped_count
    
    async def seed_products(self):
        """Seed all default products"""
        print("\n📦 Starting product seeding process...")
        print("=" * 50)
        
        created_count = 0
        skipped_count = 0
        
        for product_data in DEFAULT_PRODUCTS:
            success = await self.create_product(product_data.copy())
            if success:
                created_count += 1
            else:
                skipped_count += 1
        
        print("=" * 50)
        print(f"🎉 Product seeding completed!")
        print(f"   Created: {created_count} products")
        print(f"   Skipped: {skipped_count} products (already existed)")
        print(f"   Total: {len(DEFAULT_PRODUCTS)} products processed")
        
        return created_count, skipped_count
    
    async def display_login_credentials(self):
        """Display login credentials for all created users"""
        print("\n🔑 LOGIN CREDENTIALS")
        print("=" * 60)
        print("Use these credentials to login with different roles:")
        print()
        
        for user_data in DEFAULT_USERS:
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
    
    async def display_test_data_summary(self):
        """Display summary of test data available"""
        print("\n📊 TEST DATA SUMMARY")
        print("=" * 60)
        print(f"🏷️  Categories: {len(DEFAULT_CATEGORIES)} categories seeded")
        for cat in DEFAULT_CATEGORIES:
            print(f"   - {cat['name']} ({cat['slug']})")
        
        print(f"\n📦 Products: {len(DEFAULT_PRODUCTS)} products seeded")
        for prod in DEFAULT_PRODUCTS:
            price_str = f"${prod['discount_price']:.2f}" if prod.get('discount_price') else f"${prod['price']:.2f}"
            print(f"   - {prod['name']} ({prod['sku']}) - {price_str}")
        
        print(f"\n💰 CART TESTING:")
        print(f"   - All products have stock available for testing")
        print(f"   - Products range from $27.99 to $125.00")
        print(f"   - Multiple categories available for filtering")
        print(f"   - OTP for testing: 079254")
        print()
    
    async def create_indexes(self):
        """Create database indexes for better performance"""
        try:
            # Create indexes on users collection
            await self.db.users.create_index("email", unique=True)
            await self.db.users.create_index("username", unique=True)
            await self.db.users.create_index("role")
            await self.db.users.create_index("is_active")
            
            # Create indexes on categories collection
            await self.db.categories.create_index("slug", unique=True)
            await self.db.categories.create_index("is_active")
            await self.db.categories.create_index("sort_order")
            
            # Create indexes on products collection
            await self.db.products.create_index("sku", unique=True)
            await self.db.products.create_index("is_active")
            await self.db.products.create_index("categories")
            await self.db.products.create_index("price")
            await self.db.products.create_index([("name", "text"), ("description", "text")])
            
            print("✅ Created database indexes")
        except Exception as e:
            print(f"⚠️  Warning: Could not create indexes: {e}")
    
    async def run(self):
        """Run the complete seeding process"""
        print("🚀 Vallmark Gift Articles Database Seeding Script")
        print("=" * 50)
        
        # Connect to database
        if not await self.connect():
            return False
        
        try:
            # Create indexes
            await self.create_indexes()
            
            # Seed users
            await self.seed_users()
            
            # Seed categories
            await self.seed_categories()
            
            # Seed products
            await self.seed_products()
            
            # Display credentials
            await self.display_login_credentials()
            
            # Display test data summary
            await self.display_test_data_summary()
            
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
        print("   Cart and checkout flow is ready for testing!")
    else:
        print("💥 Database seeding failed!")
        sys.exit(1)

if __name__ == "__main__":
    # Run the seeding script
    asyncio.run(main())