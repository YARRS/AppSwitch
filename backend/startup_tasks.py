#!/usr/bin/env python3
"""
Startup tasks for SmartSwitch IoT Backend
Handles automatic database seeding and other startup procedures
"""

import os
import asyncio
import logging
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logger = logging.getLogger(__name__)

class StartupTasks:
    def __init__(self, db):
        self.db = db
        self.auto_seed_enabled = os.getenv('AUTO_SEED_USERS', 'false').lower() == 'true'
    
    async def run_startup_tasks(self):
        """Run all startup tasks"""
        logger.info("🚀 Running startup tasks...")
        
        try:
            # Check if auto-seeding is enabled
            if self.auto_seed_enabled:
                await self.auto_seed_users()
            else:
                logger.info("ℹ️  Auto-seeding disabled (production mode)")
            
            logger.info("✅ Startup tasks completed successfully")
        except Exception as e:
            logger.error(f"❌ Startup tasks failed: {e}")
            # Don't fail the entire application startup
    
    async def auto_seed_users(self):
        """Automatically seed users if database is empty"""
        try:
            # Check if users collection exists and has documents
            user_count = await self.db.users.count_documents({})
            
            if user_count == 0:
                logger.info("🌱 Database is empty, starting auto-seeding...")
                await self.seed_database()
                logger.info("✅ Auto-seeding completed successfully")
            else:
                logger.info(f"ℹ️  Database already has {user_count} users, skipping auto-seeding")
        
        except Exception as e:
            logger.error(f"❌ Auto-seeding failed: {e}")
            # Don't fail the startup process
    
    async def seed_database(self):
        """Seed database with default users"""
        try:
            # Import seeding functionality
            from seed_database import DatabaseSeeder
            
            # Create and run seeder
            seeder = DatabaseSeeder()
            seeder.client = AsyncIOMotorClient(os.getenv("MONGO_URL"))
            seeder.db = seeder.client.get_default_database()
            
            try:
                # Create indexes
                await seeder.create_indexes()
                
                # Seed users
                await seeder.seed_users()
                
                logger.info("🎉 Database seeding completed via startup task")
                
            finally:
                # Clean up connection
                if seeder.client:
                    seeder.client.close()
                    
        except Exception as e:
            logger.error(f"❌ Database seeding failed: {e}")
            raise