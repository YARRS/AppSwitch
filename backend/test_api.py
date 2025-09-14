#!/usr/bin/env python3
"""
Test script to verify API endpoints are working correctly
"""
import asyncio
import aiohttp
import json
import sys
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

async def test_products_api():
    """Test the products API endpoint and related functionality"""
    print("🚀 Testing Products API...")
    print("=" * 50)
    
    # Configuration
    base_url = "http://localhost:8001"
    timeout = aiohttp.ClientTimeout(total=10)
    
    print(f"📍 Base URL: {base_url}")
    
    async with aiohttp.ClientSession(timeout=timeout) as session:
        try:
            # Test 1: Health endpoint
            print("\n🏥 Testing health endpoint...")
            try:
                async with session.get(f"{base_url}/api/health") as response:
                    print(f"   Status: {response.status}")
                    if response.status == 200:
                        health_data = await response.json()
                        print(f"   ✅ Health check passed: {health_data}")
                    else:
                        print(f"   ❌ Health check failed")
                        return False
            except Exception as e:
                print(f"   ❌ Health endpoint failed: {e}")
                print("   💡 Make sure the backend server is running:")
                print("       cd backend && source venv/bin/activate && uvicorn server:app --port 8001")
                return False
            
            # Test 2: Root API endpoint
            print("\n🏠 Testing root API endpoint...")
            try:
                async with session.get(f"{base_url}/api/") as response:
                    print(f"   Status: {response.status}")
                    if response.status == 200:
                        root_data = await response.json()
                        print(f"   ✅ Root endpoint: {root_data}")
                    else:
                        print(f"   ⚠️ Root endpoint returned: {response.status}")
            except Exception as e:
                print(f"   ❌ Root endpoint failed: {e}")
            
            # Test 3: Products endpoint - basic
            print("\n🛍️ Testing products endpoint...")
            try:
                async with session.get(f"{base_url}/api/products/") as response:
                    print(f"   Status: {response.status}")
                    
                    if response.status == 200:
                        products_data = await response.json()
                        print(f"   ✅ Products endpoint accessible")
                        
                        # Analyze response structure
                        print(f"   📊 Response structure:")
                        if isinstance(products_data, dict):
                            print(f"      Success: {products_data.get('success', 'N/A')}")
                            print(f"      Total products: {products_data.get('total', 'N/A')}")
                            print(f"      Current page: {products_data.get('page', 'N/A')}")
                            print(f"      Products count: {len(products_data.get('data', []))}")
                            
                            # Show sample products
                            products = products_data.get('data', [])
                            if products:
                                print(f"   📋 Sample products:")
                                for i, product in enumerate(products[:3], 1):
                                    print(f"      {i}. {product.get('name', 'N/A')} - ${product.get('price', 0)}")
                            else:
                                print(f"   ⚠️ No products returned")
                        else:
                            print(f"   ❌ Unexpected response format: {type(products_data)}")
                            
                    elif response.status == 404:
                        print(f"   ❌ Products endpoint not found (404)")
                    elif response.status == 500:
                        error_text = await response.text()
                        print(f"   ❌ Server error (500): {error_text}")
                    else:
                        error_text = await response.text()
                        print(f"   ❌ Products endpoint failed ({response.status}): {error_text}")
                        
            except Exception as e:
                print(f"   ❌ Products endpoint failed: {e}")
            
            # Test 4: Products with filters
            print("\n🔍 Testing products with filters...")
            try:
                filters = {
                    'page': '1',
                    'per_page': '5',
                    'is_active': 'true'
                }
                
                params = '&'.join([f"{k}={v}" for k, v in filters.items()])
                url = f"{base_url}/api/products/?{params}"
                
                async with session.get(url) as response:
                    print(f"   Status: {response.status}")
                    print(f"   URL: {url}")
                    
                    if response.status == 200:
                        filtered_data = await response.json()
                        products = filtered_data.get('data', [])
                        print(f"   ✅ Filtered products: {len(products)} items")
                    else:
                        error_text = await response.text()
                        print(f"   ❌ Filtered request failed: {error_text}")
                        
            except Exception as e:
                print(f"   ❌ Filtered products test failed: {e}")
            
            # Test 5: Categories endpoint
            print("\n📁 Testing categories endpoint...")
            try:
                async with session.get(f"{base_url}/api/categories/") as response:
                    print(f"   Status: {response.status}")
                    
                    if response.status == 200:
                        categories_data = await response.json()
                        print(f"   ✅ Categories endpoint accessible")
                        
                        if isinstance(categories_data, dict):
                            categories = categories_data.get('data', [])
                            print(f"   📁 Categories found: {len(categories)}")
                            for cat in categories[:3]:
                                print(f"      - {cat.get('name', 'N/A')}")
                    else:
                        error_text = await response.text()
                        print(f"   ❌ Categories failed: {error_text}")
                        
            except Exception as e:
                print(f"   ❌ Categories test failed: {e}")
            
            # Test 6: CORS headers
            print("\n🌐 Testing CORS headers...")
            try:
                headers = {
                    'Origin': 'http://localhost:3000',
                    'Access-Control-Request-Method': 'GET'
                }
                
                async with session.options(f"{base_url}/api/products/", headers=headers) as response:
                    print(f"   OPTIONS Status: {response.status}")
                    cors_headers = {
                        'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
                        'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
                        'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers')
                    }
                    print(f"   CORS Headers: {cors_headers}")
                    
            except Exception as e:
                print(f"   ❌ CORS test failed: {e}")
            
            print(f"\n✅ API testing complete!")
            return True
            
        except Exception as e:
            print(f"\n❌ API testing failed: {e}")
            return False

async def main():
    """Main function to run all tests"""
    print("🧪 Backend API Test Suite")
    print("=" * 60)
    
    success = await test_products_api()
    
    if success:
        print("\n🎉 All tests completed!")
        print("\n💡 Next steps:")
        print("   1. If products are empty, run: python seed_database.py")
        print("   2. Start frontend: cd ../frontend && npm start")
        print("   3. Test in browser: http://localhost:3000")
    else:
        print("\n❌ Some tests failed!")
        print("\n🔧 Troubleshooting:")
        print("   1. Check if backend is running: ps aux | grep uvicorn")
        print("   2. Check backend logs for errors")
        print("   3. Verify MongoDB is running: systemctl status mongod")
        print("   4. Check .env configuration")
    
    return success

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
