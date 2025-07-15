from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from typing import Optional, List
import os
from dotenv import load_dotenv
import logging

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(title="Smart Switch IoT API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure properly in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017/smartswitch_db")
client = AsyncIOMotorClient(MONGO_URL)
db = client.get_default_database()

# OAuth2 setup
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/token")

# Base models
class BaseResponse(BaseModel):
    success: bool
    message: str
    data: Optional[dict] = None

class UserBase(BaseModel):
    email: str
    username: str
    role: str = "customer"

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: str
    created_at: str
    is_active: bool

# Health check endpoint
@app.get("/api/health")
async def health_check():
    try:
        # Test database connection
        await db.list_collection_names()
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=500, detail="Service unhealthy")

# Root endpoint
@app.get("/api/")
async def root():
    return {"message": "Smart Switch IoT API", "version": "1.0.0"}

# Test endpoint for frontend connection
@app.get("/api/test")
async def test_connection():
    return {
        "message": "Backend connection successful",
        "timestamp": "2024-01-01T00:00:00Z",
        "status": "running"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)