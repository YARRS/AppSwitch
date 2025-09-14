#!/usr/bin/env python3
"""
Quick API test script
"""
import requests
import json

def test_api():
    """Test API endpoints"""
    base_url = "http://localhost:8001"
    
    print("🧪 Testing API Endpoints")
    print("=" * 40)
    
    try:
        # Test health endpoint
        print("1. Testing health endpoint...")
        response = requests.get(f"{base_url}/api/health", timeout=5)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            print(f"   Response: {response.json()}")
        else:
            print(f"   Error: {response.text}")
            
        # Test products endpoint
        print("\n2. Testing products endpoint...")
        response = requests.get(f"{base_url}/api/products/?per_page=3", timeout=5)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Success: {data.get('success', False)}")
            print(f"   Total products: {data.get('total', 0)}")
            print(f"   Products in response: {len(data.get('data', []))}")
        else:
            print(f"   Error: {response.text}")
            
        # Test categories endpoint  
        print("\n3. Testing categories endpoint...")
        response = requests.get(f"{base_url}/api/products/categories/available", timeout=5)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Categories: {len(data.get('data', []))}")
        else:
            print(f"   Error: {response.text}")
            
        print("\n✅ API testing completed!")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")

if __name__ == "__main__":
    test_api()
