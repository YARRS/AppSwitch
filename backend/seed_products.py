#!/usr/bin/env python3
"""
Sample Products Seeder for Vallmark Gift Articles
Creates sample products with varied categories and timestamps for testing
"""

import asyncio
import os
from datetime import datetime, timedelta
import uuid
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class ProductSeeder:
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
    
    async def seed_products(self):
        """Seed sample products"""
        print("🌱 Starting product seeding...")
        
        # Sample product data with varied categories and dates
        products = [
            # Recent products (within 7 days) - should have golden border
            {
                "name": "Elegant Crystal Vase Set",
                "description": "Beautiful hand-crafted crystal vase set perfect for any home decor. Features intricate designs and premium crystal material.",
                "category": "home_decor", 
                "price": 149.99,
                "discount_price": 129.99,
                "sku": "CVS-001",
                "brand": "Vallmark",
                "stock_quantity": 25,
                "min_stock_level": 5,
                "is_active": True,
                "features": ["Hand-crafted crystal", "Elegant design", "Perfect for flowers", "Premium quality"],
                "specifications": {
                    "material": "Crystal",
                    "height": "12 inches",
                    "width": "6 inches",
                    "weight": "2.5 lbs"
                },
                "images": [],
                "videos": [],
                "views": 0,
                "sales_count": 0,
                "rating": 0.0,
                "review_count": 0,
                "created_at": datetime.utcnow() - timedelta(days=2),  # 2 days ago
                "updated_at": datetime.utcnow() - timedelta(days=2)
            },
            {
                "name": "Personalized Photo Frame Premium",
                "description": "Custom engraved wooden photo frame for cherished memories. Made from premium oak wood with personalized engraving options.",
                "category": "personalized_gifts",
                "price": 79.99,
                "sku": "PPF-002", 
                "brand": "Vallmark",
                "stock_quantity": 40,
                "min_stock_level": 8,
                "is_active": True,
                "features": ["Custom engraving", "Premium oak wood", "Multiple sizes", "Gift packaging"],
                "specifications": {
                    "material": "Oak Wood",
                    "sizes": "4x6, 5x7, 8x10 inches",
                    "finish": "Natural wood stain",
                    "engraving": "Laser engraved"
                },
                "images": [],
                "videos": [],
                "views": 0,
                "sales_count": 0,
                "rating": 0.0,
                "review_count": 0,
                "created_at": datetime.utcnow() - timedelta(days=5),  # 5 days ago
                "updated_at": datetime.utcnow() - timedelta(days=5)
            },
            {
                "name": "Sterling Silver Heart Pendant",
                "description": "Exquisite sterling silver heart pendant with intricate Celtic design. Perfect for special occasions and everyday wear.",
                "category": "jewelry",
                "price": 199.99,
                "discount_price": 179.99,
                "sku": "SSH-003",
                "brand": "Vallmark",
                "stock_quantity": 15,
                "min_stock_level": 3,
                "is_active": True,
                "features": ["Sterling silver", "Hypoallergenic", "Celtic design", "Gift box included"],
                "specifications": {
                    "material": "925 Sterling Silver",
                    "pendant_size": "1 inch",
                    "chain_length": "18 inches",
                    "weight": "0.5 oz"
                },
                "images": [],
                "videos": [],
                "views": 0,
                "sales_count": 0,
                "rating": 0.0,
                "review_count": 0,
                "created_at": datetime.utcnow() - timedelta(days=1),  # 1 day ago - NEW
                "updated_at": datetime.utcnow() - timedelta(days=1)
            },
            
            # Older products (more than 7 days) - normal appearance
            {
                "name": "Memory Box Deluxe Set",
                "description": "Beautiful keepsake box set for storing precious memories, photos, and mementos. Features multiple compartments and elegant design.",
                "category": "keepsakes",
                "price": 89.99,
                "sku": "MBD-004",
                "brand": "Vallmark", 
                "stock_quantity": 30,
                "min_stock_level": 6,
                "is_active": True,
                "features": ["Multiple compartments", "Velvet lining", "Lock and key", "Premium wood"],
                "specifications": {
                    "material": "Mahogany Wood",
                    "dimensions": "10x8x4 inches",
                    "compartments": "6 sections",
                    "lining": "Velvet"
                },
                "images": [],
                "videos": [],
                "views": 0,
                "sales_count": 0,
                "rating": 0.0,
                "review_count": 0,
                "created_at": datetime.utcnow() - timedelta(days=15),  # 15 days ago
                "updated_at": datetime.utcnow() - timedelta(days=15)
            },
            {
                "name": "Anniversary Wine Glass Set",
                "description": "Elegant pair of crystal wine glasses perfect for celebrating love and special anniversaries. Hand-blown crystal with gold rim.",
                "category": "special_occasions",
                "price": 124.99,
                "discount_price": 99.99,
                "sku": "AWG-005",
                "brand": "Vallmark",
                "stock_quantity": 20,
                "min_stock_level": 4,
                "is_active": True,
                "features": ["Hand-blown crystal", "Gold rim", "Dishwasher safe", "Gift packaging"],
                "specifications": {
                    "material": "Crystal Glass",
                    "capacity": "12 oz each",
                    "height": "9 inches",
                    "set_includes": "2 glasses + gift box"
                },
                "images": [],
                "videos": [],
                "views": 0,
                "sales_count": 0,
                "rating": 0.0,
                "review_count": 0,
                "created_at": datetime.utcnow() - timedelta(days=22),  # 22 days ago
                "updated_at": datetime.utcnow() - timedelta(days=22)
            },
            {
                "name": "Luxury Scented Candle Collection",
                "description": "Premium scented candle collection with 6 unique fragrances for relaxation and ambiance. Made with natural soy wax.",
                "category": "accessories",
                "price": 159.99,
                "sku": "LSC-006",
                "brand": "Vallmark",
                "stock_quantity": 35,
                "min_stock_level": 7,
                "is_active": True,
                "features": ["Natural soy wax", "6 unique scents", "Long burning", "Eco-friendly"],
                "specifications": {
                    "wax_type": "100% Soy Wax",
                    "burn_time": "40-50 hours each",
                    "candle_count": "6 candles",
                    "container": "Glass jars"
                },
                "images": [],
                "videos": [],
                "views": 0,
                "sales_count": 0,
                "rating": 0.0,
                "review_count": 0,
                "created_at": datetime.utcnow() - timedelta(days=10),  # 10 days ago
                "updated_at": datetime.utcnow() - timedelta(days=10)
            },
            
            # More new products for testing
            {
                "name": "Artisan Wooden Music Box",
                "description": "Handcrafted wooden music box with intricate carvings and beautiful melody. Perfect gift for music lovers and collectors.",
                "category": "keepsakes",
                "price": 199.99,
                "sku": "AWM-007",
                "brand": "Vallmark",
                "stock_quantity": 12,
                "min_stock_level": 2,
                "is_active": True,
                "features": ["Handcrafted wood", "Beautiful melody", "Intricate carvings", "Collector's item"],
                "specifications": {
                    "material": "Walnut Wood",
                    "melody": "Canon in D",
                    "dimensions": "8x6x4 inches",
                    "mechanism": "Swiss movement"
                },
                "images": [],
                "videos": [],
                "views": 0,
                "sales_count": 0,
                "rating": 0.0,
                "review_count": 0,
                "created_at": datetime.utcnow() - timedelta(days=3),  # 3 days ago - NEW
                "updated_at": datetime.utcnow() - timedelta(days=3)
            },
            {
                "name": "Rose Gold Watch Gift Set",
                "description": "Elegant rose gold watch with matching bracelet set. Perfect for special occasions and everyday elegance.",
                "category": "jewelry",
                "price": 299.99,
                "discount_price": 249.99,
                "sku": "RGW-008",
                "brand": "Vallmark",
                "stock_quantity": 8,
                "min_stock_level": 2,
                "is_active": True,
                "features": ["Rose gold plated", "Water resistant", "Matching bracelet", "Luxury gift box"],
                "specifications": {
                    "case_material": "Rose Gold Plated Steel",
                    "water_resistance": "50 meters",
                    "movement": "Quartz",
                    "warranty": "2 years"
                },
                "images": [],
                "videos": [],
                "views": 0,
                "sales_count": 0,
                "rating": 0.0,
                "review_count": 0,
                "created_at": datetime.utcnow() - timedelta(hours=6),  # 6 hours ago - NEW
                "updated_at": datetime.utcnow() - timedelta(hours=6)
            }
        ]
        
        # Add UUID and ensure all required fields
        for product in products:
            product["id"] = str(uuid.uuid4())
        
        # Insert products
        result = await self.db.products.insert_many(products)
        print(f"✅ Created {len(result.inserted_ids)} products")
        
        # Show summary
        total_products = await self.db.products.count_documents({})
        active_products = await self.db.products.count_documents({"is_active": True})
        new_products = await self.db.products.count_documents({
            "created_at": {"$gte": datetime.utcnow() - timedelta(days=7)}
        })
        
        print(f"📊 Database Summary:")
        print(f"   Total products: {total_products}")
        print(f"   Active products: {active_products}")
        print(f"   New products (within 7 days): {new_products}")
        
        return len(result.inserted_ids)
    
    async def close(self):
        """Close database connection"""
        if self.client:
            self.client.close()
            print("🔌 Database connection closed")

async def main():
    """Main seeding function"""
    seeder = ProductSeeder()
    
    try:
        await seeder.connect()
        
        # Check if products already exist
        existing_count = await seeder.db.products.count_documents({})
        if existing_count > 0:
            print(f"⚠️  Found {existing_count} existing products.")
            response = input("Do you want to clear existing products and reseed? (y/N): ")
            if response.lower() == 'y':
                await seeder.db.products.delete_many({})
                print("🗑️  Cleared existing products")
            else:
                print("ℹ️  Keeping existing products and adding new ones")
        
        # Seed products
        created_count = await seeder.seed_products()
        
        print(f"🎉 Seeding completed! Created {created_count} products")
        
    except Exception as e:
        print(f"❌ Seeding failed: {e}")
        raise
    finally:
        await seeder.close()

if __name__ == "__main__":
    asyncio.run(main())