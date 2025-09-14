#!/bin/bash
# Backend startup script with comprehensive checks
# File: backend/start_backend.sh

set -e  # Exit on any error

echo "🚀 Vallmark Backend Startup Script"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️ $1${NC}"
}

# Check if we're in the backend directory
if [[ ! -f "server.py" ]]; then
    print_error "Please run this script from the backend directory"
    print_info "cd backend && ./start_backend.sh"
    exit 1
fi

print_info "Starting from directory: $(pwd)"

# Step 1: Check Python installation
echo -e "\n📍 Step 1: Checking Python installation..."
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    print_status "Python found: $PYTHON_VERSION"
else
    print_error "Python3 not found. Please install Python 3.8 or higher"
    exit 1
fi

# Step 2: Virtual environment setup
echo -e "\n📍 Step 2: Setting up virtual environment..."
if [[ -d "venv" ]]; then
    print_status "Virtual environment exists"
else
    print_warning "Creating new virtual environment..."
    python3 -m venv venv
    print_status "Virtual environment created"
fi

# Activate virtual environment
print_info "Activating virtual environment..."
source venv/bin/activate

# Verify activation
if [[ "$VIRTUAL_ENV" != "" ]]; then
    print_status "Virtual environment activated: $VIRTUAL_ENV"
else
    print_error "Failed to activate virtual environment"
    exit 1
fi

# Step 3: Install dependencies
echo -e "\n📍 Step 3: Installing dependencies..."
if [[ -f "requirements.txt" ]]; then
    print_info "Installing from requirements.txt..."
    pip install --upgrade pip
    pip install -r requirements.txt
    print_status "Dependencies installed"
else
    print_error "requirements.txt not found"
    exit 1
fi

# Step 4: Environment configuration
echo -e "\n📍 Step 4: Checking environment configuration..."
if [[ ! -f ".env" ]]; then
    print_warning ".env file not found. Creating from template..."
    cat > .env << 'EOF'
# Database
MONGO_URL=mongodb://localhost:27017/vallmark_db

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-environment
JWT_ALGORITHM=HS256
JWT_EXPIRE_HOURS=24

# Email Configuration (Optional)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_EMAIL=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Environment
ENVIRONMENT=development

# Documentation
DOCS_ENABLED=true
DOCS_KEY=
SWAGGER_PERSIST_AUTH=true
OPENAPI_MERGE_DYNAMIC=true
OPENAPI_WRITE_BACK=false

# Server Configuration
HOST=0.0.0.0
PORT=8001
EOF
    print_warning ".env file created with default values"
    print_info "Please update the values in .env as needed"
else
    print_status ".env file exists"
fi

# Step 5: Check MongoDB connection
echo -e "\n📍 Step 5: Testing MongoDB connection..."
print_info "Running connection test..."

python3 -c "
import asyncio
import sys
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

async def test_mongo():
    load_dotenv()
    try:
        mongo_url = os.getenv('MONGO_URL', 'mongodb://localhost:27017/vallmark_db')
        print(f'Testing connection to: {mongo_url}')
        client = AsyncIOMotorClient(mongo_url)
        await client.admin.command('ping')
        print('MongoDB connection successful')
        
        # Check if database has data
        db = client.vallmark_db
        products_count = await db.products.count_documents({})
        print(f'Products in database: {products_count}')
        
        client.close()
        exit(0)
    except Exception as e:
        print(f'MongoDB connection failed: {e}')
        exit(1)

asyncio.run(test_mongo())
"

MONGO_EXIT_CODE=$?
if [[ $MONGO_EXIT_CODE -eq 0 ]]; then
    print_status "MongoDB connection successful"
else
    print_error "MongoDB connection failed"
    print_info "Starting MongoDB service..."
    
    # Try to start MongoDB
    if command -v systemctl &> /dev/null; then
        sudo systemctl start mongod
        print_info "Waiting for MongoDB to start..."
        sleep 3
    elif command -v brew &> /dev/null; then
        brew services start mongodb-community
        print_info "Waiting for MongoDB to start..."
        sleep 3
    else
        print_error "Could not start MongoDB automatically"
        print_info "Please start MongoDB manually:"
        print_info "  Ubuntu/Debian: sudo systemctl start mongod"
        print_info "  macOS: brew services start mongodb-community"
        exit 1
    fi
    
    # Test again
    python3 -c "
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

async def test_mongo():
    load_dotenv()
    try:
        client = AsyncIOMotorClient(os.getenv('MONGO_URL', 'mongodb://localhost:27017/vallmark_db'))
        await client.admin.command('ping')
        client.close()
        exit(0)
    except:
        exit(1)

asyncio.run(test_mongo())
"
    
    if [[ $? -eq 0 ]]; then
        print_status "MongoDB is now running"
    else
        print_error "Still cannot connect to MongoDB"
        exit 1
    fi
fi

# Step 6: Database seeding check
echo -e "\n📍 Step 6: Checking database content..."
PRODUCTS_COUNT=$(python3 -c "
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

async def count_products():
    load_dotenv()
    try:
        client = AsyncIOMotorClient(os.getenv('MONGO_URL', 'mongodb://localhost:27017/vallmark_db'))
        db = client.vallmark_db
        count = await db.products.count_documents({})
        client.close()
        print(count)
    except:
        print(0)

asyncio.run(count_products())
")

if [[ $PRODUCTS_COUNT -gt 0 ]]; then
    print_status "Database has $PRODUCTS_COUNT products"
else
    print_warning "Database is empty. Running seeding script..."
    if [[ -f "seed_database.py" ]]; then
        python3 seed_database.py
        print_status "Database seeded"
    else
        print_warning "No seeding script found. You may need to add products manually"
    fi
fi

# Step 7: Port check
echo -e "\n📍 Step 7: Checking if port 8001 is available..."
if lsof -Pi :8001 -sTCP:LISTEN -t >/dev/null ; then
    print_warning "Port 8001 is already in use"
    print_info "Existing processes on port 8001:"
    lsof -Pi :8001 -sTCP:LISTEN
    print_info "Kill existing processes? (y/n)"
    read -r answer
    if [[ $answer == "y" || $answer == "Y" ]]; then
        print_info "Killing processes on port 8001..."
        lsof -ti:8001 | xargs kill -9
        print_status "Port 8001 cleared"
    else
        print_info "You may need to use a different port"
    fi
else
    print_status "Port 8001 is available"
fi

# Step 8: Start the server
echo -e "\n📍 Step 8: Starting FastAPI server..."
print_info "Starting server with uvicorn..."
print_info "Server will be available at: http://localhost:8001"
print_info "API documentation: http://localhost:8001/api/docs"
print_info "Health check: http://localhost:8001/api/health"

echo -e "\n" 
print_status "🚀 Starting Vallmark Backend Server..."
print_info "Press Ctrl+C to stop the server"
echo -e "\n"

# Start the server
exec uvicorn server:app --host 0.0.0.0 --port 8001 --reload
