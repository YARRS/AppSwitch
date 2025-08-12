#!/usr/bin/env python3
"""
Backend API Testing Script for Authentication and Order Placement
FOCUS: Testing authentication system and order placement for logged-in users
Testing seeded user credentials and order creation functionality.
"""

import requests
import json
import sys
from datetime import datetime, timedelta
import random
import string
import uuid
import time

# Backend URL from frontend .env
BACKEND_URL = "https://order-auth-fix.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

# Auto-seeded user credentials for testing (from seed_database.py)
AUTO_SEEDED_USERS = [
    {"email": "customer@vallmark.com", "password": "Customer123!", "role": "customer"},
    {"email": "admin@vallmark.com", "password": "Admin123!", "role": "admin"},
    {"email": "superadmin@vallmark.com", "password": "SuperAdmin123!", "role": "super_admin"},
    {"email": "storeowner@vallmark.com", "password": "StoreOwner123!", "role": "store_owner"},
    {"email": "storemanager@vallmark.com", "password": "StoreManager123!", "role": "store_admin"},
    {"email": "salesperson@vallmark.com", "password": "Salesperson123!", "role": "salesperson"},
    {"email": "salesmanager@vallmark.com", "password": "SalesManager123!", "role": "sales_manager"},
    {"email": "support@vallmark.com", "password": "Support123!", "role": "support_executive"},
    {"email": "marketing@vallmark.com", "password": "Marketing123!", "role": "marketing_manager"}
]

