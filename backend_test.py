#!/usr/bin/env python3
"""
Backend API Testing Script for SmartSwitch IoT Advanced E-commerce System
Tests all new API endpoints including inventory, campaigns, commissions, dashboard, and inquiries
"""

import requests
import json
import sys
from datetime import datetime, timedelta
import random
import string
import uuid

# Backend URL from frontend .env
BACKEND_URL = "https://b10e2e92-18e0-431f-80c5-732bab767d6c.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

class BackendTester:
    def __init__(self):
        self.results = []
        self.total_tests = 0
        self.passed_tests = 0
        self.failed_tests = 0
        self.auth_token = None
        self.test_user_id = None
        self.test_product_id = None
        self.test_campaign_id = None
        self.test_commission_rule_id = None
        self.test_inquiry_id = None
        
    def log_result(self, test_name, status, message, details=None):
        """Log test result"""
        result = {
            "test": test_name,
            "status": status,
            "message": message,
            "timestamp": datetime.now().isoformat(),
            "details": details
        }
        self.results.append(result)
        self.total_tests += 1
        
        if status == "PASS":
            self.passed_tests += 1
            print(f"✅ {test_name}: {message}")
        else:
            self.failed_tests += 1
            print(f"❌ {test_name}: {message}")
            if details:
                print(f"   Details: {details}")
    
    def get_auth_headers(self):
        """Get authorization headers"""
        if self.auth_token:
            return {"Authorization": f"Bearer {self.auth_token}"}
        return {}
    
    def create_test_user(self):
        """Create a test user for authentication"""
        try:
            user_data = {
                "email": f"testuser_{uuid.uuid4().hex[:8]}@smartswitch.com",
                "username": f"testuser_{uuid.uuid4().hex[:8]}",
                "password": "TestPass123!",
                "full_name": "Test User",
                "phone": "+1234567890",
                "role": "salesperson"
            }
            
            response = requests.post(f"{API_BASE}/auth/register", json=user_data, timeout=10)
            
            if response.status_code == 201:
                data = response.json()
                self.test_user_id = data["data"]["user"]["id"]
                self.log_result("User Registration", "PASS", "Test user created successfully", data)
                return True
            else:
                self.log_result("User Registration", "FAIL", f"Failed to create user: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("User Registration", "FAIL", f"Error creating user: {str(e)}")
            return False
    
    def authenticate_user(self):
        """Authenticate test user and get token"""
        try:
            if not self.test_user_id:
                return False
                
            # Get user email from previous registration
            user_email = None
            for result in self.results:
                if result["test"] == "User Registration" and result["status"] == "PASS":
                    user_email = result["details"]["data"]["user"]["email"]
                    break
            
            if not user_email:
                self.log_result("User Authentication", "FAIL", "No test user email found")
                return False
            
            login_data = {
                "username": user_email,
                "password": "TestPass123!"
            }
            
            response = requests.post(f"{API_BASE}/auth/login", data=login_data, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                self.auth_token = data["access_token"]
                self.log_result("User Authentication", "PASS", "User authenticated successfully", {"token_type": data["token_type"]})
                return True
            else:
                self.log_result("User Authentication", "FAIL", f"Authentication failed: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("User Authentication", "FAIL", f"Error authenticating user: {str(e)}")
            return False
    
    def create_test_product(self):
        """Create a test product for inventory testing"""
        try:
            product_data = {
                "name": f"Test Smart Switch {uuid.uuid4().hex[:8]}",
                "description": "Test smart switch for API testing",
                "category": "smart_switch",
                "price": 99.99,
                "sku": f"TSW-{uuid.uuid4().hex[:8].upper()}",
                "brand": "SmartSwitch",
                "stock_quantity": 100,
                "min_stock_level": 10,
                "specifications": {"voltage": "220V", "wireless": "WiFi"},
                "features": ["Voice Control", "App Control", "Timer"],
                "is_active": True
            }
            
            headers = self.get_auth_headers()
            response = requests.post(f"{API_BASE}/products/", json=product_data, headers=headers, timeout=10)
            
            if response.status_code == 201:
                data = response.json()
                self.test_product_id = data["data"]["id"]
                self.log_result("Product Creation", "PASS", "Test product created successfully", {"product_id": self.test_product_id})
                return True
            else:
                self.log_result("Product Creation", "FAIL", f"Failed to create product: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Product Creation", "FAIL", f"Error creating product: {str(e)}")
            return False
    
    def test_health_endpoint(self):
        """Test /api/health endpoint for database connection"""
        try:
            response = requests.get(f"{API_BASE}/health", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "healthy" and data.get("database") == "connected":
                    self.log_result(
                        "Health Check", 
                        "PASS", 
                        "Database connection healthy",
                        data
                    )
                else:
                    self.log_result(
                        "Health Check", 
                        "FAIL", 
                        "Health check returned unexpected data",
                        data
                    )
            else:
                self.log_result(
                    "Health Check", 
                    "FAIL", 
                    f"HTTP {response.status_code}: {response.text}",
                    {"status_code": response.status_code}
                )
                
        except requests.exceptions.RequestException as e:
            self.log_result(
                "Health Check", 
                "FAIL", 
                f"Connection error: {str(e)}",
                {"error_type": type(e).__name__}
            )
    
    def test_root_endpoint(self):
        """Test /api/ endpoint for basic API info"""
        try:
            response = requests.get(f"{API_BASE}/", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if "message" in data and "version" in data:
                    self.log_result(
                        "Root Endpoint", 
                        "PASS", 
                        "API info returned successfully",
                        data
                    )
                else:
                    self.log_result(
                        "Root Endpoint", 
                        "FAIL", 
                        "Missing required fields in response",
                        data
                    )
            else:
                self.log_result(
                    "Root Endpoint", 
                    "FAIL", 
                    f"HTTP {response.status_code}: {response.text}",
                    {"status_code": response.status_code}
                )
                
        except requests.exceptions.RequestException as e:
            self.log_result(
                "Root Endpoint", 
                "FAIL", 
                f"Connection error: {str(e)}",
                {"error_type": type(e).__name__}
            )
    
    def test_connection_endpoint(self):
        """Test /api/test endpoint for frontend connectivity"""
        try:
            response = requests.get(f"{API_BASE}/test", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if "message" in data and "status" in data:
                    self.log_result(
                        "Test Connection", 
                        "PASS", 
                        "Frontend connectivity test successful",
                        data
                    )
                else:
                    self.log_result(
                        "Test Connection", 
                        "FAIL", 
                        "Missing required fields in response",
                        data
                    )
            else:
                self.log_result(
                    "Test Connection", 
                    "FAIL", 
                    f"HTTP {response.status_code}: {response.text}",
                    {"status_code": response.status_code}
                )
                
        except requests.exceptions.RequestException as e:
            self.log_result(
                "Test Connection", 
                "FAIL", 
                f"Connection error: {str(e)}",
                {"error_type": type(e).__name__}
            )
    
    def test_error_handling(self):
        """Test invalid endpoints for proper error responses"""
        invalid_endpoints = [
            "/api/nonexistent",
            "/api/invalid/path",
            "/api/users/999999"
        ]
        
        for endpoint in invalid_endpoints:
            try:
                response = requests.get(f"{BACKEND_URL}{endpoint}", timeout=10)
                
                if response.status_code == 404:
                    self.log_result(
                        f"Error Handling ({endpoint})", 
                        "PASS", 
                        "Proper 404 error returned for invalid endpoint",
                        {"status_code": response.status_code}
                    )
                else:
                    self.log_result(
                        f"Error Handling ({endpoint})", 
                        "FAIL", 
                        f"Expected 404, got {response.status_code}",
                        {"status_code": response.status_code, "response": response.text}
                    )
                    
            except requests.exceptions.RequestException as e:
                self.log_result(
                    f"Error Handling ({endpoint})", 
                    "FAIL", 
                    f"Connection error: {str(e)}",
                    {"error_type": type(e).__name__}
                )
    
    def test_cors_configuration(self):
        """Test CORS configuration for frontend access"""
        try:
            # Test preflight request
            headers = {
                'Origin': 'http://localhost:3000',
                'Access-Control-Request-Method': 'GET',
                'Access-Control-Request-Headers': 'Content-Type'
            }
            
            response = requests.options(f"{API_BASE}/health", headers=headers, timeout=10)
            
            cors_headers = {
                'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
                'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
                'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers')
            }
            
            if cors_headers['Access-Control-Allow-Origin']:
                self.log_result(
                    "CORS Configuration", 
                    "PASS", 
                    "CORS headers properly configured",
                    cors_headers
                )
            else:
                self.log_result(
                    "CORS Configuration", 
                    "FAIL", 
                    "CORS headers missing or misconfigured",
                    cors_headers
                )
                
        except requests.exceptions.RequestException as e:
            self.log_result(
                "CORS Configuration", 
                "FAIL", 
                f"Connection error: {str(e)}",
                {"error_type": type(e).__name__}
            )
    
    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting SmartSwitch IoT Backend API Tests")
        print(f"Backend URL: {BACKEND_URL}")
        print("=" * 60)
        
        # Run all tests
        self.test_health_endpoint()
        self.test_root_endpoint()
        self.test_connection_endpoint()
        self.test_error_handling()
        self.test_cors_configuration()
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {self.total_tests}")
        print(f"Passed: {self.passed_tests}")
        print(f"Failed: {self.failed_tests}")
        print(f"Success Rate: {(self.passed_tests/self.total_tests)*100:.1f}%")
        
        # Print detailed results
        print("\n📋 DETAILED RESULTS:")
        for result in self.results:
            status_icon = "✅" if result["status"] == "PASS" else "❌"
            print(f"{status_icon} {result['test']}: {result['message']}")
        
        return self.failed_tests == 0

if __name__ == "__main__":
    tester = BackendTester()
    success = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)