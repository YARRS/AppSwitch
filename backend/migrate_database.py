#!/usr/bin/env python3
"""
Database Migration Script for AppSwitch
This script migrates existing MongoDB data to be compatible with updated models.
"""

import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from datetime import datetime
from timezone_utils import now_ist

# Load environment variables
load_dotenv()

async def migrate_database():
    """Main migration function"""
    MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017/vallmark_db')
    client = AsyncIOMotorClient(MONGO_URL)
    db = client.vallmark_db
    
    print("🚀 Starting database migration...")
    print(f"📍 Connected to: {MONGO_URL}")
    
    # Migration tasks
    await migrate_products(db)
    await migrate_users(db)
    await create_new_collections(db)
    await migrate_orders(db)
    
    print("✅ Database migration completed successfully!")
    print("\n📊 Updated Collections Summary:")
    
    # Show final counts
    collections = await db.list_collection_names()
    for collection in sorted(collections):
        count = await db[collection].count_documents({})
        print(f"  - {collection}: {count} documents")

async def migrate_products(db):
    """Migrate products collection with new fields"""
    print("\n📦 Migrating products collection...")
    
    products_collection = db.products
    products = await products_collection.find({}).to_list(None)
    
    updated_count = 0
    for product in products:
        updates = {}
        
        # Add new tax-related fields if missing
        if 'hidden_tax_category' not in product:
            # Default to standard gifts for existing products
            updates['hidden_tax_category'] = 'standard_gifts'
        
        if 'tax_calculation_type' not in product:
            updates['tax_calculation_type'] = 'exclusive'
        
        # Add new salesman assignment fields if missing
        if 'uploaded_by' not in product:
            updates['uploaded_by'] = None
            
        if 'assigned_to' not in product:
            updates['assigned_to'] = None
            
        if 'assigned_by' not in product:
            updates['assigned_by'] = None
            
        if 'last_updated_by' not in product:
            updates['last_updated_by'] = None
            
        if 'assignment_history' not in product:
            updates['assignment_history'] = []
            
        if 'total_earnings' not in product:
            updates['total_earnings'] = 0.0
            
        if 'last_sale_date' not in product:
            updates['last_sale_date'] = None
        
        # Update the document if there are changes
        if updates:
            await products_collection.update_one(
                {'_id': product['_id']},
                {'$set': updates}
            )
            updated_count += 1
    
    print(f"  ✅ Updated {updated_count} products with new fields")

async def migrate_users(db):
    """Migrate users collection with new fields"""
    print("\n👥 Migrating users collection...")
    
    users_collection = db.users
    users = await users_collection.find({}).to_list(None)
    
    updated_count = 0
    for user in users:
        updates = {}
        
        # Add new user fields if missing
        if 'store_owner_id' not in user:
            updates['store_owner_id'] = None
            
        if 'needs_password_setup' not in user:
            updates['needs_password_setup'] = False
        
        # Update the document if there are changes
        if updates:
            await users_collection.update_one(
                {'_id': user['_id']},
                {'$set': updates}
            )
            updated_count += 1
    
    print(f"  ✅ Updated {updated_count} users with new fields")

async def migrate_orders(db):
    """Migrate orders collection to include tax breakdown fields"""
    print("\n📋 Migrating orders collection...")
    
    orders_collection = db.orders
    orders = await orders_collection.find({}).to_list(None)
    
    updated_count = 0
    for order in orders:
        updates = {}
        
        # Add tax breakdown fields if missing
        if 'tax_breakdown' not in order:
            # Create basic tax breakdown from existing tax_amount
            tax_amount = order.get('tax_amount', 0.0)
            updates['tax_breakdown'] = {
                'total_tax': tax_amount,
                'cgst': tax_amount / 2 if tax_amount > 0 else 0.0,
                'sgst': tax_amount / 2 if tax_amount > 0 else 0.0,
                'igst': 0.0,
                'tax_type': 'cgst_sgst'
            }
        
        if 'commission_data' not in order:
            updates['commission_data'] = {
                'total_commission': 0.0,
                'commission_breakdown': []
            }
        
        # Update the document if there are changes
        if updates:
            await orders_collection.update_one(
                {'_id': order['_id']},
                {'$set': updates}
            )
            updated_count += 1
    
    print(f"  ✅ Updated {updated_count} orders with tax breakdown")

