# Database Migration Guide - AppSwitch

## ✅ Migration Completed Successfully!

Your MongoDB database has been successfully migrated to work with the updated class models and new tax route. Here's what was done and how to continue working with your existing data.

## 🔄 What Was Migrated

### 1. Products Collection (16 documents updated)
**New fields added:**
- `hidden_tax_category`: Set to "standard_gifts" (12% GST) for all existing products
- `tax_calculation_type`: Set to "exclusive" (tax added on top of price)
- `uploaded_by`: Set to null (can be updated when you know who uploaded each product)
- `assigned_to`: Set to null (can be assigned to salespeople later)
- `assigned_by`: Set to null 
- `last_updated_by`: Set to null
- `assignment_history`: Empty array (will track future assignments)
- `total_earnings`: Set to 0.0 (will track commission earnings)
- `last_sale_date`: Set to null (will update when products are sold)

### 2. Users Collection
**New fields added:**
- `store_owner_id`: Set to null (for linking salespeople to store owners)
- `needs_password_setup`: Set to false (existing users already have passwords)

### 3. Orders Collection (7 documents updated)
**New fields added:**
- `tax_breakdown`: Created from existing `tax_amount` field with CGST/SGST split
- `commission_data`: Empty structure ready for commission tracking

### 4. New Collections Created
- `tax_slabs`: GST tax rates for different product categories
- `tax_configurations`: For managing tax settings
- `commission_rules`: For defining commission structures
- `commission_earnings`: For tracking commission payments
- `product_assignments`: For tracking product-to-salesperson assignments
- `campaigns`: For marketing campaigns
- `inquiries`: For customer inquiries
- `inventory_logs`: For inventory tracking

### 5. Default Tax Slabs Created
- **Luxury Gifts**: 18% GST (9% CGST + 9% SGST)
- **Standard Gifts**: 12% GST (6% CGST + 6% SGST)  
- **Eco-Friendly Gifts**: 5% GST (2.5% CGST + 2.5% SGST)

## 🚀 How to Continue Development

### 1. Start Your Server
```bash
cd /home/ubuntu/Documents/AppSwitch/backend
source venv/bin/activate
python3 server.py
```

### 2. Update Existing Products (Optional)
You can now update your existing products with proper tax categories:

```python
# Example: Update a product's tax category
await db.products.update_one(
    {"sku": "PRODUCT-001"},
    {"$set": {
        "hidden_tax_category": "luxury_gifts",  # 18% GST
        "tax_calculation_type": "inclusive"     # Tax included in price
    }}
)
```

### 3. Use New Tax Route Features
Your new tax route (`/api/tax`) now supports:
- Tax calculation for products
- Managing tax slabs
- GST breakdown (CGST/SGST/IGST)
- Tax configuration management

### 4. Working with Existing Data

#### Products
All your existing 16 products now have:
- Default tax category: "standard_gifts" (12% GST)
- Default tax type: "exclusive" (tax added on top)
- Ready for salesperson assignment
- Commission tracking enabled

#### Orders  
All your existing 7 orders now have:
- Tax breakdown with CGST/SGST split
- Commission data structure ready
- Compatible with new tax calculations

#### Users
All your existing 10 users are:
- Compatible with new role-based features
- Ready for store owner-salesperson linking
- No password reset required

## 🔧 Available New Features

### 1. Enhanced Tax Management
```python
# Calculate tax for a product
POST /api/tax/calculate
{
    "product_id": "product_id_here",
    "quantity": 2,
    "customer_state": "Maharashtra"
}
```

### 2. Commission System
```python
# Create commission rule
POST /api/commissions/rules
{
    "rule_name": "Standard Salesperson Commission",
    "user_role": "salesperson", 
    "commission_type": "percentage",
    "commission_value": 5.0
}
```

### 3. Product Assignment
```python
# Assign product to salesperson
POST /api/products/{product_id}/assign
{
    "assigned_to": "salesperson_user_id",
    "reason": "manual_admin"
}
```

## 🛠 Development Commands

### Run Migration Again (if needed)
```bash
cd /home/ubuntu/Documents/AppSwitch/backend
source venv/bin/activate
python3 migrate_database.py
```

### Check Database Status
```bash
cd /home/ubuntu/Documents/AppSwitch/backend  
source venv/bin/activate
python3 -c "
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

async def check():
    client = AsyncIOMotorClient(os.getenv('MONGO_URL'))
    db = client.vallmark_db
    collections = await db.list_collection_names()
    for col in sorted(collections):
        count = await db[col].count_documents({})
        print(f'{col}: {count} documents')

asyncio.run(check())
"
```

### Backup Database (recommended)
```bash
mongodump --uri="your_mongodb_connection_string" --out=/path/to/backup
```

## ⚠️ Important Notes

1. **Existing Data Preserved**: All your original data is intact and working
2. **Backward Compatible**: Old API calls will continue to work
3. **Default Values**: New fields have sensible defaults
4. **Gradual Migration**: You can update specific products/users as needed
5. **Tax Calculations**: New tax system is active and ready to use

## 🧪 Test Your Setup

```bash
cd /home/ubuntu/Documents/AppSwitch/backend
source venv/bin/activate

# Test models import
python3 -c "from models import ProductInDB, TaxSlabInDB; print('✅ Models work!')"

# Test database connection
python3 -c "
import asyncio
from server import db

async def test():
    count = await db.products.count_documents({})
    print(f'✅ Database connected. Products: {count}')

asyncio.run(test())
"
```

## 🎯 Next Steps

1. **Update Product Categories**: Review and update tax categories for your products
2. **Set Up Commission Rules**: Create commission structures for your salespeople  
3. **Test Tax Calculations**: Use the new tax route to calculate GST
4. **Assign Products**: Start assigning products to salespeople
5. **Monitor Performance**: Use the new tracking features

Your database is now fully migrated and ready for the enhanced features! 🚀
