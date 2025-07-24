#!/bin/bash

# SmartSwitch Database Seeding Script
# This script seeds the database with initial users for all roles

echo "🚀 SmartSwitch Database Seeding"
echo "==============================="
echo ""

# Change to backend directory
cd /app/backend

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 is not installed or not in PATH"
    exit 1
fi

# Check if the seed script exists
if [ ! -f "seed_database.py" ]; then
    echo "❌ seed_database.py not found"
    exit 1
fi

# Install required dependencies if needed
echo "📦 Installing dependencies..."
pip install -r requirements.txt --quiet

# Run the seeding script
echo "🌱 Running database seeding..."
python3 seed_database.py

# Check if seeding was successful
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Database seeding completed successfully!"
    echo ""
    echo "🌐 You can now access the application at:"
    echo "   Frontend: http://localhost:3000"
    echo "   Backend API: http://localhost:8001/api"
    echo ""
    echo "📝 Next steps:"
    echo "   1. Visit http://localhost:3000/login"
    echo "   2. Use any of the credentials shown above"
    echo "   3. Explore different role-based dashboards"
    echo "   4. Use Super Admin to manage other users"
else
    echo ""
    echo "❌ Database seeding failed!"
    echo "Please check the error messages above"
    exit 1
fi