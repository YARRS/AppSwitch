#!/usr/bin/env python3
"""
Category Seeder for Vallmark Gift Articles
Creates initial categories for the ecommerce system
"""

import asyncio
import os
import uuid
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class CategorySeeder:
    def __init__(self):
        self.client = None
        self.db = None
    
    async def connect(self):
        """Connect to MongoDB"""
        mongo_url = os.getenv("MONGO_URL", "mongodb://localhost:27017/vallmark_db")
        print(f"🔗 Connecting to MongoDB: {mongo_url}")
        
        self.client = AsyncIOMotorClient(mongo_url)
        self.db = self.client.get_default_database()
        
        # Test connection
        await self.db.list_collection_names()
        print("✅ Connected to database successfully")
    
    async def seed_categories(self):
        """Seed initial categories"""
        print("🌱 Starting category seeding...")
        
        # Regular categories (visible to all)
        regular_categories = [
            {
                "name": "Home Decor",
                "description": "Beautiful decorative items for home styling and interior design",
                "slug": "home_decor",
                "is_active": True,
                "is_hidden": False,
                "is_seasonal": False,
                "sort_order": 1,
                "image": None
            },
            {
                "name": "Personalized Gifts",
                "description": "Customized gifts for special occasions and memorable moments",
                "slug": "personalized_gifts", 
                "is_active": True,
                "is_hidden": False,
                "is_seasonal": False,
                "sort_order": 2,
                "image": None
            },
            {
                "name": "Jewelry",
                "description": "Elegant jewelry pieces and accessories for every occasion",
                "slug": "jewelry",
                "is_active": True,
                "is_hidden": False,
                "is_seasonal": False,
                "sort_order": 3,
                "image": None
            },
            {
                "name": "Keepsakes",
                "description": "Memorable items to treasure forever and pass down through generations",
                "slug": "keepsakes",
                "is_active": True,
                "is_hidden": False,
                "is_seasonal": False,
                "sort_order": 4,
                "image": None
            },
            {
                "name": "Special Occasions",
                "description": "Perfect gifts for celebrations, anniversaries, and milestone events",
                "slug": "special_occasions",
                "is_active": True,
                "is_hidden": False,
                "is_seasonal": False,
                "sort_order": 5,
                "image": None
            },
            {
                "name": "Accessories",
                "description": "Stylish accessories and add-ons to complement your gifts",
                "slug": "accessories",
                "is_active": True,
                "is_hidden": False,
                "is_seasonal": False,
                "sort_order": 6,
                "image": None
            }
        ]
        
        # Hidden seasonal categories (only visible to admins)
        seasonal_categories = [
            {
                "name": "Winter Collection",
                "description": "Special winter themed items for holiday seasons and cold weather celebrations",
                "slug": "winter_collection",
                "is_active": True,
                "is_hidden": True,
                "is_seasonal": True,
                "seasonal_months": [11, 12, 1, 2],  # Nov, Dec, Jan, Feb
                "sort_order": 101,
                "image": None
            },
            {
                "name": "Summer Collection",
                "description": "Bright and vibrant items perfect for summer celebrations and outdoor events",
                "slug": "summer_collection",
                "is_active": True,
                "is_hidden": True,
                "is_seasonal": True,
                "seasonal_months": [4, 5, 6, 7],  # Apr, May, Jun, Jul
                "sort_order": 102,
                "image": None
            },
            {
                "name": "Spring Collection",
                "description": "Fresh and colorful items celebrating new beginnings and renewal",
                "slug": "spring_collection",
                "is_active": True,
                "is_hidden": True,
                "is_seasonal": True,
                "seasonal_months": [3, 4, 5],  # Mar, Apr, May
                "sort_order": 103,
                "image": None
            },
            {
                "name": "Autumn Collection",
                "description": "Warm and cozy items perfect for fall celebrations and harvest themes",
                "slug": "autumn_collection",
                "is_active": True,
                "is_hidden": True,
                "is_seasonal": True,
                "seasonal_months": [9, 10, 11],  # Sep, Oct, Nov
                "sort_order": 104,
                "image": None
            },
            {
                "name": "Festival Collection",
                "description": "Special items for major festivals like Diwali, Christmas, Eid, and more",
                "slug": "festival_collection",
                "is_active": True,
                "is_hidden": True,
                "is_seasonal": True,
                "seasonal_months": [10, 11, 12],  # Oct, Nov, Dec (main festival months)
                "sort_order": 105,
                "image": None
            },
            {
                "name": "Valentine Collection",
                "description": "Romantic gifts and love-themed items for Valentine's Day and anniversaries",
                "slug": "valentine_collection",
                "is_active": True,
                "is_hidden": True,
                "is_seasonal": True,
                "seasonal_months": [2],  # February
                "sort_order": 106,
                "image": None
            }
        ]
        
        # Combine all categories
        all_categories = regular_categories + seasonal_categories
        
        # Add UUID and timestamps
        for category in all_categories:
            category["id"] = str(uuid.uuid4())
            category["created_at"] = datetime.utcnow()
            category["updated_at"] = datetime.utcnow()
            category["product_count"] = 0
        
        # Check existing categories
        existing_count = await self.db.categories.count_documents({})
        if existing_count > 0:
            print(f"⚠️  Found {existing_count} existing categories.")
            response = input("Do you want to clear existing categories and reseed? (y/N): ")
            if response.lower() == 'y':
                await self.db.categories.delete_many({})
                print("🗑️  Cleared existing categories")
            else:
                print("ℹ️  Keeping existing categories and adding new ones")
                # Only add categories that don't exist
                existing_slugs = set()
                async for cat in self.db.categories.find({}, {"slug": 1}):
                    existing_slugs.add(cat["slug"])
                
                all_categories = [cat for cat in all_categories if cat["slug"] not in existing_slugs]
                print(f"ℹ️  Will add {len(all_categories)} new categories")
        
        if all_categories:
            # Insert categories
            result = await self.db.categories.insert_many(all_categories)
            print(f"✅ Created {len(result.inserted_ids)} categories")
        else:
            print("ℹ️  No new categories to add")
        
        # Show summary
        total_categories = await self.db.categories.count_documents({})
        regular_count = await self.db.categories.count_documents({"is_hidden": False})
        seasonal_count = await self.db.categories.count_documents({"is_seasonal": True})
        active_count = await self.db.categories.count_documents({"is_active": True})
        
        print(f"📊 Database Summary:")
        print(f"   Total categories: {total_categories}")
        print(f"   Regular categories: {regular_count}")
        print(f"   Seasonal categories: {seasonal_count}")
        print(f"   Active categories: {active_count}")
        
        return len(all_categories)
    
    async def close(self):
        """Close database connection"""
        if self.client:
            self.client.close()
            print("🔌 Database connection closed")

async def main():
    """Main seeding function"""
    seeder = CategorySeeder()
    
    try:
        await seeder.connect()
        
        # Seed categories
        created_count = await seeder.seed_categories()
        
        print(f"🎉 Category seeding completed! Created {created_count} categories")
        
    except Exception as e:
        print(f"❌ Seeding failed: {e}")
        raise
    finally:
        await seeder.close()

if __name__ == "__main__":
    asyncio.run(main())