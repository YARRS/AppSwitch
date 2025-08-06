#!/usr/bin/env python3
"""
Category seeding script for Vallmark ecommerce
Creates default categories including seasonal hidden categories
"""

import asyncio
import os
import sys
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from models import CategoryInDB

# Load environment variables
load_dotenv()

# MongoDB connection
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017/vallmark_db")

# Default categories to create
DEFAULT_CATEGORIES = [
    # Regular visible categories
    {
        "name": "Home Decor",
        "description": "Beautiful decorative items for your home including vases, frames, and ornaments",
        "slug": "home_decor",
        "is_active": True,
        "is_hidden": False,
        "is_seasonal": False,
        "sort_order": 1
    },
    {
        "name": "Personalized Gifts",
        "description": "Custom and personalized gift items for special occasions",
        "slug": "personalized_gifts", 
        "is_active": True,
        "is_hidden": False,
        "is_seasonal": False,
        "sort_order": 2
    },
    {
        "name": "Jewelry & Accessories",
        "description": "Elegant jewelry pieces and fashion accessories",
        "slug": "jewelry_accessories",
        "is_active": True,
        "is_hidden": False,
        "is_seasonal": False,
        "sort_order": 3
    },
    {
        "name": "Keepsakes & Memory Items",
        "description": "Special items to preserve and cherish memories",
        "slug": "keepsakes_memory",
        "is_active": True,
        "is_hidden": False,
        "is_seasonal": False,
        "sort_order": 4
    },
    {
        "name": "Special Occasions",
        "description": "Gift items perfect for birthdays, anniversaries, and celebrations",
        "slug": "special_occasions",
        "is_active": True,
        "is_hidden": False,
        "is_seasonal": False,
        "sort_order": 5
    },
    {
        "name": "Luxury Items",
        "description": "Premium and luxury gift articles for discerning tastes",
        "slug": "luxury_items",
        "is_active": True,
        "is_hidden": False,
        "is_seasonal": False,
        "sort_order": 6
    },
    {
        "name": "Corporate Gifts",
        "description": "Professional gift items suitable for business and corporate events",
        "slug": "corporate_gifts",
        "is_active": True,
        "is_hidden": False,
        "is_seasonal": False,
        "sort_order": 7
    },
    
    # Seasonal hidden categories (only visible to admins)
    {
        "name": "Valentine's Day Collection",
        "description": "Romantic gifts and decorations for Valentine's Day",
        "slug": "valentines_day",
        "is_active": True,
        "is_hidden": True,  # Hidden from regular users
        "is_seasonal": True,
        "seasonal_months": [2],  # February
        "sort_order": 101
    },
    {
        "name": "Christmas & Holiday",
        "description": "Christmas decorations, holiday gifts, and seasonal items",
        "slug": "christmas_holiday",
        "is_active": True,
        "is_hidden": True,
        "is_seasonal": True,
        "seasonal_months": [12, 1],  # December, January
        "sort_order": 102
    },
    {
        "name": "Summer Collection",
        "description": "Light, bright items perfect for summer celebrations",
        "slug": "summer_collection",
        "is_active": True,
        "is_hidden": True,
        "is_seasonal": True,
        "seasonal_months": [6, 7, 8],  # June, July, August
        "sort_order": 103
    },
    {
        "name": "Mother's Day Specials",
        "description": "Special gifts curated for Mother's Day celebrations",
        "slug": "mothers_day",
        "is_active": True,
        "is_hidden": True,
        "is_seasonal": True,
        "seasonal_months": [5],  # May
        "sort_order": 104
    },
    {
        "name": "Father's Day Collection",
        "description": "Thoughtful gifts for Father's Day celebrations", 
        "slug": "fathers_day",
        "is_active": True,
        "is_hidden": True,
        "is_seasonal": True,
        "seasonal_months": [6],  # June
        "sort_order": 105
    },
    {
        "name": "Wedding Season",
        "description": "Beautiful items perfect for wedding gifts and celebrations",
        "slug": "wedding_season",
        "is_active": True,
        "is_hidden": True,
        "is_seasonal": True,
        "seasonal_months": [4, 5, 6, 9, 10],  # April, May, June, September, October
        "sort_order": 106
    },
    {
        "name": "Back to School",
        "description": "Items suitable for back to school season and student gifts",
        "slug": "back_to_school",
        "is_active": True,
        "is_hidden": True,
        "is_seasonal": True,
        "seasonal_months": [8, 9],  # August, September
        "sort_order": 107
    },
    {
        "name": "Diwali & Festivals",
        "description": "Traditional and modern items for Diwali and festival celebrations",
        "slug": "diwali_festivals",
        "is_active": True,
        "is_hidden": True,
        "is_seasonal": True,
        "seasonal_months": [10, 11],  # October, November
        "sort_order": 108
    }
]

