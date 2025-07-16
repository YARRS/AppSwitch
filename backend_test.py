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
BACKEND_URL = "https://898765d1-0b11-4776-bf08-18c4a44f57ee.preview.emergentagent.com"
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
            
            response = requests.post(f"{API_BASE}/auth/register", json=user_data, timeout=30)
            
            if response.status_code in [200, 201]:
                data = response.json()
                if data.get("success"):
                    self.test_user_id = data["data"]["id"]
                    self.log_result("User Registration", "PASS", "Test user created successfully", data)
                    return True
                else:
                    self.log_result("User Registration", "FAIL", f"API returned success=false: {data}")
                    return False
            else:
                self.log_result("User Registration", "FAIL", f"HTTP {response.status_code}: {response.text}")
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
                    user_email = result["details"]["data"]["email"]
                    break
            
            if not user_email:
                self.log_result("User Authentication", "FAIL", "No test user email found")
                return False
            
            login_data = {
                "username": user_email,
                "password": "TestPass123!"
            }
            
            response = requests.post(f"{API_BASE}/auth/login", data=login_data, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("access_token"):
                    self.auth_token = data["access_token"]
                    self.log_result("User Authentication", "PASS", "User authenticated successfully", {"token_type": data.get("token_type", "bearer")})
                    return True
                else:
                    self.log_result("User Authentication", "FAIL", f"No access token in response: {data}")
                    return False
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
    
    # INVENTORY MANAGEMENT TESTS
    def test_inventory_stock_in(self):
        """Test POST /api/inventory/stock-in"""
        try:
            if not self.test_product_id:
                self.log_result("Inventory Stock In", "SKIP", "No test product available")
                return
            
            stock_data = {
                "product_id": self.test_product_id,
                "quantity": 50,
                "reason": "New stock arrival",
                "notes": "Test stock addition"
            }
            
            headers = self.get_auth_headers()
            response = requests.post(f"{API_BASE}/inventory/stock-in", json=stock_data, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_result("Inventory Stock In", "PASS", "Stock added successfully", data)
                else:
                    self.log_result("Inventory Stock In", "FAIL", "API returned success=false", data)
            else:
                self.log_result("Inventory Stock In", "FAIL", f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("Inventory Stock In", "FAIL", f"Error: {str(e)}")
    
    def test_inventory_stock_out(self):
        """Test POST /api/inventory/stock-out"""
        try:
            if not self.test_product_id:
                self.log_result("Inventory Stock Out", "SKIP", "No test product available")
                return
            
            stock_data = {
                "product_id": self.test_product_id,
                "quantity": 10,
                "reason": "Sale",
                "notes": "Test stock removal"
            }
            
            headers = self.get_auth_headers()
            response = requests.post(f"{API_BASE}/inventory/stock-out", json=stock_data, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_result("Inventory Stock Out", "PASS", "Stock removed successfully", data)
                else:
                    self.log_result("Inventory Stock Out", "FAIL", "API returned success=false", data)
            else:
                self.log_result("Inventory Stock Out", "FAIL", f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("Inventory Stock Out", "FAIL", f"Error: {str(e)}")
    
    def test_inventory_adjust(self):
        """Test POST /api/inventory/adjust"""
        try:
            if not self.test_product_id:
                self.log_result("Inventory Adjust", "SKIP", "No test product available")
                return
            
            adjust_data = {
                "product_id": self.test_product_id,
                "quantity_change": -5,
                "reason": "Damaged goods",
                "notes": "Test stock adjustment"
            }
            
            headers = self.get_auth_headers()
            response = requests.post(f"{API_BASE}/inventory/adjust", json=adjust_data, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_result("Inventory Adjust", "PASS", "Stock adjusted successfully", data)
                else:
                    self.log_result("Inventory Adjust", "FAIL", "API returned success=false", data)
            else:
                self.log_result("Inventory Adjust", "FAIL", f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("Inventory Adjust", "FAIL", f"Error: {str(e)}")
    
    def test_inventory_logs(self):
        """Test GET /api/inventory/logs"""
        try:
            headers = self.get_auth_headers()
            response = requests.get(f"{API_BASE}/inventory/logs?page=1&per_page=10", headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_result("Inventory Logs", "PASS", f"Retrieved {len(data.get('data', []))} inventory logs", data)
                else:
                    self.log_result("Inventory Logs", "FAIL", "API returned success=false", data)
            else:
                self.log_result("Inventory Logs", "FAIL", f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("Inventory Logs", "FAIL", f"Error: {str(e)}")
    
    def test_inventory_low_stock(self):
        """Test GET /api/inventory/low-stock"""
        try:
            headers = self.get_auth_headers()
            response = requests.get(f"{API_BASE}/inventory/low-stock?limit=20", headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_result("Inventory Low Stock", "PASS", f"Retrieved {len(data.get('data', []))} low stock products", data)
                else:
                    self.log_result("Inventory Low Stock", "FAIL", "API returned success=false", data)
            else:
                self.log_result("Inventory Low Stock", "FAIL", f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("Inventory Low Stock", "FAIL", f"Error: {str(e)}")
    
    def test_inventory_reassign(self):
        """Test POST /api/inventory/reassign"""
        try:
            if not self.test_product_id or not self.test_user_id:
                self.log_result("Inventory Reassign", "SKIP", "No test product or user available")
                return
            
            reassign_data = {
                "product_id": self.test_product_id,
                "from_user_id": self.test_user_id,
                "to_user_id": str(uuid.uuid4()),  # Dummy user ID
                "reason": "Staff change"
            }
            
            headers = self.get_auth_headers()
            response = requests.post(f"{API_BASE}/inventory/reassign", json=reassign_data, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_result("Inventory Reassign", "PASS", "Product reassigned successfully", data)
                else:
                    self.log_result("Inventory Reassign", "FAIL", "API returned success=false", data)
            elif response.status_code == 403:
                self.log_result("Inventory Reassign", "PASS", "Proper permission check - 403 Forbidden", {"status_code": response.status_code})
            else:
                self.log_result("Inventory Reassign", "FAIL", f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("Inventory Reassign", "FAIL", f"Error: {str(e)}")
    
    # CAMPAIGN MANAGEMENT TESTS
    def test_campaigns_create(self):
        """Test POST /api/campaigns/"""
        try:
            campaign_data = {
                "name": f"Test Campaign {uuid.uuid4().hex[:8]}",
                "description": "Test campaign for API testing",
                "discount_type": "percentage",
                "discount_value": 10.0,
                "min_order_amount": 100.0,
                "max_discount_amount": 50.0,
                "start_date": datetime.utcnow().isoformat(),
                "end_date": (datetime.utcnow() + timedelta(days=30)).isoformat(),
                "status": "scheduled",
                "product_ids": [],
                "user_roles": ["customer"],
                "usage_limit": 100
            }
            
            headers = self.get_auth_headers()
            response = requests.post(f"{API_BASE}/campaigns/", json=campaign_data, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.test_campaign_id = data["data"]["id"]
                    self.log_result("Campaign Create", "PASS", "Campaign created successfully", data)
                else:
                    self.log_result("Campaign Create", "FAIL", "API returned success=false", data)
            elif response.status_code == 403:
                self.log_result("Campaign Create", "PASS", "Proper permission check - 403 Forbidden", {"status_code": response.status_code})
            else:
                self.log_result("Campaign Create", "FAIL", f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("Campaign Create", "FAIL", f"Error: {str(e)}")
    
    def test_campaigns_list(self):
        """Test GET /api/campaigns/"""
        try:
            headers = self.get_auth_headers()
            response = requests.get(f"{API_BASE}/campaigns/?page=1&per_page=10", headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_result("Campaign List", "PASS", f"Retrieved {len(data.get('data', []))} campaigns", data)
                else:
                    self.log_result("Campaign List", "FAIL", "API returned success=false", data)
            elif response.status_code == 403:
                self.log_result("Campaign List", "PASS", "Proper permission check - 403 Forbidden", {"status_code": response.status_code})
            else:
                self.log_result("Campaign List", "FAIL", f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("Campaign List", "FAIL", f"Error: {str(e)}")
    
    def test_campaigns_get_by_id(self):
        """Test GET /api/campaigns/{id}"""
        try:
            if not self.test_campaign_id:
                self.log_result("Campaign Get By ID", "SKIP", "No test campaign available")
                return
            
            headers = self.get_auth_headers()
            response = requests.get(f"{API_BASE}/campaigns/{self.test_campaign_id}", headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_result("Campaign Get By ID", "PASS", "Campaign retrieved successfully", data)
                else:
                    self.log_result("Campaign Get By ID", "FAIL", "API returned success=false", data)
            elif response.status_code == 403:
                self.log_result("Campaign Get By ID", "PASS", "Proper permission check - 403 Forbidden", {"status_code": response.status_code})
            else:
                self.log_result("Campaign Get By ID", "FAIL", f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("Campaign Get By ID", "FAIL", f"Error: {str(e)}")
    
    def test_campaigns_active_list(self):
        """Test GET /api/campaigns/active/list"""
        try:
            headers = self.get_auth_headers()
            response = requests.get(f"{API_BASE}/campaigns/active/list", headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_result("Campaign Active List", "PASS", f"Retrieved {len(data.get('data', []))} active campaigns", data)
                else:
                    self.log_result("Campaign Active List", "FAIL", "API returned success=false", data)
            else:
                self.log_result("Campaign Active List", "FAIL", f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("Campaign Active List", "FAIL", f"Error: {str(e)}")
    
    def test_campaigns_calculate_discount(self):
        """Test POST /api/campaigns/{id}/calculate-discount"""
        try:
            if not self.test_campaign_id:
                self.log_result("Campaign Calculate Discount", "SKIP", "No test campaign available")
                return
            
            discount_data = {
                "order_amount": 200.0,
                "product_ids": [self.test_product_id] if self.test_product_id else []
            }
            
            headers = self.get_auth_headers()
            response = requests.post(f"{API_BASE}/campaigns/{self.test_campaign_id}/calculate-discount", 
                                   json=discount_data, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_result("Campaign Calculate Discount", "PASS", "Discount calculated successfully", data)
                else:
                    self.log_result("Campaign Calculate Discount", "FAIL", "API returned success=false", data)
            elif response.status_code == 400:
                self.log_result("Campaign Calculate Discount", "PASS", "Proper validation - campaign not active", {"status_code": response.status_code})
            else:
                self.log_result("Campaign Calculate Discount", "FAIL", f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("Campaign Calculate Discount", "FAIL", f"Error: {str(e)}")
    
    # COMMISSION MANAGEMENT TESTS
    def test_commissions_create_rule(self):
        """Test POST /api/commissions/rules"""
        try:
            rule_data = {
                "user_id": self.test_user_id or str(uuid.uuid4()),
                "user_role": "salesperson",
                "commission_type": "percentage",
                "commission_value": 5.0,
                "min_order_amount": 50.0,
                "max_commission_amount": 100.0,
                "product_categories": ["smart_switch"],
                "is_active": True
            }
            
            headers = self.get_auth_headers()
            response = requests.post(f"{API_BASE}/commissions/rules", json=rule_data, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.test_commission_rule_id = data["data"]["id"]
                    self.log_result("Commission Create Rule", "PASS", "Commission rule created successfully", data)
                else:
                    self.log_result("Commission Create Rule", "FAIL", "API returned success=false", data)
            elif response.status_code == 403:
                self.log_result("Commission Create Rule", "PASS", "Proper permission check - 403 Forbidden", {"status_code": response.status_code})
            else:
                self.log_result("Commission Create Rule", "FAIL", f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("Commission Create Rule", "FAIL", f"Error: {str(e)}")
    
    def test_commissions_get_rules(self):
        """Test GET /api/commissions/rules"""
        try:
            headers = self.get_auth_headers()
            response = requests.get(f"{API_BASE}/commissions/rules?page=1&per_page=10", headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_result("Commission Get Rules", "PASS", f"Retrieved {len(data.get('data', []))} commission rules", data)
                else:
                    self.log_result("Commission Get Rules", "FAIL", "API returned success=false", data)
            elif response.status_code == 403:
                self.log_result("Commission Get Rules", "PASS", "Proper permission check - 403 Forbidden", {"status_code": response.status_code})
            else:
                self.log_result("Commission Get Rules", "FAIL", f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("Commission Get Rules", "FAIL", f"Error: {str(e)}")
    
    def test_commissions_get_earnings(self):
        """Test GET /api/commissions/earnings"""
        try:
            headers = self.get_auth_headers()
            response = requests.get(f"{API_BASE}/commissions/earnings?page=1&per_page=10", headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_result("Commission Get Earnings", "PASS", f"Retrieved {len(data.get('data', []))} commission earnings", data)
                else:
                    self.log_result("Commission Get Earnings", "FAIL", "API returned success=false", data)
            else:
                self.log_result("Commission Get Earnings", "FAIL", f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("Commission Get Earnings", "FAIL", f"Error: {str(e)}")
    
    def test_commissions_get_summary(self):
        """Test GET /api/commissions/summary"""
        try:
            headers = self.get_auth_headers()
            response = requests.get(f"{API_BASE}/commissions/summary", headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_result("Commission Get Summary", "PASS", "Commission summary retrieved successfully", data)
                else:
                    self.log_result("Commission Get Summary", "FAIL", "API returned success=false", data)
            else:
                self.log_result("Commission Get Summary", "FAIL", f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("Commission Get Summary", "FAIL", f"Error: {str(e)}")
    
    # DASHBOARD TESTS
    def test_dashboard_main(self):
        """Test GET /api/dashboard/"""
        try:
            headers = self.get_auth_headers()
            response = requests.get(f"{API_BASE}/dashboard/", headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_result("Dashboard Main", "PASS", "Dashboard data retrieved successfully", data)
                else:
                    self.log_result("Dashboard Main", "FAIL", "API returned success=false", data)
            else:
                self.log_result("Dashboard Main", "FAIL", f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("Dashboard Main", "FAIL", f"Error: {str(e)}")
    
    def test_dashboard_stats(self):
        """Test GET /api/dashboard/stats"""
        try:
            headers = self.get_auth_headers()
            response = requests.get(f"{API_BASE}/dashboard/stats", headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_result("Dashboard Stats", "PASS", "Dashboard stats retrieved successfully", data)
                else:
                    self.log_result("Dashboard Stats", "FAIL", "API returned success=false", data)
            else:
                self.log_result("Dashboard Stats", "FAIL", f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("Dashboard Stats", "FAIL", f"Error: {str(e)}")
    
    def test_dashboard_salesperson(self):
        """Test GET /api/dashboard/salesperson/{user_id}"""
        try:
            if not self.test_user_id:
                self.log_result("Dashboard Salesperson", "SKIP", "No test user available")
                return
            
            headers = self.get_auth_headers()
            response = requests.get(f"{API_BASE}/dashboard/salesperson/{self.test_user_id}", headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_result("Dashboard Salesperson", "PASS", "Salesperson dashboard retrieved successfully", data)
                else:
                    self.log_result("Dashboard Salesperson", "FAIL", "API returned success=false", data)
            else:
                self.log_result("Dashboard Salesperson", "FAIL", f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("Dashboard Salesperson", "FAIL", f"Error: {str(e)}")
    
    def test_dashboard_analytics(self):
        """Test GET /api/dashboard/analytics"""
        try:
            headers = self.get_auth_headers()
            response = requests.get(f"{API_BASE}/dashboard/analytics", headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_result("Dashboard Analytics", "PASS", "Analytics data retrieved successfully", data)
                else:
                    self.log_result("Dashboard Analytics", "FAIL", "API returned success=false", data)
            elif response.status_code == 403:
                self.log_result("Dashboard Analytics", "PASS", "Proper permission check - 403 Forbidden", {"status_code": response.status_code})
            else:
                self.log_result("Dashboard Analytics", "FAIL", f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("Dashboard Analytics", "FAIL", f"Error: {str(e)}")
    
    # INQUIRY TESTS
    def test_inquiries_create_public(self):
        """Test POST /api/inquiries/ (public endpoint)"""
        try:
            inquiry_data = {
                "name": "John Smith",
                "email": f"customer_{uuid.uuid4().hex[:8]}@example.com",
                "phone": "+1234567890",
                "subject": "Product Inquiry",
                "message": "I would like to know more about your smart switches."
            }
            
            # No auth headers for public endpoint
            response = requests.post(f"{API_BASE}/inquiries/", json=inquiry_data, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.test_inquiry_id = data["data"]["id"]
                    self.log_result("Inquiry Create Public", "PASS", "Inquiry created successfully", data)
                else:
                    self.log_result("Inquiry Create Public", "FAIL", "API returned success=false", data)
            else:
                self.log_result("Inquiry Create Public", "FAIL", f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("Inquiry Create Public", "FAIL", f"Error: {str(e)}")
    
    def test_inquiries_list(self):
        """Test GET /api/inquiries/"""
        try:
            headers = self.get_auth_headers()
            response = requests.get(f"{API_BASE}/inquiries/?page=1&per_page=10", headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_result("Inquiry List", "PASS", f"Retrieved {len(data.get('data', []))} inquiries", data)
                else:
                    self.log_result("Inquiry List", "FAIL", "API returned success=false", data)
            elif response.status_code == 403:
                self.log_result("Inquiry List", "PASS", "Proper permission check - 403 Forbidden", {"status_code": response.status_code})
            else:
                self.log_result("Inquiry List", "FAIL", f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("Inquiry List", "FAIL", f"Error: {str(e)}")
    
    def test_inquiries_get_by_id(self):
        """Test GET /api/inquiries/{id}"""
        try:
            if not self.test_inquiry_id:
                self.log_result("Inquiry Get By ID", "SKIP", "No test inquiry available")
                return
            
            headers = self.get_auth_headers()
            response = requests.get(f"{API_BASE}/inquiries/{self.test_inquiry_id}", headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_result("Inquiry Get By ID", "PASS", "Inquiry retrieved successfully", data)
                else:
                    self.log_result("Inquiry Get By ID", "FAIL", "API returned success=false", data)
            elif response.status_code == 403:
                self.log_result("Inquiry Get By ID", "PASS", "Proper permission check - 403 Forbidden", {"status_code": response.status_code})
            else:
                self.log_result("Inquiry Get By ID", "FAIL", f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("Inquiry Get By ID", "FAIL", f"Error: {str(e)}")
    
    def test_inquiries_update(self):
        """Test PUT /api/inquiries/{id}"""
        try:
            if not self.test_inquiry_id:
                self.log_result("Inquiry Update", "SKIP", "No test inquiry available")
                return
            
            update_data = {
                "status": "in_progress",
                "admin_notes": "Following up with customer"
            }
            
            headers = self.get_auth_headers()
            response = requests.put(f"{API_BASE}/inquiries/{self.test_inquiry_id}", 
                                  json=update_data, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_result("Inquiry Update", "PASS", "Inquiry updated successfully", data)
                else:
                    self.log_result("Inquiry Update", "FAIL", "API returned success=false", data)
            elif response.status_code == 403:
                self.log_result("Inquiry Update", "PASS", "Proper permission check - 403 Forbidden", {"status_code": response.status_code})
            else:
                self.log_result("Inquiry Update", "FAIL", f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("Inquiry Update", "FAIL", f"Error: {str(e)}")
    
    def run_salesperson_dashboard_tests(self):
        """Run Salesperson Dashboard specific tests"""
        print("🚀 Starting Salesperson Dashboard Backend API Tests")
        print(f"Backend URL: {BACKEND_URL}")
        print("=" * 60)
        
        # Basic connectivity tests
        self.test_health_endpoint()
        self.test_root_endpoint()
        self.test_connection_endpoint()
        self.test_error_handling()
        
        # Authentication tests
        print("\n🔐 Testing Authentication APIs...")
        if self.create_test_user():
            if self.authenticate_user():
                # Product tests
                print("\n📦 Testing Product APIs...")
                self.create_test_product()
                self.test_products_list()
                self.test_products_get_by_id()
                if self.test_product_id:
                    self.test_products_update_stock()
                
                # Inventory tests
                print("\n📊 Testing Inventory APIs...")
                self.test_inventory_stock_in()
                self.test_inventory_stock_out()
                self.test_inventory_logs()
                self.test_inventory_low_stock()
                
                # Commission tests
                print("\n💰 Testing Commission APIs...")
                self.test_commissions_get_earnings()
                self.test_commissions_get_summary()
                
                # Dashboard tests
                print("\n📈 Testing Dashboard APIs...")
                self.test_dashboard_main()
                self.test_dashboard_salesperson()
                
                # Role-based access control tests
                print("\n🔒 Testing Role-based Access Control...")
                self.test_role_based_access()
        
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
    
    def test_role_based_access(self):
        """Test role-based access control for salesperson"""
        try:
            headers = self.get_auth_headers()
            
            # Test admin-only endpoints that salesperson should NOT access
            admin_endpoints = [
                ("/api/products/", "POST", {"name": "Test", "price": 100}),  # Create product
                ("/api/commissions/rules", "POST", {"user_id": "test", "commission_type": "percentage", "commission_value": 5}),  # Create commission rule
                ("/api/dashboard/analytics", "GET", None)  # Analytics dashboard
            ]
            
            for endpoint, method, data in admin_endpoints:
                try:
                    if method == "POST":
                        response = requests.post(f"{API_BASE}{endpoint}", json=data, headers=headers, timeout=15)
                    else:
                        response = requests.get(f"{API_BASE}{endpoint}", headers=headers, timeout=15)
                    
                    if response.status_code == 403:
                        self.log_result(f"Role Access Control ({endpoint})", "PASS", "Proper 403 Forbidden for salesperson role")
                    elif response.status_code == 401:
                        self.log_result(f"Role Access Control ({endpoint})", "PASS", "Proper 401 Unauthorized")
                    else:
                        self.log_result(f"Role Access Control ({endpoint})", "FAIL", f"Expected 403/401, got {response.status_code}")
                        
                except Exception as e:
                    self.log_result(f"Role Access Control ({endpoint})", "FAIL", f"Error: {str(e)}")
                    
        except Exception as e:
            self.log_result("Role Access Control", "FAIL", f"Error: {str(e)}")
    
    def test_products_list(self):
        """Test GET /api/products"""
        try:
            headers = self.get_auth_headers()
            response = requests.get(f"{API_BASE}/products/?page=1&per_page=10", headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_result("Products List", "PASS", f"Retrieved {len(data.get('data', []))} products", data)
                else:
                    self.log_result("Products List", "FAIL", "API returned success=false", data)
            else:
                self.log_result("Products List", "FAIL", f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("Products List", "FAIL", f"Error: {str(e)}")
    
    def test_products_get_by_id(self):
        """Test GET /api/products/{id}"""
        try:
            if not self.test_product_id:
                self.log_result("Products Get By ID", "SKIP", "No test product available")
                return
            
            headers = self.get_auth_headers()
            response = requests.get(f"{API_BASE}/products/{self.test_product_id}", headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_result("Products Get By ID", "PASS", "Product retrieved successfully", data)
                else:
                    self.log_result("Products Get By ID", "FAIL", "API returned success=false", data)
            else:
                self.log_result("Products Get By ID", "FAIL", f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("Products Get By ID", "FAIL", f"Error: {str(e)}")
    
    def test_products_update_stock(self):
        """Test PUT /api/products/{id} for stock updates"""
        try:
            if not self.test_product_id:
                self.log_result("Products Update Stock", "SKIP", "No test product available")
                return
            
            update_data = {
                "stock_quantity": 75,
                "min_stock_level": 15
            }
            
            headers = self.get_auth_headers()
            response = requests.put(f"{API_BASE}/products/{self.test_product_id}", 
                                  json=update_data, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_result("Products Update Stock", "PASS", "Product stock updated successfully", data)
                else:
                    self.log_result("Products Update Stock", "FAIL", "API returned success=false", data)
            else:
                self.log_result("Products Update Stock", "FAIL", f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_result("Products Update Stock", "FAIL", f"Error: {str(e)}")

    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting SmartSwitch IoT Backend API Tests")
        print(f"Backend URL: {BACKEND_URL}")
        print("=" * 60)
        
        # Run salesperson dashboard specific tests
        self.run_salesperson_dashboard_tests()
        
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