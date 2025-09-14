#!/usr/bin/env python3
"""
Test script to verify MongoDB connection and database status
"""
import asyncio
import os
import sys
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

async def test_connection():
    """Test MongoDB connection and verify data"""
    print("🔍 Testing MongoDB Connection...")
    print("=" * 50)
    
    # Load environment variables
    load_dotenv()
    
    # Get MongoDB URL
    MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017/vallmark_db")
    print(f"📍 MongoDB URL: {MONGO_URL}")
    
    try:
        # Create client and connect
        print("\n⏳ Connecting to MongoDB...")
        client = AsyncIOMotorClient(MONGO_URL)
        db = client.vallmark_db
        
        # Test basic connection
        await client.admin.command('ping')
        print("✅ MongoDB connection successful!")
        
        # List all collections
        print("\n📂 Available collections:")
        collections = await db.list_collection_names()
        if collections:
            for collection in collections:
                count = await db[collection].count_documents({})
                print(f"   - {collection}: {count} documents")
        else:
            print("   No collections found")
        
        # Check products collection specifically
        print("\n🛍️ Products collection analysis:")
        products_count = await db.products.count_documents({})
        print(f"   Total products: {products_count}")
        
        if products_count == 0:
            print("   ⚠️ No products found in database!")
            print("   💡 You may need to run the seeding script:")
            print("       python seed_database.py")
        else:
            # Get sample products
            active_count = await db.products.count_documents({"is_active": True})
            print(f"   Active products: {active_count}")
            
            # Get first few products for preview
            sample_products = []
            async for product in db.products.find({}).limit(3):
                sample_products.append(product)
            
            print(f"\n📋 Sample products:")
            for i, product in enumerate(sample_products, 1):
                print(f"   {i}. {product.get('name', 'Unnamed')} - ${product.get('price', 0)}")
                print(f"      Category: {product.get('category', 'N/A')}")
                print(f"      Active: {product.get('is_active', False)}")
        
        # Check users collection for admin access
        print("\n👥 Users collection:")
        users_count = await db.users.count_documents({})
        print(f"   Total users: {users_count}")
        
        if users_count > 0:
            admin_count = await db.users.count_documents({"role": "superadmin"})
            print(f"   Admin users: {admin_count}")
        
        # Check categories
        print("\n📁 Categories collection:")
        categories_count = await db.categories.count_documents({})
        print(f"   Total categories: {categories_count}")
        
        print("\n✅ Database analysis complete!")
        return True
        
    except Exception as e:
        print(f"\n❌ Connection failed: {e}")
        print("\n🔧 Troubleshooting tips:")
        print("   1. Make sure MongoDB is running:")
        print("      sudo systemctl start mongod")
        print("      # or for macOS:")
        print("      brew services start mongodb-community")
        print("   2. Check if the database URL is correct in .env")
        print("   3. Verify MongoDB is accessible on the specified port")
        return False
        
    finally:
        if 'client' in locals():
            client.close()

if __name__ == "__main__":
    success = asyncio.run(test_connection())
    sys.exit(0 if success else 1)