class CategorySeeder:
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
    
    async def category_exists(self, slug: str) -> bool:
        """Check if category already exists"""
        existing_category = await self.db.categories.find_one({"slug": slug})
        return existing_category is not None
    
    async def create_category(self, category_data: dict) -> bool:
        """Create a single category"""
        try:
            # Check if category already exists
            if await self.category_exists(category_data["slug"]):
                print(f"⚠️  Category '{category_data['name']}' already exists, skipping...")
                return False
            
            # Create category document
            category = CategoryInDB(**category_data)
            category_dict = category.dict()
            
            # Insert into database
            await self.db.categories.insert_one(category_dict)
            
            category_type = "Seasonal Hidden" if category_data.get("is_seasonal") and category_data.get("is_hidden") else "Regular"
            print(f"✅ Created {category_type} category: {category.name} ({category.slug})")
            return True
            
        except Exception as e:
            print(f"❌ Failed to create category {category_data.get('name', 'unknown')}: {e}")
            return False
    
    async def seed_categories(self):
        """Seed all default categories"""
        print("\n🌱 Starting category seeding process...")
        print("=" * 60)
        
        created_count = 0
        skipped_count = 0
        
        # Separate regular and seasonal categories for better display
        regular_categories = [cat for cat in DEFAULT_CATEGORIES if not cat.get("is_seasonal", False)]
        seasonal_categories = [cat for cat in DEFAULT_CATEGORIES if cat.get("is_seasonal", False)]
        
        print("📦 Creating Regular Categories:")
        for category_data in regular_categories:
            success = await self.create_category(category_data.copy())
            if success:
                created_count += 1
            else:
                skipped_count += 1
        
        print(f"\n🎭 Creating Seasonal Hidden Categories:")
        for category_data in seasonal_categories:
            success = await self.create_category(category_data.copy())
            if success:
                created_count += 1
            else:
                skipped_count += 1
        
        print("=" * 60)
        print(f"🎉 Category seeding completed!")
        print(f"   Created: {created_count} categories")
        print(f"   Skipped: {skipped_count} categories (already existed)")
        print(f"   Total: {len(DEFAULT_CATEGORIES)} categories processed")
        print(f"   Regular Categories: {len(regular_categories)}")
        print(f"   Seasonal Categories: {len(seasonal_categories)}")
        
        return created_count, skipped_count
    
    async def create_indexes(self):
        """Create database indexes for better performance"""
        try:
            # Create indexes on categories collection
            await self.db.categories.create_index("slug", unique=True)
            await self.db.categories.create_index("is_active")
            await self.db.categories.create_index("is_hidden") 
            await self.db.categories.create_index("is_seasonal")
            await self.db.categories.create_index("sort_order")
            
            print("✅ Created database indexes for categories")
        except Exception as e:
            print(f"⚠️  Warning: Could not create category indexes: {e}")
    
    async def display_category_summary(self):
        """Display summary of created categories"""
        print("\n📊 CATEGORY SUMMARY")
        print("=" * 60)
        print("Regular Categories (Visible to all users):")
        
        regular_categories = [cat for cat in DEFAULT_CATEGORIES if not cat.get("is_seasonal", False)]
        for i, cat in enumerate(regular_categories, 1):
            print(f"   {i}. {cat['name']} ({cat['slug']})")
        
        print(f"\nSeasonal Hidden Categories (Admin only):")
        seasonal_categories = [cat for cat in DEFAULT_CATEGORIES if cat.get("is_seasonal", False)]
        for i, cat in enumerate(seasonal_categories, 1):
            months = cat.get('seasonal_months', [])
            month_names = []
            month_mapping = {1: 'Jan', 2: 'Feb', 3: 'Mar', 4: 'Apr', 5: 'May', 6: 'Jun',
                           7: 'Jul', 8: 'Aug', 9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Dec'}
            for month in months:
                month_names.append(month_mapping.get(month, str(month)))
            
            print(f"   {i}. {cat['name']} ({cat['slug']}) - Active in: {', '.join(month_names)}")
        
        print("=" * 60)
        print("💡 USAGE NOTES:")
        print("   • Regular categories are visible to all users")
        print("   • Seasonal categories are hidden from regular users") 
        print("   • Admins can create campaigns targeting seasonal categories")
        print("   • Products can be assigned to multiple categories")
        print("   • Seasonal categories help with targeted promotions")
        print()
    
    async def run(self):
        """Run the complete category seeding process"""
        print("🚀 Vallmark Category Seeding Script")
        print("=" * 50)
        
        # Connect to database
        if not await self.connect():
            return False
        
        try:
            # Create indexes
            await self.create_indexes()
            
            # Seed categories
            await self.seed_categories()
            
            # Display summary
            await self.display_category_summary()
            
            return True
            
        finally:
            await self.disconnect()

async def main():
    """Main function"""
    seeder = CategorySeeder()
    success = await seeder.run()
    
    if success:
        print("🎊 Category seeding completed successfully!")
        print("   Categories are now available in admin dashboard and product creation.")
    else:
        print("💥 Category seeding failed!")
        sys.exit(1)

if __name__ == "__main__":
    # Run the seeding script
    asyncio.run(main())