async def create_new_collections(db):
    """Create new collections for enhanced features"""
    print("\n🆕 Creating new collections...")
    
    # List of new collections to create with initial documents
    new_collections = {
        'tax_slabs': [],
        'tax_configurations': [],
        'commission_rules': [],
        'commission_earnings': [],
        'product_assignments': [],
        'campaigns': [],
        'inquiries': [],
        'inventory_logs': []
    }
    
    existing_collections = await db.list_collection_names()
    
    for collection_name, initial_docs in new_collections.items():
        if collection_name not in existing_collections:
            # Create collection
            collection = db[collection_name]
            
            # Insert initial documents if any
            if initial_docs:
                await collection.insert_many(initial_docs)
                print(f"  ✅ Created {collection_name} with {len(initial_docs)} documents")
            else:
                # Just create the collection by inserting and removing a dummy document
                await collection.insert_one({'_temp': True})
                await collection.delete_one({'_temp': True})
                print(f"  ✅ Created empty {collection_name} collection")
        else:
            print(f"  ⏭️  Collection {collection_name} already exists")

async def create_default_tax_slabs(db):
    """Create default tax slabs for Indian GST"""
    print("\n💰 Creating default tax slabs...")
    
    tax_slabs_collection = db.tax_slabs
    
    # Check if tax slabs already exist
    existing_count = await tax_slabs_collection.count_documents({})
    if existing_count > 0:
        print(f"  ⏭️  Tax slabs already exist ({existing_count} documents)")
        return
    
    default_slabs = [
        {
            'id': 'luxury_gifts_slab',
            'category': 'luxury_gifts',
            'tax_rate': 18.0,
            'cgst_rate': 9.0,
            'sgst_rate': 9.0,
            'igst_rate': 18.0,
            'description': 'Luxury gifts, decorative items, premium personalized gifts',
            'is_active': True,
            'created_at': now_ist(),
            'updated_at': now_ist()
        },
        {
            'id': 'standard_gifts_slab',
            'category': 'standard_gifts',
            'tax_rate': 12.0,
            'cgst_rate': 6.0,
            'sgst_rate': 6.0,
            'igst_rate': 12.0,
            'description': 'Standard gifts, regular decorative items',
            'is_active': True,
            'created_at': now_ist(),
            'updated_at': now_ist()
        },
        {
            'id': 'eco_friendly_gifts_slab',
            'category': 'eco_friendly_gifts',
            'tax_rate': 5.0,
            'cgst_rate': 2.5,
            'sgst_rate': 2.5,
            'igst_rate': 5.0,
            'description': 'Eco-friendly gifts, sustainable products',
            'is_active': True,
            'created_at': now_ist(),
            'updated_at': now_ist()
        }
    ]
    
    await tax_slabs_collection.insert_many(default_slabs)
    print(f"  ✅ Created {len(default_slabs)} default tax slabs")

async def backup_database(db):
    """Create a backup before migration (optional)"""
    print("\n💾 Creating backup information...")
    
    backup_info = {
        'backup_date': now_ist(),
        'collections': {}
    }
    
    collections = await db.list_collection_names()
    for collection_name in collections:
        count = await db[collection_name].count_documents({})
        backup_info['collections'][collection_name] = count
    
    # Store backup info
    await db.migration_history.insert_one(backup_info)
    print(f"  ✅ Backup information stored")

if __name__ == "__main__":
    asyncio.run(migrate_database())