class AuthOrderTester:
    def __init__(self):
        self.results = []
        self.total_tests = 0
        self.passed_tests = 0
        self.failed_tests = 0
        self.auth_tokens = {}  # Store tokens for different users
        self.test_products = []  # Store test products for order testing
        self.created_orders = []  # Track created orders
        
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
        elif status == "FAIL":
            self.failed_tests += 1
            print(f"❌ {test_name}: {message}")
            if details:
                print(f"   Details: {details}")
        else:  # SKIP or other
            print(f"⚠️ {test_name}: {message}")
            if details:
                print(f"   Details: {details}")
    
    def test_health_check(self):
        """Test basic health check endpoint"""
        try:
            response = requests.get(f"{API_BASE}/health", timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "healthy" and data.get("database") == "connected":
                    self.log_result("Health Check", "PASS", "Backend and database are healthy")
                    return True
                else:
                    self.log_result("Health Check", "FAIL", "Health check returned unhealthy status", data)
                    return False
            else:
                self.log_result("Health Check", "FAIL", f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Health Check", "FAIL", f"Error checking health: {str(e)}")
            return False
    
    def authenticate_user(self, email, password, role_name):
        """Authenticate user and store token"""
        try:
            login_data = {
                "username": email,
                "password": password
            }
            
            response = requests.post(f"{API_BASE}/auth/login", data=login_data, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("access_token"):
                    self.auth_tokens[role_name] = {
                        "token": data["access_token"],
                        "user": data.get("user", {}),
                        "expires_in": data.get("expires_in", 86400)
                    }
                    user_info = data.get("user", {})
                    self.log_result(
                        f"Authentication ({role_name})", 
                        "PASS", 
                        f"Successfully authenticated {role_name} - {user_info.get('full_name', email)}",
                        {
                            "user_id": user_info.get("id"),
                            "email": user_info.get("email"),
                            "role": user_info.get("role"),
                            "token_expires_in": data.get("expires_in")
                        }
                    )
                    return True
                else:
                    self.log_result(f"Authentication ({role_name})", "FAIL", f"No access token in response for {role_name}")
                    return False
            else:
                self.log_result(f"Authentication ({role_name})", "FAIL", f"Authentication failed for {role_name}: HTTP {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log_result(f"Authentication ({role_name})", "FAIL", f"Error authenticating {role_name}: {str(e)}")
            return False
    
    def get_auth_headers(self, role_name):
        """Get authorization headers for a specific role"""
        token_data = self.auth_tokens.get(role_name)
        if token_data:
            return {"Authorization": f"Bearer {token_data['token']}"}
        return {}
    
    def test_jwt_token_validation(self, role_name):
        """Test JWT token validation by accessing protected endpoint"""
        try:
            headers = self.get_auth_headers(role_name)
            if not headers:
                self.log_result(f"JWT Token Validation ({role_name})", "SKIP", f"No auth token for {role_name}")
                return False
            
            # Test /auth/me endpoint which requires valid JWT
            response = requests.get(f"{API_BASE}/auth/me", headers=headers, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                user_info = data
                self.log_result(
                    f"JWT Token Validation ({role_name})", 
                    "PASS", 
                    f"JWT token valid - retrieved user info for {user_info.get('full_name', 'Unknown')}",
                    {
                        "user_id": user_info.get("id"),
                        "email": user_info.get("email"),
                        "role": user_info.get("role"),
                        "is_active": user_info.get("is_active")
                    }
                )
                return True
            else:
                self.log_result(f"JWT Token Validation ({role_name})", "FAIL", f"JWT validation failed: HTTP {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log_result(f"JWT Token Validation ({role_name})", "FAIL", f"Error validating JWT for {role_name}: {str(e)}")
            return False
    
    def get_test_products(self):
        """Get available products for order testing"""
        try:
            response = requests.get(f"{API_BASE}/products/?is_active=true&per_page=5", timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    products = data.get("data", [])
                    self.test_products = products[:3]  # Use first 3 products for testing
                    self.log_result(
                        "Get Test Products", 
                        "PASS", 
                        f"Retrieved {len(self.test_products)} products for order testing",
                        {
                            "product_count": len(self.test_products),
                            "products": [{"id": p.get("id"), "name": p.get("name"), "price": p.get("price")} for p in self.test_products]
                        }
                    )
                    return True
                else:
                    self.log_result("Get Test Products", "FAIL", "API returned success=false", data)
                    return False
            else:
                self.log_result("Get Test Products", "FAIL", f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Get Test Products", "FAIL", f"Error retrieving products: {str(e)}")
            return False
    
    def test_order_creation(self, role_name):
        """Test order creation for authenticated user"""
        try:
            headers = self.get_auth_headers(role_name)
            if not headers:
                self.log_result(f"Order Creation ({role_name})", "SKIP", f"No auth token for {role_name}")
                return False
            
            if not self.test_products:
                self.log_result(f"Order Creation ({role_name})", "SKIP", "No test products available")
                return False
            
            # Create order with first available product
            product = self.test_products[0]
            
            # Create realistic order data
            order_data = {
                "items": [
                    {
                        "product_id": product["id"],
                        "product_name": product["name"],
                        "quantity": 2,
                        "unit_price": product["price"],
                        "total_price": product["price"] * 2
                    }
                ],
                "shipping_address": {
                    "full_name": f"Test Customer {role_name.title()}",
                    "address_line_1": "123 Smart Switch Lane",
                    "address_line_2": "Suite 456",
                    "city": "Tech City",
                    "state": "CA",
                    "postal_code": "90210",
                    "country": "USA",
                    "phone": "555-123-4567"
                },
                "total_amount": product["price"] * 2,
                "tax_amount": product["price"] * 2 * 0.08,  # 8% tax
                "shipping_cost": 10.00,
                "discount_amount": 0.0,
                "final_amount": (product["price"] * 2) + (product["price"] * 2 * 0.08) + 10.00,
                "payment_method": "COD",
                "notes": f"Test order created by {role_name} user for authentication testing"
            }
            
            response = requests.post(f"{API_BASE}/orders/", json=order_data, headers=headers, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    order_info = data.get("data", {})
                    self.created_orders.append({
                        "id": order_info.get("id"),
                        "order_number": order_info.get("order_number"),
                        "role": role_name,
                        "total_amount": order_info.get("final_amount")
                    })
                    self.log_result(
                        f"Order Creation ({role_name})", 
                        "PASS", 
                        f"Successfully created order {order_info.get('order_number')} for ${order_info.get('final_amount', 0):.2f}",
                        {
                            "order_id": order_info.get("id"),
                            "order_number": order_info.get("order_number"),
                            "status": order_info.get("status"),
                            "total_amount": order_info.get("final_amount"),
                            "items_count": len(order_info.get("items", []))
                        }
                    )
                    return True
                else:
                    self.log_result(f"Order Creation ({role_name})", "FAIL", "API returned success=false", data)
                    return False
            else:
                self.log_result(f"Order Creation ({role_name})", "FAIL", f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result(f"Order Creation ({role_name})", "FAIL", f"Error creating order for {role_name}: {str(e)}")
            return False
    
    def test_order_retrieval(self, role_name):
        """Test order retrieval for authenticated user"""
        try:
            headers = self.get_auth_headers(role_name)
            if not headers:
                self.log_result(f"Order Retrieval ({role_name})", "SKIP", f"No auth token for {role_name}")
                return False
            
            # Get user's orders
            response = requests.get(f"{API_BASE}/orders/", headers=headers, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    orders = data.get("data", [])
                    total = data.get("total", 0)
                    
                    # Check if our created order is in the list
                    user_created_orders = [o for o in self.created_orders if o["role"] == role_name]
                    found_orders = 0
                    
                    for created_order in user_created_orders:
                        for order in orders:
                            if order.get("id") == created_order["id"]:
                                found_orders += 1
                                break
                    
                    self.log_result(
                        f"Order Retrieval ({role_name})", 
                        "PASS", 
                        f"Retrieved {len(orders)} orders (total: {total}), found {found_orders}/{len(user_created_orders)} created orders",
                        {
                            "retrieved_orders": len(orders),
                            "total_orders": total,
                            "found_created_orders": found_orders,
                            "expected_created_orders": len(user_created_orders)
                        }
                    )
                    return True
                else:
                    self.log_result(f"Order Retrieval ({role_name})", "FAIL", "API returned success=false", data)
                    return False
            else:
                self.log_result(f"Order Retrieval ({role_name})", "FAIL", f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result(f"Order Retrieval ({role_name})", "FAIL", f"Error retrieving orders for {role_name}: {str(e)}")
            return False
    
    def test_order_details(self, role_name):
        """Test individual order details retrieval"""
        try:
            headers = self.get_auth_headers(role_name)
            if not headers:
                self.log_result(f"Order Details ({role_name})", "SKIP", f"No auth token for {role_name}")
                return False
            
            # Find an order created by this user
            user_orders = [o for o in self.created_orders if o["role"] == role_name]
            if not user_orders:
                self.log_result(f"Order Details ({role_name})", "SKIP", f"No orders created by {role_name} to test")
                return False
            
            order = user_orders[0]
            order_id = order["id"]
            
            response = requests.get(f"{API_BASE}/orders/{order_id}", headers=headers, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    order_details = data.get("data", {})
                    self.log_result(
                        f"Order Details ({role_name})", 
                        "PASS", 
                        f"Retrieved order details for {order_details.get('order_number')}",
                        {
                            "order_id": order_details.get("id"),
                            "order_number": order_details.get("order_number"),
                            "status": order_details.get("status"),
                            "items_count": len(order_details.get("items", [])),
                            "total_amount": order_details.get("final_amount")
                        }
                    )
                    return True
                else:
                    self.log_result(f"Order Details ({role_name})", "FAIL", "API returned success=false", data)
                    return False
            else:
                self.log_result(f"Order Details ({role_name})", "FAIL", f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result(f"Order Details ({role_name})", "FAIL", f"Error retrieving order details for {role_name}: {str(e)}")
            return False
    
    def test_database_seeding_verification(self):
        """Test that auto-seeded users exist in database"""
        try:
            # Try to authenticate each seeded user to verify they exist
            seeded_users_found = 0
            seeded_users_total = len(AUTO_SEEDED_USERS)
            
            for user_data in AUTO_SEEDED_USERS:
                email = user_data["email"]
                password = user_data["password"]
                role = user_data["role"]
                
                login_data = {
                    "username": email,
                    "password": password
                }
                
                try:
                    response = requests.post(f"{API_BASE}/auth/login", data=login_data, timeout=30)
                    if response.status_code == 200:
                        data = response.json()
                        if data.get("access_token"):
                            seeded_users_found += 1
                except:
                    pass  # Count failed authentications
            
            if seeded_users_found == seeded_users_total:
                self.log_result(
                    "Database Seeding Verification", 
                    "PASS", 
                    f"All {seeded_users_total} auto-seeded users found and can authenticate",
                    {
                        "total_seeded_users": seeded_users_total,
                        "found_users": seeded_users_found,
                        "success_rate": "100%"
                    }
                )
                return True
            else:
                self.log_result(
                    "Database Seeding Verification", 
                    "FAIL", 
                    f"Only {seeded_users_found}/{seeded_users_total} auto-seeded users found",
                    {
                        "total_seeded_users": seeded_users_total,
                        "found_users": seeded_users_found,
                        "missing_users": seeded_users_total - seeded_users_found
                    }
                )
                return False
                
        except Exception as e:
            self.log_result("Database Seeding Verification", "FAIL", f"Error verifying seeded users: {str(e)}")
            return False
    
    def run_comprehensive_auth_order_test(self):
        """Run comprehensive authentication and order testing"""
        print("🚀 Starting Authentication and Order Placement Testing")
        print(f"Backend URL: {BACKEND_URL}")
        print("=" * 80)
        
        # Step 1: Health check
        print("\n🏥 Step 1: Health Check...")
        if not self.test_health_check():
            print("❌ Health check failed - cannot proceed")
            return False
        
        # Step 2: Database seeding verification
        print("\n🌱 Step 2: Database Seeding Verification...")
        self.test_database_seeding_verification()
        
        # Step 3: Authentication testing
        print("\n🔐 Step 3: Authentication Testing...")
        authenticated_users = []
        
        # Test customer and admin authentication (main focus)
        priority_users = [
            {"email": "customer@vallmark.com", "password": "Customer123!", "role": "customer"},
            {"email": "admin@vallmark.com", "password": "Admin123!", "role": "admin"}
        ]
        
        for user_data in priority_users:
            email = user_data["email"]
            password = user_data["password"]
            role = user_data["role"]
            
            if self.authenticate_user(email, password, role):
                authenticated_users.append(role)
        
        if not authenticated_users:
            print("❌ No users authenticated - cannot proceed with order testing")
            return False
        
        # Step 4: JWT Token validation
        print("\n🎫 Step 4: JWT Token Validation...")
        for role in authenticated_users:
            self.test_jwt_token_validation(role)
        
        # Step 5: Get test products
        print("\n📦 Step 5: Getting Test Products...")
        if not self.get_test_products():
            print("❌ Cannot get test products - order testing will be limited")
        
        # Step 6: Order creation testing
        print("\n🛒 Step 6: Order Creation Testing...")
        for role in authenticated_users:
            self.test_order_creation(role)
        
        # Step 7: Order retrieval testing
        print("\n📋 Step 7: Order Retrieval Testing...")
        for role in authenticated_users:
            self.test_order_retrieval(role)
        
        # Step 8: Order details testing
        print("\n🔍 Step 8: Order Details Testing...")
        for role in authenticated_users:
            self.test_order_details(role)
        
        # Step 9: Summary and analysis
        print("\n📊 Step 9: Test Results Summary...")
        self.print_test_summary()
        
        return True
    
    def print_test_summary(self):
        """Print comprehensive test summary"""
        print("\n" + "=" * 80)
        print("📊 AUTHENTICATION AND ORDER TESTING RESULTS")
        print("=" * 80)
        
        print(f"Total Tests: {self.total_tests}")
        print(f"Passed Tests: {self.passed_tests}")
        print(f"Failed Tests: {self.failed_tests}")
        print(f"Success Rate: {(self.passed_tests/self.total_tests*100):.1f}%")
        
        print(f"\n🔐 Authenticated Users: {len(self.auth_tokens)}")
        for role, token_data in self.auth_tokens.items():
            user_info = token_data.get("user", {})
            print(f"  - {role}: {user_info.get('full_name', 'Unknown')} ({user_info.get('email', 'Unknown')})")
        
        print(f"\n🛒 Orders Created: {len(self.created_orders)}")
        for order in self.created_orders:
            print(f"  - {order['role']}: {order['order_number']} (${order['total_amount']:.2f})")
        
        print("\n❌ Failed Tests:")
        failed_tests = [r for r in self.results if r["status"] == "FAIL"]
        if failed_tests:
            for test in failed_tests:
                print(f"  - {test['test']}: {test['message']}")
        else:
            print("  None! All tests passed.")
        
        print("\n🔍 Key Findings:")
        
        # Analyze critical functionality
        auth_failures = [r for r in self.results if "Authentication" in r["test"] and r["status"] == "FAIL"]
        jwt_failures = [r for r in self.results if "JWT" in r["test"] and r["status"] == "FAIL"]
        order_creation_failures = [r for r in self.results if "Order Creation" in r["test"] and r["status"] == "FAIL"]
        order_retrieval_failures = [r for r in self.results if "Order Retrieval" in r["test"] and r["status"] == "FAIL"]
        
        if not auth_failures:
            print("  - ✅ Authentication system working correctly")
            print("    • Seeded users can login successfully")
            print("    • JWT tokens generated properly")
        else:
            print(f"  - ❌ Authentication issues found ({len(auth_failures)} failures)")
        
        if not jwt_failures:
            print("  - ✅ JWT token validation working correctly")
            print("    • Tokens properly validated on protected endpoints")
        else:
            print(f"  - ❌ JWT token validation issues ({len(jwt_failures)} failures)")
        
        if not order_creation_failures:
            print("  - ✅ Order creation working for authenticated users")
            print("    • Logged-in users can successfully place orders")
        else:
            print(f"  - ❌ Order creation issues found ({len(order_creation_failures)} failures)")
            print("    • Logged-in users CANNOT place orders - CRITICAL ISSUE")
        
        if not order_retrieval_failures:
            print("  - ✅ Order retrieval working correctly")
            print("    • Users can view their order history")
        else:
            print(f"  - ❌ Order retrieval issues ({len(order_retrieval_failures)} failures)")
        
        # Overall assessment
        critical_issues = len(auth_failures) + len(order_creation_failures)
        if critical_issues == 0:
            print("\n🎉 OVERALL ASSESSMENT: AUTHENTICATION AND ORDER SYSTEM WORKING CORRECTLY")
            print("  • Users can authenticate with seeded credentials")
            print("  • JWT tokens are properly generated and validated")
            print("  • Authenticated users can successfully place orders")
            print("  • Order retrieval and details work as expected")
        else:
            print(f"\n🚨 OVERALL ASSESSMENT: {critical_issues} CRITICAL ISSUES FOUND")
            if auth_failures:
                print("  • Authentication system has issues")
            if order_creation_failures:
                print("  • Order placement is NOT working for logged-in users")


def main():
    """Main function to run authentication and order tests"""
    tester = AuthOrderTester()
    
    try:
        success = tester.run_comprehensive_auth_order_test()
        
        # Exit with appropriate code
        if tester.failed_tests == 0:
            print("\n✅ All authentication and order tests passed!")
            sys.exit(0)
        else:
            print(f"\n❌ {tester.failed_tests} tests failed. Issues found in authentication or order system.")
            sys.exit(1)
            
    except KeyboardInterrupt:
        print("\n⚠️ Testing interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 Testing failed with error: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    main()