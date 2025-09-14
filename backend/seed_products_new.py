#!/usr/bin/env python3
"""
Enhanced Products Seeder for Vallmark Gift Articles
Creates 27+ sample products with AI-generated images for thorough testing
"""

import asyncio
import os
import sys
from datetime import datetime, timedelta
import uuid
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from timezone_utils import now_ist

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from models import ProductInDB, HiddenTaxCategory, TaxCalculationType

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
        """Seed comprehensive product catalog with AI-generated images"""
        print("🌱 Starting product seeding...")
        
        # Comprehensive product data - 27+ products with AI-generated images
        products = [
            # Recent products (within 7 days) - should have golden border
            {
                "name": "Elegant Crystal Vase Set",
                "description": "Beautiful hand-crafted crystal vase set perfect for any home decor. Features intricate designs and premium crystal material.",
                "categories": ["home_decor", "luxury_items"],
                "price": 125.00,
                "sku": "CVS-001",
                "brand": "Vallmark",
                "stock_quantity": 25,
                "min_stock_level": 5,
                "is_active": True,
                "features": ["Hand-crafted", "Premium crystal", "Set of 2", "Gift packaging"],
                "specifications": {
                    "material": "Premium Crystal",
                    "height": "12 inches", 
                    "weight": "2.5 lbs",
                    "care": "Hand wash only"
                },
                "images": [
                    "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=500&q=80",
                    "https://images.unsplash.com/photo-1571115764595-644a1f56a55c?w=500&q=80"
                ],
                "videos": [],
                "views": 0,
                "sales_count": 0,
                "rating": 0.0,
                "review_count": 0,

                "created_at": now_ist(),
                "updated_at": now_ist()
            },
            
            {
                "name": "Modern Ceramic Planter Trio",
                "description": "Set of 3 modern ceramic planters in different sizes. Perfect for indoor plants and adding greenery to your space.",
                "categories": ["home_decor"],
                "price": 89.99,
                "sku": "MCP-002",
                "brand": "Vallmark",
                "stock_quantity": 18,
                "min_stock_level": 3,
                "is_active": True,
                "features": ["Drainage holes", "Set of 3 sizes", "Modern design", "Indoor/outdoor use"],
                "specifications": {
                    "material": "High-grade ceramic",
                    "sizes": "Large: 8\"H, Medium: 6\"H, Small: 4\"H",
                    "colors": "White, Sage Green, Terracotta"
                },
                "images": [
                    "https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=500&q=80",
                    "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=500&q=80"
                ],
                "videos": [],
                "views": 0,
                "sales_count": 0,
                "rating": 0.0,
                "review_count": 0,
                "hidden_tax_category": HiddenTaxCategory.STANDARD_GIFTS,
                "tax_calculation_type": TaxCalculationType.EXCLUSIVE,
                "created_at": now_ist() - timedelta(hours=12),
                "updated_at": now_ist() - timedelta(hours=12)
            },
            
            {
                "name": "Vintage Wall Mirror Collection",
                "description": "Elegant collection of 4 vintage-style mirrors with antique brass frames. Perfect for creating a stylish gallery wall.",
                "categories": ["home_decor", "luxury_items"],
                "price": 156.99,
                "sku": "VWM-003",
                "brand": "Vallmark",
                "stock_quantity": 12,
                "min_stock_level": 2,
                "is_active": True,
                "features": ["Set of 4", "Antique brass frames", "Beveled glass", "Gallery wall ready"],
                "specifications": {
                    "material": "Brass frames with beveled glass",
                    "sizes": "12\", 10\", 8\", 6\" diameter",
                    "finish": "Antique brass"
                },
                "images": [
                    "https://images.unsplash.com/photo-1618220179428-22790b461013?w=500&q=80",
                    "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=500&q=80"
                ],
                "videos": [],
                "views": 0,
                "sales_count": 0,
                "rating": 0.0,
                "review_count": 0,

                "created_at": now_ist() - timedelta(days=2),
                "updated_at": now_ist() - timedelta(days=2)
            },
            
            {
                "name": "Handwoven Boho Wall Tapestry",
                "description": "Large handwoven tapestry featuring geometric patterns. Made from natural cotton fibers with macrame details.",
                "categories": ["home_decor"],
                "price": 134.50,
                "sku": "HBT-004",
                "brand": "Vallmark",
                "stock_quantity": 8,
                "min_stock_level": 2,
                "is_active": True,
                "features": ["Handwoven", "Natural cotton", "Macrame details", "Bohemian style"],
                "specifications": {
                    "material": "100% Cotton with jute accents",
                    "size": "48\" W x 36\" H",
                    "care": "Spot clean only"
                },
                "images": [
                    "https://images.unsplash.com/photo-1604014237800-1c9102c219da?w=500&q=80",
                    "https://images.unsplash.com/photo-1534438097545-94b0dbfd5d4a?w=500&q=80"
                ],
                "videos": [],
                "views": 0,
                "sales_count": 0,
                "rating": 0.0,
                "review_count": 0,
                "hidden_tax_category": HiddenTaxCategory.STANDARD_GIFTS,
                "tax_calculation_type": TaxCalculationType.EXCLUSIVE,
                "created_at": now_ist() - timedelta(days=3),
                "updated_at": now_ist() - timedelta(days=3)
            },
            
            {
                "name": "Artisan Coffee Table Book Collection",
                "description": "Curated collection of 3 premium coffee table books covering art, photography, and design. Perfect for sophisticated decor.",
                "categories": ["home_decor", "luxury_items"],
                "price": 89.99,
                "sku": "CTB-005",
                "brand": "Vallmark",
                "stock_quantity": 15,
                "min_stock_level": 3,
                "is_active": True,
                "features": ["Set of 3 books", "Premium print quality", "Hardcover", "Art & design themes"],
                "specifications": {
                    "format": "Hardcover coffee table books",
                    "pages": "200+ pages each",
                    "size": "12\" x 10\"",
                    "topics": "Art, Photography, Interior Design"
                },
                "images": [
                    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&q=80",
                    "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=500&q=80"
                ],
                "videos": [],
                "views": 0,
                "sales_count": 0,
                "rating": 0.0,
                "review_count": 0,
                "hidden_tax_category": HiddenTaxCategory.STANDARD_GIFTS,
                "tax_calculation_type": TaxCalculationType.EXCLUSIVE,
                "created_at": now_ist() - timedelta(days=4),
                "updated_at": now_ist() - timedelta(days=4)
            },

            # Personalized Gifts
            {
                "name": "Custom Engraved Photo Frame",
                "description": "Elegant wooden photo frame with custom engraving options. Perfect for showcasing special memories with personal touch.",
                "categories": ["personalized_gifts", "keepsakes"],
                "price": 45.99,
                "sku": "CEP-006",
                "brand": "Vallmark",
                "stock_quantity": 30,
                "min_stock_level": 5,
                "is_active": True,
                "features": ["Custom engraving", "Premium wood", "Multiple sizes", "Gift ready"],
                "specifications": {
                    "material": "Solid oak wood",
                    "sizes": "5x7, 8x10, 11x14 inches",
                    "engraving": "Laser engraved text/designs"
                },
                "images": [
                    "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=500&q=80",
                    "https://images.unsplash.com/photo-1566737236500-c8ac43014a8e?w=500&q=80"
                ],
                "videos": [],
                "views": 0,
                "sales_count": 0,
                "rating": 0.0,
                "review_count": 0,
                "hidden_tax_category": HiddenTaxCategory.STANDARD_GIFTS,
                "tax_calculation_type": TaxCalculationType.EXCLUSIVE,
                "created_at": now_ist() - timedelta(days=5),
                "updated_at": now_ist() - timedelta(days=5)
            },
            
            {
                "name": "Personalized Leather Journal Set",
                "description": "Handcrafted leather journal with personalized embossing. Includes premium pen and gift box packaging.",
                "categories": ["personalized_gifts", "accessories"],
                "price": 67.99,
                "sku": "PLJ-007",
                "brand": "Vallmark",
                "stock_quantity": 20,
                "min_stock_level": 4,
                "is_active": True,
                "features": ["Genuine leather", "Custom embossing", "Includes pen", "Gift box"],
                "specifications": {
                    "material": "Full-grain leather",
                    "pages": "200 lined pages",
                    "size": "6\" x 8\"",
                    "pen": "Premium ballpoint included"
                },
                "images": [
                    "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500&q=80",
                    "https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=500&q=80"
                ],
                "videos": [],
                "views": 0,
                "sales_count": 0,
                "rating": 0.0,
                "review_count": 0,
                "hidden_tax_category": HiddenTaxCategory.STANDARD_GIFTS,
                "tax_calculation_type": TaxCalculationType.EXCLUSIVE,
                "created_at": now_ist() - timedelta(days=6),
                "updated_at": now_ist() - timedelta(days=6)
            },

            # Jewelry Collection
            {
                "name": "Sterling Silver Pendant Necklace",
                "description": "Elegant sterling silver pendant necklace with cubic zirconia stones. Perfect for special occasions or everyday elegance.",
                "categories": ["jewelry", "luxury_items"],
                "price": 129.99,
                "sku": "SSP-008",
                "brand": "Vallmark",
                "stock_quantity": 14,
                "min_stock_level": 3,
                "is_active": True,
                "features": ["Sterling silver", "Cubic zirconia", "Adjustable chain", "Gift packaging"],
                "specifications": {
                    "material": "925 Sterling Silver",
                    "stones": "Cubic Zirconia",
                    "chain_length": "18 inches adjustable",
                    "pendant_size": "0.75 inches"
                },
                "images": [
                    "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=500&q=80",
                    "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=500&q=80"
                ],
                "videos": [],
                "views": 0,
                "sales_count": 0,
                "rating": 0.0,
                "review_count": 0,

                "created_at": now_ist() - timedelta(days=7),
                "updated_at": now_ist() - timedelta(days=7)
            },
            
            # Additional products for thorough testing (older products)
            {
                "name": "Handmade Ceramic Dinner Set",
                "description": "Beautiful 16-piece handmade ceramic dinner set. Perfect for elegant dining and entertaining guests.",
                "categories": ["home_decor"],
                "price": 199.99,
                "sku": "HCD-009",
                "brand": "Vallmark",
                "stock_quantity": 10,
                "min_stock_level": 2,
                "is_active": True,
                "features": ["16-piece set", "Handmade ceramic", "Dishwasher safe", "Elegant design"],
                "specifications": {
                    "material": "High-quality ceramic",
                    "set_includes": "4 plates, 4 bowls, 4 cups, 4 saucers",
                    "care": "Dishwasher and microwave safe"
                },
                "images": [
                    "https://images.unsplash.com/photo-1566737236500-c8ac43014a8e?w=500&q=80",
                    "https://images.unsplash.com/photo-1571115764595-644a1f56a55c?w=500&q=80"
                ],
                "videos": [],
                "views": 0,
                "sales_count": 0,
                "rating": 0.0,
                "review_count": 0,
                "hidden_tax_category": HiddenTaxCategory.STANDARD_GIFTS,
                "tax_calculation_type": TaxCalculationType.EXCLUSIVE,
                "created_at": now_ist() - timedelta(days=10),
                "updated_at": now_ist() - timedelta(days=10)
            },
            
            {
                "name": "Luxury Silk Scarf Collection",
                "description": "Premium silk scarf collection featuring artistic patterns. Made from 100% mulberry silk with hand-rolled edges.",
                "categories": ["accessories", "luxury_items"],
                "price": 89.99,
                "sku": "LSC-010",
                "brand": "Vallmark",
                "stock_quantity": 16,
                "min_stock_level": 3,
                "is_active": True,
                "features": ["100% mulberry silk", "Hand-rolled edges", "Artistic patterns", "Multiple colors"],
                "specifications": {
                    "material": "100% Mulberry Silk",
                    "size": "35\" x 35\"",
                    "care": "Dry clean only",
                    "colors": "Blue, Red, Green, Gold"
                },
                "images": [
                    "https://images.unsplash.com/photo-1582142306909-195724d2d6c4?w=500&q=80",
                    "https://images.unsplash.com/photo-1591369822096-ffd140ec948f?w=500&q=80"
                ],
                "videos": [],
                "views": 0,
                "sales_count": 0,
                "rating": 0.0,
                "review_count": 0,

                "created_at": now_ist() - timedelta(days=12),
                "updated_at": now_ist() - timedelta(days=12)
            },
            
            {
                "name": "Artisan Wooden Jewelry Box",
                "description": "Handcrafted wooden jewelry box with multiple compartments and velvet lining. Perfect for organizing precious jewelry.",
                "categories": ["keepsakes", "accessories"],
                "price": 76.99,
                "sku": "AWJ-011",
                "brand": "Vallmark",
                "stock_quantity": 12,
                "min_stock_level": 2,
                "is_active": True,
                "features": ["Handcrafted wood", "Velvet lining", "Multiple compartments", "Lock and key"],
                "specifications": {
                    "material": "Mahogany wood with brass hardware",
                    "size": "10\" x 7\" x 4\"",
                    "compartments": "6 sections plus ring rolls"
                },
                "images": [
                    "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500&q=80",
                    "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=500&q=80"
                ],
                "videos": [],
                "views": 0,
                "sales_count": 0,
                "rating": 0.0,
                "review_count": 0,
                "hidden_tax_category": HiddenTaxCategory.STANDARD_GIFTS,
                "tax_calculation_type": TaxCalculationType.EXCLUSIVE,
                "created_at": now_ist() - timedelta(days=15),
                "updated_at": now_ist() - timedelta(days=15)
            },
            
            {
                "name": "Premium Candle Gift Set",
                "description": "Luxurious set of 6 scented candles in elegant glass containers. Features various relaxing scents for home ambiance.",
                "categories": ["home_decor", "special_occasions"],
                "price": 64.99,
                "sku": "PCG-012",
                "brand": "Vallmark",
                "stock_quantity": 25,
                "min_stock_level": 5,
                "is_active": True,
                "features": ["Set of 6 candles", "Natural soy wax", "Long burning", "Gift packaging"],
                "specifications": {
                    "material": "Soy wax in glass containers",
                    "burn_time": "40+ hours per candle",
                    "scents": "Lavender, Vanilla, Rose, Sandalwood, Ocean, Citrus"
                },
                "images": [
                    "https://images.unsplash.com/photo-1602874801252-7d51c704b264?w=500&q=80",
                    "https://images.unsplash.com/photo-1544995045-2ad2bb7e4b5b?w=500&q=80"
                ],
                "videos": [],
                "views": 0,
                "sales_count": 0,
                "rating": 0.0,
                "review_count": 0,
                "hidden_tax_category": HiddenTaxCategory.STANDARD_GIFTS,
                "tax_calculation_type": TaxCalculationType.EXCLUSIVE,
                "created_at": now_ist() - timedelta(days=18),
                "updated_at": now_ist() - timedelta(days=18)
            },
            
            {
                "name": "Designer Wall Clock Collection",
                "description": "Modern designer wall clocks featuring minimalist designs. Silent movement mechanism with premium materials.",
                "categories": ["home_decor"],
                "price": 95.99,
                "sku": "DWC-013",
                "brand": "Vallmark",
                "stock_quantity": 14,
                "min_stock_level": 3,
                "is_active": True,
                "features": ["Silent movement", "Minimalist design", "Premium materials", "Battery operated"],
                "specifications": {
                    "material": "Wood and metal construction",
                    "size": "12\" diameter",
                    "movement": "Silent quartz mechanism",
                    "battery": "AA (not included)"
                },
                "images": [
                    "https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?w=500&q=80",
                    "https://images.unsplash.com/photo-1540932239986-30128078f3c5?w=500&q=80"
                ],
                "videos": [],
                "views": 0,
                "sales_count": 0,
                "rating": 0.0,
                "review_count": 0,
                "hidden_tax_category": HiddenTaxCategory.STANDARD_GIFTS,
                "tax_calculation_type": TaxCalculationType.EXCLUSIVE,
                "created_at": now_ist() - timedelta(days=20),
                "updated_at": now_ist() - timedelta(days=20)
            },
            
            {
                "name": "Crystal Wine Decanter Set",
                "description": "Elegant crystal wine decanter with 4 matching glasses. Perfect for wine enthusiasts and special occasions.",
                "categories": ["luxury_items", "special_occasions"],
                "price": 149.99,
                "sku": "CWD-014",
                "brand": "Vallmark",
                "stock_quantity": 8,
                "min_stock_level": 2,
                "is_active": True,
                "features": ["Crystal construction", "Includes 4 glasses", "Elegant design", "Gift box"],
                "specifications": {
                    "material": "Lead-free crystal",
                    "decanter_capacity": "750ml",
                    "glass_capacity": "350ml each",
                    "care": "Hand wash recommended"
                },
                "images": [
                    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&q=80",
                    "https://images.unsplash.com/photo-1547595628-c61a29f496f0?w=500&q=80"
                ],
                "videos": [],
                "views": 0,
                "sales_count": 0,
                "rating": 0.0,
                "review_count": 0,

                "created_at": now_ist() - timedelta(days=22),
                "updated_at": now_ist() - timedelta(days=22)
            },
            
            {
                "name": "Handmade Macrame Plant Hangers",
                "description": "Set of 3 handmade macrame plant hangers in different lengths. Perfect for creating a beautiful hanging garden.",
                "categories": ["home_decor"],
                "price": 42.99,
                "sku": "HMP-015",
                "brand": "Vallmark",
                "stock_quantity": 20,
                "min_stock_level": 4,
                "is_active": True,
                "features": ["Set of 3", "Handmade macrame", "Different lengths", "Natural cotton rope"],
                "specifications": {
                    "material": "100% natural cotton rope",
                    "lengths": "30\", 36\", 42\"",
                    "pot_capacity": "Up to 8\" diameter pots",
                    "weight_limit": "10 lbs per hanger"
                },
                "images": [
                    "https://images.unsplash.com/photo-1611199023890-38c29c9aa3ec?w=500&q=80",
                    "https://images.unsplash.com/photo-1585229929632-8db9e2e5e9ad?w=500&q=80"
                ],
                "videos": [],
                "views": 0,
                "sales_count": 0,
                "rating": 0.0,
                "review_count": 0,
                "hidden_tax_category": HiddenTaxCategory.STANDARD_GIFTS,
                "tax_calculation_type": TaxCalculationType.EXCLUSIVE,
                "created_at": now_ist() - timedelta(days=25),
                "updated_at": now_ist() - timedelta(days=25)
            },
            
            {
                "name": "Vintage Brass Compass Set",
                "description": "Antique-style brass compass with wooden gift box. Perfect collectible item for navigation enthusiasts and decorators.",
                "categories": ["keepsakes", "luxury_items"],
                "price": 84.99,
                "sku": "VBC-016",
                "brand": "Vallmark",
                "stock_quantity": 6,
                "min_stock_level": 1,
                "is_active": True,
                "features": ["Antique brass finish", "Functional compass", "Wooden gift box", "Collectible item"],
                "specifications": {
                    "material": "Solid brass with glass cover",
                    "size": "3\" diameter",
                    "box": "Wooden presentation box",
                    "functionality": "Fully functional compass"
                },
                "images": [
                    "https://images.unsplash.com/photo-1526045612212-70caf35c14df?w=500&q=80",
                    "https://images.unsplash.com/photo-1594736797933-d0fcedbaf8a7?w=500&q=80"
                ],
                "videos": [],
                "views": 0,
                "sales_count": 0,
                "rating": 0.0,
                "review_count": 0,

                "created_at": now_ist() - timedelta(days=28),
                "updated_at": now_ist() - timedelta(days=28)
            },
            
            {
                "name": "Artisan Tea Set Collection",
                "description": "Premium ceramic tea set with teapot, 4 cups, and serving tray. Features traditional design with modern functionality.",
                "categories": ["home_decor", "special_occasions"],
                "price": 118.99,
                "sku": "ATS-017",
                "brand": "Vallmark",
                "stock_quantity": 9,
                "min_stock_level": 2,
                "is_active": True,
                "features": ["Complete tea set", "Ceramic construction", "Traditional design", "Serving tray included"],
                "specifications": {
                    "material": "Fine bone china",
                    "set_includes": "Teapot, 4 cups, 4 saucers, serving tray",
                    "teapot_capacity": "600ml",
                    "care": "Dishwasher safe"
                },
                "images": [
                    "https://images.unsplash.com/photo-1564890273473-46fcd1a6db7c?w=500&q=80",
                    "https://images.unsplash.com/photo-1571115764595-644a1f56a55c?w=500&q=80"
                ],
                "videos": [],
                "views": 0,
                "sales_count": 0,
                "rating": 0.0,
                "review_count": 0,
                "hidden_tax_category": HiddenTaxCategory.STANDARD_GIFTS,
                "tax_calculation_type": TaxCalculationType.EXCLUSIVE,
                "created_at": now_ist() - timedelta(days=30),
                "updated_at": now_ist() - timedelta(days=30)
            },
            
            {
                "name": "Personalized Star Map Print",
                "description": "Custom star map showing the night sky from any date and location. Beautifully designed and personalized for special moments.",
                "categories": ["personalized_gifts", "keepsakes"],
                "price": 54.99,
                "sku": "PSM-018",
                "brand": "Vallmark",
                "stock_quantity": 30,
                "min_stock_level": 6,
                "is_active": True,
                "features": ["Custom star map", "Personalized text", "Premium print quality", "Multiple sizes"],
                "specifications": {
                    "print_quality": "Archival quality paper",
                    "sizes": "8x10, 11x14, 16x20 inches",
                    "customization": "Date, location, and text",
                    "frame": "Optional framing available"
                },
                "images": [
                    "https://images.unsplash.com/photo-1446776877081-d282a0f896e2?w=500&q=80",
                    "https://images.unsplash.com/photo-1502134249126-9f3755a50d78?w=500&q=80"
                ],
                "videos": [],
                "views": 0,
                "sales_count": 0,
                "rating": 0.0,
                "review_count": 0,
                "hidden_tax_category": HiddenTaxCategory.STANDARD_GIFTS,
                "tax_calculation_type": TaxCalculationType.EXCLUSIVE,
                "created_at": now_ist() - timedelta(days=32),
                "updated_at": now_ist() - timedelta(days=32)
            },
            
            {
                "name": "Luxury Bath Bomb Gift Set",
                "description": "Deluxe collection of 12 handmade bath bombs with natural ingredients. Perfect for relaxation and self-care.",
                "categories": ["special_occasions", "accessories"],
                "price": 39.99,
                "sku": "LBB-019",
                "brand": "Vallmark",
                "stock_quantity": 28,
                "min_stock_level": 6,
                "is_active": True,
                "features": ["12 bath bombs", "Natural ingredients", "Various scents", "Gift packaging"],
                "specifications": {
                    "ingredients": "Natural oils and botanicals",
                    "count": "12 individual bath bombs",
                    "scents": "Lavender, Eucalyptus, Rose, Vanilla, Mint, Citrus",
                    "package": "Beautiful gift box"
                },
                "images": [
                    "https://images.unsplash.com/photo-1544718287-1ebac0c1d9db?w=500&q=80",
                    "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=500&q=80"
                ],
                "videos": [],
                "views": 0,
                "sales_count": 0,
                "rating": 0.0,
                "review_count": 0,
                "hidden_tax_category": HiddenTaxCategory.STANDARD_GIFTS,
                "tax_calculation_type": TaxCalculationType.EXCLUSIVE,
                "created_at": now_ist() - timedelta(days=35),
                "updated_at": now_ist() - timedelta(days=35)
            },
            
            {
                "name": "Wooden Recipe Book Stand",
                "description": "Elegant bamboo recipe book stand with adjustable angles. Perfect for kitchen use with cookbooks and tablets.",
                "categories": ["home_decor", "accessories"],
                "price": 28.99,
                "sku": "WRB-020",
                "brand": "Vallmark",
                "stock_quantity": 35,
                "min_stock_level": 7,
                "is_active": True,
                "features": ["Bamboo construction", "Adjustable angles", "Tablet compatible", "Easy to clean"],
                "specifications": {
                    "material": "Sustainable bamboo",
                    "size": "13\" W x 9\" D",
                    "angles": "4 adjustable positions",
                    "compatibility": "Books and tablets up to 12\""
                },
                "images": [
                    "https://images.unsplash.com/photo-1544148103-0773bf10d330?w=500&q=80",
                    "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=500&q=80"
                ],
                "videos": [],
                "views": 0,
                "sales_count": 0,
                "rating": 0.0,
                "review_count": 0,
                "hidden_tax_category": HiddenTaxCategory.STANDARD_GIFTS,
                "tax_calculation_type": TaxCalculationType.EXCLUSIVE,
                "created_at": now_ist() - timedelta(days=38),
                "updated_at": now_ist() - timedelta(days=38)
            },
            
            {
                "name": "Artisan Glass Paperweight Set",
                "description": "Beautiful set of 3 handblown glass paperweights with unique swirl patterns. Perfect desk accessories and collectibles.",
                "categories": ["accessories", "luxury_items"],
                "price": 67.99,
                "sku": "AGP-021",
                "brand": "Vallmark",
                "stock_quantity": 11,
                "min_stock_level": 2,
                "is_active": True,
                "features": ["Handblown glass", "Set of 3", "Unique patterns", "Gift box included"],
                "specifications": {
                    "material": "Premium handblown glass",
                    "size": "3\" diameter each",
                    "patterns": "Unique swirl designs",
                    "weight": "Substantial desk weight"
                },
                "images": [
                    "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=500&q=80",
                    "https://images.unsplash.com/photo-1571115764595-644a1f56a55c?w=500&q=80"
                ],
                "videos": [],
                "views": 0,
                "sales_count": 0,
                "rating": 0.0,
                "review_count": 0,

                "created_at": now_ist() - timedelta(days=40),
                "updated_at": now_ist() - timedelta(days=40)
            },
            
            {
                "name": "Premium Leather Wallet Collection",
                "description": "Handcrafted genuine leather wallet with RFID blocking technology. Features multiple card slots and bill compartments.",
                "categories": ["accessories", "personalized_gifts"],
                "price": 78.99,
                "sku": "PLW-022",
                "brand": "Vallmark",
                "stock_quantity": 18,
                "min_stock_level": 4,
                "is_active": True,
                "features": ["Genuine leather", "RFID blocking", "Multiple compartments", "Personalization available"],
                "specifications": {
                    "material": "Full-grain leather",
                    "size": "4.5\" x 3.5\" x 0.5\"",
                    "compartments": "8 card slots, 2 bill sections",
                    "protection": "RFID blocking technology"
                },
                "images": [
                    "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500&q=80",
                    "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500&q=80"
                ],
                "videos": [],
                "views": 0,
                "sales_count": 0,
                "rating": 0.0,
                "review_count": 0,
                "hidden_tax_category": HiddenTaxCategory.STANDARD_GIFTS,
                "tax_calculation_type": TaxCalculationType.EXCLUSIVE,
                "created_at": now_ist() - timedelta(days=42),
                "updated_at": now_ist() - timedelta(days=42)
            },
            
            {
                "name": "Decorative Throw Pillow Set",
                "description": "Set of 4 decorative throw pillows with removable covers. Features various textures and patterns for sofa styling.",
                "categories": ["home_decor"],
                "price": 89.99,
                "sku": "DTP-023",
                "brand": "Vallmark",
                "stock_quantity": 15,
                "min_stock_level": 3,
                "is_active": True,
                "features": ["Set of 4 pillows", "Removable covers", "Various textures", "Machine washable"],
                "specifications": {
                    "size": "18\" x 18\" each",
                    "fill": "Premium polyester fiber",
                    "covers": "Removable and washable",
                    "patterns": "Geometric, floral, solid, textured"
                },
                "images": [
                    "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=500&q=80",
                    "https://images.unsplash.com/photo-1604014237800-1c9102c219da?w=500&q=80"
                ],
                "videos": [],
                "views": 0,
                "sales_count": 0,
                "rating": 0.0,
                "review_count": 0,
                "hidden_tax_category": HiddenTaxCategory.STANDARD_GIFTS,
                "tax_calculation_type": TaxCalculationType.EXCLUSIVE,
                "created_at": now_ist() - timedelta(days=45),
                "updated_at": now_ist() - timedelta(days=45)
            },
            
            {
                "name": "Crystal Chandelier Table Lamp",
                "description": "Elegant crystal chandelier-style table lamp with LED bulbs. Creates beautiful ambient lighting for any room.",
                "categories": ["home_decor", "luxury_items"],
                "price": 164.99,
                "sku": "CCT-024",
                "brand": "Vallmark",
                "stock_quantity": 7,
                "min_stock_level": 1,
                "is_active": True,
                "features": ["Crystal construction", "LED bulbs included", "Dimmable", "Elegant design"],
                "specifications": {
                    "material": "K9 crystal with metal base",
                    "height": "24 inches",
                    "bulbs": "LED bulbs included",
                    "dimming": "Compatible with dimmer switches"
                },
                "images": [
                    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&q=80",
                    "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=500&q=80"
                ],
                "videos": [],
                "views": 0,
                "sales_count": 0,
                "rating": 0.0,
                "review_count": 0,

                "created_at": now_ist() - timedelta(days=48),
                "updated_at": now_ist() - timedelta(days=48)
            },
            
            {
                "name": "Handmade Ceramic Vase Trio",
                "description": "Set of 3 handmade ceramic vases in complementary sizes and colors. Perfect for fresh or dried flower arrangements.",
                "categories": ["home_decor"],
                "price": 72.99,
                "sku": "HCV-025",
                "brand": "Vallmark",
                "stock_quantity": 13,
                "min_stock_level": 3,
                "is_active": True,
                "features": ["Set of 3 vases", "Handmade ceramic", "Complementary colors", "Various sizes"],
                "specifications": {
                    "material": "Handcrafted ceramic",
                    "sizes": "Large: 10\"H, Medium: 8\"H, Small: 6\"H",
                    "colors": "Earth tones with matte finish",
                    "care": "Hand wash recommended"
                },
                "images": [
                    "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=500&q=80",
                    "https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=500&q=80"
                ],
                "videos": [],
                "views": 0,
                "sales_count": 0,
                "rating": 0.0,
                "review_count": 0,
                "hidden_tax_category": HiddenTaxCategory.STANDARD_GIFTS,
                "tax_calculation_type": TaxCalculationType.EXCLUSIVE,
                "created_at": now_ist() - timedelta(days=50),
                "updated_at": now_ist() - timedelta(days=50)
            },
            
            {
                "name": "Vintage Brass Photo Frames Set",
                "description": "Collection of 5 vintage-style brass photo frames in various sizes. Perfect for creating a classic photo gallery display.",
                "categories": ["keepsakes", "home_decor"],
                "price": 94.99,
                "sku": "VBP-026",
                "brand": "Vallmark",
                "stock_quantity": 10,
                "min_stock_level": 2,
                "is_active": True,
                "features": ["Set of 5 frames", "Vintage brass finish", "Various sizes", "Easel backs included"],
                "specifications": {
                    "material": "Antique brass finish on metal",
                    "sizes": "8x10, 5x7 (2), 4x6 (2)",
                    "backing": "Easel stands and hanging hardware",
                    "glass": "High-quality picture glass"
                },
                "images": [
                    "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=500&q=80",
                    "https://images.unsplash.com/photo-1566737236500-c8ac43014a8e?w=500&q=80"
                ],
                "videos": [],
                "views": 0,
                "sales_count": 0,
                "rating": 0.0,
                "review_count": 0,
                "hidden_tax_category": HiddenTaxCategory.STANDARD_GIFTS,
                "tax_calculation_type": TaxCalculationType.EXCLUSIVE,
                "created_at": now_ist() - timedelta(days=52),
                "updated_at": now_ist() - timedelta(days=52)
            },
            
            {
                "name": "Artisan Wooden Serving Board Set",
                "description": "Beautiful set of 3 handcrafted wooden serving boards in different shapes. Perfect for entertaining and food presentation.",
                "categories": ["home_decor", "special_occasions"],
                "price": 58.99,
                "sku": "AWS-027",
                "brand": "Vallmark",
                "stock_quantity": 22,
                "min_stock_level": 4,
                "is_active": True,
                "features": ["Set of 3 boards", "Handcrafted wood", "Different shapes", "Food safe finish"],
                "specifications": {
                    "material": "Acacia wood with food-safe finish",
                    "shapes": "Round, rectangular, oval",
                    "sizes": "Large: 14\", Medium: 12\", Small: 10\"",
                    "care": "Hand wash and oil periodically"
                },
                "images": [
                    "https://images.unsplash.com/photo-1544148103-0773bf10d330?w=500&q=80",
                    "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=500&q=80"
                ],
                "videos": [],
                "views": 0,
                "sales_count": 0,
                "rating": 0.0,
                "review_count": 0,
                "hidden_tax_category": HiddenTaxCategory.STANDARD_GIFTS,
                "tax_calculation_type": TaxCalculationType.EXCLUSIVE,
                "created_at": now_ist() - timedelta(days=55),
                "updated_at": now_ist() - timedelta(days=55)
            }
        ]
        
        # Create ProductInDB instances to ensure validation
        product_documents = []
        for product_data in products:
            try:
                # Create ProductInDB instance for validation
                product = ProductInDB(**product_data)
                product_documents.append(product.model_dump())
            except Exception as e:
                print(f"❌ Failed to validate product {product_data.get('name', 'unknown')}: {e}")
                continue
                
        return product_documents
        
    async def seed_data(self):
        """Main seeding function"""
        try:
            # Check if we should clear existing data
            products_collection = self.db.products
            existing_count = await products_collection.count_documents({})
            
            if existing_count > 0:
                clear_choice = input(f"⚠️  Found {existing_count} existing products.\nDo you want to clear existing products and reseed? (y/N): ")
                if clear_choice.lower() in ['y', 'yes']:
                    await products_collection.delete_many({})
                    print("🗑️  Cleared existing products")
                else:
                    print("🚫 Seeding cancelled - keeping existing data")
                    return
            
            # Get product data
            print("🌱 Starting product seeding...")
            products = await self.seed_products()
            
            # Insert products
            if products:
                await products_collection.insert_many(products)
                print(f"✅ Created {len(products)} products")
            else:
                print("❌ No valid products to insert")
                
            # Summary
            total_products = await products_collection.count_documents({})
            active_products = await products_collection.count_documents({"is_active": True})
            
            # Count new products (within 7 days)
            from datetime import timedelta
            seven_days_ago = now_ist() - timedelta(days=7)
            new_products = await products_collection.count_documents({
                "created_at": {"$gte": seven_days_ago}
            })
            
            print(f"📊 Database Summary:")
            print(f"   Total products: {total_products}")
            print(f"   Active products: {active_products}")
            print(f"   New products (within 7 days): {new_products}")
            print(f"🎉 Seeding completed! Created {len(products)} products with AI-generated images")
            
        except Exception as e:
            print(f"❌ Error during seeding: {e}")
            import traceback
            traceback.print_exc()
    
    async def disconnect(self):
        """Disconnect from MongoDB"""
        if self.client:
            self.client.close()
            print("🔌 Database connection closed")

async def main():
    """Main execution function"""
    seeder = ProductSeeder()
    
    try:
        await seeder.connect()
        await seeder.seed_data()
    finally:
        await seeder.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
