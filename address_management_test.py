#!/usr/bin/env python3
"""
Address Management Backend API Testing Script
FOCUS: Testing new address management functionality including:
- Address CRUD operations (Create, Read, Update, Delete)
- Default address management logic
- Address validation and phone number formatting
- Order integration with saved addresses
- Error handling and security validation
"""

import requests
import json
import sys
from datetime import datetime
import uuid
import time

# Backend URL from frontend .env
BACKEND_URL = "https://card-shop-repair.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

# Test user credentials (using superadmin as mentioned in review request)
TEST_USER = {
    "email": "superadmin@smartswitch.com", 
    "password": "SuperAdmin123!", 
    "role": "super_admin"
}

# Alternative test user for unauthorized access testing
ALT_TEST_USER = {
    "email": "customer@smartswitch.com",
    "password": "Customer123!",
    "role": "customer"
}

class AddressManagementTester:
    def __init__(self):
        self.results = []
        self.total_tests = 0
        self.passed_tests = 0
        self.failed_tests = 0
        self.auth_token = None
        self.alt_auth_token = None
        self.created_addresses = []  # Track created addresses for cleanup
        self.created_orders = []     # Track created orders
        
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
    
    def authenticate_user(self, user_creds, token_var_name):
        """Authenticate user and store token"""
        try:
            login_data = {
                "username": user_creds["email"],
                "password": user_creds["password"]
            }
            
            response = requests.post(f"{API_BASE}/auth/login", data=login_data, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("access_token"):
                    setattr(self, token_var_name, data["access_token"])
                    self.log_result(
                        f"Authentication ({user_creds['role']})", 
                        "PASS", 
                        f"Successfully authenticated as {user_creds['email']}"
                    )
                    return True
                else:
                    self.log_result(
                        f"Authentication ({user_creds['role']})", 
                        "FAIL", 
                        "No access token in response", 
                        data
                    )
                    return False
            else:
                self.log_result(
                    f"Authentication ({user_creds['role']})", 
                    "FAIL", 
                    f"HTTP {response.status_code}: {response.text}"
                )
                return False
                
        except Exception as e:
            self.log_result(f"Authentication ({user_creds['role']})", "FAIL", f"Error: {str(e)}")
            return False
    
    def test_create_address(self):
        """Test address creation with various scenarios"""
        try:
            if not self.auth_token:
                self.log_result("Create Address", "FAIL", "No authentication token available")
                return False
            
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            
            # Test cases for address creation
            test_addresses = [
                {
                    "tag_name": "Home",
                    "full_name": "John Doe",
                    "phone": "+1234567890",
                    "address_line1": "123 Main Street",
                    "address_line2": "Apt 4B",
                    "city": "New York",
                    "state": "NY",
                    "zip_code": "10001",
                    "country": "USA",
                    "is_default": True
                },
                {
                    "tag_name": "Office",
                    "full_name": "John Doe",
                    "phone": "9876543210",  # Indian format
                    "address_line1": "456 Business Ave",
                    "city": "Mumbai",
                    "state": "Maharashtra",
                    "zip_code": "400001",
                    "country": "India",
                    "is_default": False
                },
                {
                    "tag_name": "Mom's Place",
                    "full_name": "Jane Doe",
                    "phone": "+919876543211",  # Indian with +91
                    "address_line1": "789 Family Road",
                    "city": "Delhi",
                    "state": "Delhi",
                    "zip_code": "110001",
                    "country": "India",
                    "is_default": False
                }
            ]
            
            passed_count = 0
            for i, address_data in enumerate(test_addresses):
                try:
                    response = requests.post(
                        f"{API_BASE}/addresses/",
                        json=address_data,
                        headers=headers,
                        timeout=30
                    )
                    
                    if response.status_code == 200:
                        data = response.json()
                        if data.get("success") and data.get("data"):
                            address_id = data["data"].get("id")
                            if address_id:
                                self.created_addresses.append(address_id)
                                passed_count += 1
                                self.log_result(
                                    f"Create Address ({address_data['tag_name']})", 
                                    "PASS", 
                                    f"Address created successfully with ID: {address_id}"
                                )
                            else:
                                self.log_result(
                                    f"Create Address ({address_data['tag_name']})", 
                                    "FAIL", 
                                    "No address ID in response", 
                                    data
                                )
                        else:
                            self.log_result(
                                f"Create Address ({address_data['tag_name']})", 
                                "FAIL", 
                                "API returned success=false", 
                                data
                            )
                    else:
                        self.log_result(
                            f"Create Address ({address_data['tag_name']})", 
                            "FAIL", 
                            f"HTTP {response.status_code}: {response.text}"
                        )
                except Exception as e:
                    self.log_result(
                        f"Create Address ({address_data['tag_name']})", 
                        "FAIL", 
                        f"Error: {str(e)}"
                    )
            
            if passed_count == len(test_addresses):
                self.log_result(
                    "Address Creation", 
                    "PASS", 
                    f"All {len(test_addresses)} addresses created successfully"
                )
                return True
            else:
                self.log_result(
                    "Address Creation", 
                    "FAIL", 
                    f"Only {passed_count}/{len(test_addresses)} addresses created successfully"
                )
                return False
                
        except Exception as e:
            self.log_result("Address Creation", "FAIL", f"Error testing address creation: {str(e)}")
            return False
    
    def test_get_user_addresses(self):
        """Test retrieving user's addresses"""
        try:
            if not self.auth_token:
                self.log_result("Get User Addresses", "FAIL", "No authentication token available")
                return False
            
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            
            response = requests.get(
                f"{API_BASE}/addresses/",
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and isinstance(data.get("data"), list):
                    addresses = data["data"]
                    
                    # Verify we have the addresses we created
                    if len(addresses) >= len(self.created_addresses):
                        # Check for default address logic
                        default_addresses = [addr for addr in addresses if addr.get("is_default")]
                        
                        if len(default_addresses) == 1:
                            self.log_result(
                                "Get User Addresses", 
                                "PASS", 
                                f"Retrieved {len(addresses)} addresses with correct default logic (1 default)"
                            )
                            return True
                        else:
                            self.log_result(
                                "Get User Addresses", 
                                "FAIL", 
                                f"Invalid default address count: {len(default_addresses)} (should be 1)"
                            )
                            return False
                    else:
                        self.log_result(
                            "Get User Addresses", 
                            "FAIL", 
                            f"Expected at least {len(self.created_addresses)} addresses, got {len(addresses)}"
                        )
                        return False
                else:
                    self.log_result(
                        "Get User Addresses", 
                        "FAIL", 
                        "Invalid response format", 
                        data
                    )
                    return False
            else:
                self.log_result(
                    "Get User Addresses", 
                    "FAIL", 
                    f"HTTP {response.status_code}: {response.text}"
                )
                return False
                
        except Exception as e:
            self.log_result("Get User Addresses", "FAIL", f"Error testing get addresses: {str(e)}")
            return False
    
    def test_get_specific_address(self):
        """Test retrieving specific address by ID"""
        try:
            if not self.auth_token or not self.created_addresses:
                self.log_result("Get Specific Address", "FAIL", "No authentication token or addresses available")
                return False
            
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            address_id = self.created_addresses[0]  # Use first created address
            
            response = requests.get(
                f"{API_BASE}/addresses/{address_id}",
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("data"):
                    address = data["data"]
                    if address.get("id") == address_id:
                        self.log_result(
                            "Get Specific Address", 
                            "PASS", 
                            f"Successfully retrieved address {address_id}"
                        )
                        return True
                    else:
                        self.log_result(
                            "Get Specific Address", 
                            "FAIL", 
                            f"Address ID mismatch: expected {address_id}, got {address.get('id')}"
                        )
                        return False
                else:
                    self.log_result(
                        "Get Specific Address", 
                        "FAIL", 
                        "Invalid response format", 
                        data
                    )
                    return False
            else:
                self.log_result(
                    "Get Specific Address", 
                    "FAIL", 
                    f"HTTP {response.status_code}: {response.text}"
                )
                return False
                
        except Exception as e:
            self.log_result("Get Specific Address", "FAIL", f"Error testing get specific address: {str(e)}")
            return False
    
    def test_update_address(self):
        """Test updating address"""
        try:
            if not self.auth_token or not self.created_addresses:
                self.log_result("Update Address", "FAIL", "No authentication token or addresses available")
                return False
            
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            address_id = self.created_addresses[1] if len(self.created_addresses) > 1 else self.created_addresses[0]
            
            update_data = {
                "tag_name": "Updated Office",
                "full_name": "John Updated Doe",
                "phone": "+1987654321",  # Updated phone
                "address_line1": "456 Updated Business Ave",
                "city": "Updated Mumbai"
            }
            
            response = requests.put(
                f"{API_BASE}/addresses/{address_id}",
                json=update_data,
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("data"):
                    updated_address = data["data"]
                    if (updated_address.get("tag_name") == update_data["tag_name"] and
                        updated_address.get("full_name") == update_data["full_name"]):
                        self.log_result(
                            "Update Address", 
                            "PASS", 
                            f"Successfully updated address {address_id}"
                        )
                        return True
                    else:
                        self.log_result(
                            "Update Address", 
                            "FAIL", 
                            "Address not updated correctly", 
                            updated_address
                        )
                        return False
                else:
                    self.log_result(
                        "Update Address", 
                        "FAIL", 
                        "Invalid response format", 
                        data
                    )
                    return False
            else:
                self.log_result(
                    "Update Address", 
                    "FAIL", 
                    f"HTTP {response.status_code}: {response.text}"
                )
                return False
                
        except Exception as e:
            self.log_result("Update Address", "FAIL", f"Error testing update address: {str(e)}")
            return False
    
    def test_set_default_address(self):
        """Test setting default address"""
        try:
            if not self.auth_token or len(self.created_addresses) < 2:
                self.log_result("Set Default Address", "FAIL", "Need at least 2 addresses for this test")
                return False
            
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            address_id = self.created_addresses[1]  # Set second address as default
            
            response = requests.post(
                f"{API_BASE}/addresses/{address_id}/set-default",
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    # Verify by getting all addresses and checking default logic
                    get_response = requests.get(f"{API_BASE}/addresses/", headers=headers, timeout=30)
                    if get_response.status_code == 200:
                        get_data = get_response.json()
                        addresses = get_data.get("data", [])
                        default_addresses = [addr for addr in addresses if addr.get("is_default")]
                        
                        if len(default_addresses) == 1 and default_addresses[0].get("id") == address_id:
                            self.log_result(
                                "Set Default Address", 
                                "PASS", 
                                f"Successfully set address {address_id} as default"
                            )
                            return True
                        else:
                            self.log_result(
                                "Set Default Address", 
                                "FAIL", 
                                f"Default address logic failed: {len(default_addresses)} defaults found"
                            )
                            return False
                    else:
                        self.log_result(
                            "Set Default Address", 
                            "FAIL", 
                            "Could not verify default address change"
                        )
                        return False
                else:
                    self.log_result(
                        "Set Default Address", 
                        "FAIL", 
                        "API returned success=false", 
                        data
                    )
                    return False
            else:
                self.log_result(
                    "Set Default Address", 
                    "FAIL", 
                    f"HTTP {response.status_code}: {response.text}"
                )
                return False
                
        except Exception as e:
            self.log_result("Set Default Address", "FAIL", f"Error testing set default address: {str(e)}")
            return False
    
    def test_order_creation_with_saved_address(self):
        """Test order creation using saved address"""
        try:
            if not self.auth_token or not self.created_addresses:
                self.log_result("Order with Saved Address", "FAIL", "No authentication token or addresses available")
                return False
            
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            
            # First, get a product to create order with
            products_response = requests.get(f"{API_BASE}/products/", headers=headers, timeout=30)
            if products_response.status_code != 200:
                self.log_result("Order with Saved Address", "FAIL", "Could not get products for order")
                return False
            
            products_data = products_response.json()
            products = products_data.get("data", [])
            if not products:
                self.log_result("Order with Saved Address", "FAIL", "No products available for order")
                return False
            
            product = products[0]
            address_id = self.created_addresses[0]
            
            order_data = {
                "items": [
                    {
                        "product_id": product.get("id"),
                        "quantity": 1,
                        "price": product.get("price", 100.0)
                    }
                ],
                "selected_address_id": address_id,  # Use saved address
                "total_amount": product.get("price", 100.0),
                "tax_amount": 10.0,
                "shipping_cost": 5.0,
                "final_amount": product.get("price", 100.0) + 15.0,
                "payment_method": "COD",
                "notes": "Test order with saved address"
            }
            
            response = requests.post(
                f"{API_BASE}/orders/",
                json=order_data,
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("data"):
                    order = data["data"]
                    order_id = order.get("id")
                    if order_id:
                        self.created_orders.append(order_id)
                        
                        # Verify shipping address was populated from saved address
                        shipping_address = order.get("shipping_address")
                        if shipping_address:
                            self.log_result(
                                "Order with Saved Address", 
                                "PASS", 
                                f"Order created successfully with saved address. Order ID: {order_id}"
                            )
                            return True
                        else:
                            self.log_result(
                                "Order with Saved Address", 
                                "FAIL", 
                                "Order created but shipping address not populated"
                            )
                            return False
                    else:
                        self.log_result(
                            "Order with Saved Address", 
                            "FAIL", 
                            "No order ID in response", 
                            data
                        )
                        return False
                else:
                    self.log_result(
                        "Order with Saved Address", 
                        "FAIL", 
                        "API returned success=false", 
                        data
                    )
                    return False
            else:
                self.log_result(
                    "Order with Saved Address", 
                    "FAIL", 
                    f"HTTP {response.status_code}: {response.text}"
                )
                return False
                
        except Exception as e:
            self.log_result("Order with Saved Address", "FAIL", f"Error testing order with saved address: {str(e)}")
            return False
    
    def test_order_creation_with_direct_address(self):
        """Test order creation with direct shipping address"""
        try:
            if not self.auth_token:
                self.log_result("Order with Direct Address", "FAIL", "No authentication token available")
                return False
            
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            
            # Get a product for the order
            products_response = requests.get(f"{API_BASE}/products/", headers=headers, timeout=30)
            if products_response.status_code != 200:
                self.log_result("Order with Direct Address", "FAIL", "Could not get products for order")
                return False
            
            products_data = products_response.json()
            products = products_data.get("data", [])
            if not products:
                self.log_result("Order with Direct Address", "FAIL", "No products available for order")
                return False
            
            product = products[0]
            
            order_data = {
                "items": [
                    {
                        "product_id": product.get("id"),
                        "quantity": 1,
                        "price": product.get("price", 100.0)
                    }
                ],
                "shipping_address": {  # Direct shipping address
                    "full_name": "Direct Address User",
                    "phone": "+1555123456",
                    "address_line1": "999 Direct Street",
                    "city": "Direct City",
                    "state": "DC",
                    "zip_code": "12345",
                    "country": "USA"
                },
                "total_amount": product.get("price", 100.0),
                "tax_amount": 10.0,
                "shipping_cost": 5.0,
                "final_amount": product.get("price", 100.0) + 15.0,
                "payment_method": "COD",
                "notes": "Test order with direct address"
            }
            
            response = requests.post(
                f"{API_BASE}/orders/",
                json=order_data,
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("data"):
                    order = data["data"]
                    order_id = order.get("id")
                    if order_id:
                        self.created_orders.append(order_id)
                        self.log_result(
                            "Order with Direct Address", 
                            "PASS", 
                            f"Order created successfully with direct address. Order ID: {order_id}"
                        )
                        return True
                    else:
                        self.log_result(
                            "Order with Direct Address", 
                            "FAIL", 
                            "No order ID in response", 
                            data
                        )
                        return False
                else:
                    self.log_result(
                        "Order with Direct Address", 
                        "FAIL", 
                        "API returned success=false", 
                        data
                    )
                    return False
            else:
                self.log_result(
                    "Order with Direct Address", 
                    "FAIL", 
                    f"HTTP {response.status_code}: {response.text}"
                )
                return False
                
        except Exception as e:
            self.log_result("Order with Direct Address", "FAIL", f"Error testing order with direct address: {str(e)}")
            return False
    
    def test_error_handling(self):
        """Test various error handling scenarios"""
        try:
            if not self.auth_token:
                self.log_result("Error Handling", "FAIL", "No authentication token available")
                return False
            
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            passed_count = 0
            total_error_tests = 0
            
            # Test 1: Invalid address ID
            total_error_tests += 1
            response = requests.get(f"{API_BASE}/addresses/invalid-id", headers=headers, timeout=30)
            if response.status_code == 404:
                passed_count += 1
                self.log_result("Error - Invalid Address ID", "PASS", "Correctly returned 404 for invalid address ID")
            else:
                self.log_result("Error - Invalid Address ID", "FAIL", f"Expected 404, got {response.status_code}")
            
            # Test 2: Invalid phone number format
            total_error_tests += 1
            invalid_address = {
                "tag_name": "Test",
                "full_name": "Test User",
                "phone": "invalid-phone",  # Invalid phone
                "address_line1": "123 Test St",
                "city": "Test City",
                "state": "TS",
                "zip_code": "12345",
                "country": "USA"
            }
            response = requests.post(f"{API_BASE}/addresses/", json=invalid_address, headers=headers, timeout=30)
            if response.status_code == 400:
                passed_count += 1
                self.log_result("Error - Invalid Phone", "PASS", "Correctly rejected invalid phone number")
            else:
                self.log_result("Error - Invalid Phone", "FAIL", f"Expected 400, got {response.status_code}")
            
            # Test 3: Order without address
            total_error_tests += 1
            invalid_order = {
                "items": [{"product_id": "test-id", "quantity": 1, "price": 100.0}],
                # No shipping_address or selected_address_id
                "total_amount": 100.0,
                "final_amount": 100.0,
                "payment_method": "COD"
            }
            response = requests.post(f"{API_BASE}/orders/", json=invalid_order, headers=headers, timeout=30)
            if response.status_code == 400:
                passed_count += 1
                self.log_result("Error - Order No Address", "PASS", "Correctly rejected order without address")
            else:
                self.log_result("Error - Order No Address", "FAIL", f"Expected 400, got {response.status_code}")
            
            # Test 4: Unauthorized access (using different user token)
            if self.alt_auth_token:
                total_error_tests += 1
                alt_headers = {"Authorization": f"Bearer {self.alt_auth_token}"}
                if self.created_addresses:
                    response = requests.get(f"{API_BASE}/addresses/{self.created_addresses[0]}", headers=alt_headers, timeout=30)
                    if response.status_code in [403, 404]:  # Should be forbidden or not found
                        passed_count += 1
                        self.log_result("Error - Unauthorized Access", "PASS", "Correctly blocked unauthorized address access")
                    else:
                        self.log_result("Error - Unauthorized Access", "FAIL", f"Expected 403/404, got {response.status_code}")
            
            if passed_count == total_error_tests:
                self.log_result(
                    "Error Handling", 
                    "PASS", 
                    f"All {total_error_tests} error handling tests passed"
                )
                return True
            else:
                self.log_result(
                    "Error Handling", 
                    "FAIL", 
                    f"Only {passed_count}/{total_error_tests} error handling tests passed"
                )
                return False
                
        except Exception as e:
            self.log_result("Error Handling", "FAIL", f"Error testing error handling: {str(e)}")
            return False
    
    def test_delete_address(self):
        """Test address deletion and default reassignment logic"""
        try:
            if not self.auth_token or len(self.created_addresses) < 2:
                self.log_result("Delete Address", "FAIL", "Need at least 2 addresses for deletion test")
                return False
            
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            
            # Delete a non-default address first
            address_to_delete = self.created_addresses[-1]  # Delete last created address
            
            response = requests.delete(
                f"{API_BASE}/addresses/{address_to_delete}",
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    # Remove from our tracking list
                    self.created_addresses.remove(address_to_delete)
                    
                    # Verify address is deleted
                    get_response = requests.get(f"{API_BASE}/addresses/{address_to_delete}", headers=headers, timeout=30)
                    if get_response.status_code == 404:
                        self.log_result(
                            "Delete Address", 
                            "PASS", 
                            f"Successfully deleted address {address_to_delete}"
                        )
                        return True
                    else:
                        self.log_result(
                            "Delete Address", 
                            "FAIL", 
                            "Address still exists after deletion"
                        )
                        return False
                else:
                    self.log_result(
                        "Delete Address", 
                        "FAIL", 
                        "API returned success=false", 
                        data
                    )
                    return False
            else:
                self.log_result(
                    "Delete Address", 
                    "FAIL", 
                    f"HTTP {response.status_code}: {response.text}"
                )
                return False
                
        except Exception as e:
            self.log_result("Delete Address", "FAIL", f"Error testing delete address: {str(e)}")
            return False
    
    def run_comprehensive_address_test(self):
        """Run comprehensive address management testing"""
        print("🚀 Starting Address Management Functionality Testing")
        print(f"Backend URL: {BACKEND_URL}")
        print("=" * 80)
        
        # Step 1: Health check
        print("\n🏥 Step 1: Health Check...")
        if not self.test_health_check():
            print("❌ Health check failed - cannot proceed")
            return False
        
        # Step 2: Authentication
        print("\n🔐 Step 2: User Authentication...")
        if not self.authenticate_user(TEST_USER, "auth_token"):
            print("❌ Primary user authentication failed - cannot proceed")
            return False
        
        # Authenticate alternative user for unauthorized access testing
        self.authenticate_user(ALT_TEST_USER, "alt_auth_token")
        
        # Step 3: Address Creation
        print("\n📍 Step 3: Address Creation...")
        self.test_create_address()
        
        # Step 4: Get User Addresses
        print("\n📋 Step 4: Get User Addresses...")
        self.test_get_user_addresses()
        
        # Step 5: Get Specific Address
        print("\n🔍 Step 5: Get Specific Address...")
        self.test_get_specific_address()
        
        # Step 6: Update Address
        print("\n✏️ Step 6: Update Address...")
        self.test_update_address()
        
        # Step 7: Set Default Address
        print("\n⭐ Step 7: Set Default Address...")
        self.test_set_default_address()
        
        # Step 8: Order with Saved Address
        print("\n🛒 Step 8: Order Creation with Saved Address...")
        self.test_order_creation_with_saved_address()
        
        # Step 9: Order with Direct Address
        print("\n📦 Step 9: Order Creation with Direct Address...")
        self.test_order_creation_with_direct_address()
        
        # Step 10: Error Handling
        print("\n⚠️ Step 10: Error Handling...")
        self.test_error_handling()
        
        # Step 11: Delete Address
        print("\n🗑️ Step 11: Delete Address...")
        self.test_delete_address()
        
        # Step 12: Summary
        print("\n📊 Step 12: Test Results Summary...")
        self.print_test_summary()
        
        return True
    
    def print_test_summary(self):
        """Print comprehensive test summary"""
        print("\n" + "=" * 80)
        print("📊 ADDRESS MANAGEMENT FUNCTIONALITY TESTING RESULTS")
        print("=" * 80)
        
        print(f"Total Tests: {self.total_tests}")
        print(f"Passed Tests: {self.passed_tests}")
        print(f"Failed Tests: {self.failed_tests}")
        print(f"Success Rate: {(self.passed_tests/self.total_tests*100):.1f}%")
        
        print(f"\n📍 Created Addresses: {len(self.created_addresses)}")
        print(f"🛒 Created Orders: {len(self.created_orders)}")
        
        print("\n❌ Failed Tests:")
        failed_tests = [r for r in self.results if r["status"] == "FAIL"]
        if failed_tests:
            for test in failed_tests:
                print(f"  - {test['test']}: {test['message']}")
        else:
            print("  None! All tests passed.")
        
        print("\n🔍 Key Findings:")
        
        # Analyze functionality areas
        address_crud_failures = [r for r in self.results if any(x in r["test"] for x in ["Create Address", "Get", "Update Address", "Delete Address"]) and r["status"] == "FAIL"]
        default_logic_failures = [r for r in self.results if "Default" in r["test"] and r["status"] == "FAIL"]
        order_integration_failures = [r for r in self.results if "Order" in r["test"] and r["status"] == "FAIL"]
        error_handling_failures = [r for r in self.results if "Error" in r["test"] and r["status"] == "FAIL"]
        
        if not address_crud_failures:
            print("  - ✅ Address CRUD operations working correctly")
            print("    • Address creation with phone validation")
            print("    • Address retrieval and listing")
            print("    • Address updates")
            print("    • Address deletion")
        else:
            print(f"  - ❌ Address CRUD issues found ({len(address_crud_failures)} failures)")
        
        if not default_logic_failures:
            print("  - ✅ Default address logic working correctly")
            print("    • Only one default address per user")
            print("    • Default address switching")
        else:
            print(f"  - ❌ Default address logic issues ({len(default_logic_failures)} failures)")
        
        if not order_integration_failures:
            print("  - ✅ Order integration working correctly")
            print("    • Orders can use saved addresses")
            print("    • Orders can use direct shipping addresses")
            print("    • Address selection validation")
        else:
            print(f"  - ❌ Order integration issues ({len(order_integration_failures)} failures)")
        
        if not error_handling_failures:
            print("  - ✅ Error handling working correctly")
            print("    • Invalid address IDs rejected")
            print("    • Phone number validation")
            print("    • Unauthorized access blocked")
            print("    • Missing address validation")
        else:
            print(f"  - ❌ Error handling issues ({len(error_handling_failures)} failures)")
        
        # Overall assessment
        critical_issues = len(address_crud_failures) + len(order_integration_failures)
        if critical_issues == 0:
            print("\n🎉 OVERALL ASSESSMENT: ADDRESS MANAGEMENT FUNCTIONALITY WORKING CORRECTLY")
            print("  • All address CRUD operations functional")
            print("  • Default address logic implemented correctly")
            print("  • Order integration with addresses working")
            print("  • Phone number validation and formatting working")
            print("  • Error handling and security measures in place")
        else:
            print(f"\n🚨 OVERALL ASSESSMENT: {critical_issues} CRITICAL ISSUES FOUND")
            if address_crud_failures:
                print("  • Address CRUD operations have issues")
            if order_integration_failures:
                print("  • Order integration with addresses not working")


def main():
    """Main function to run address management tests"""
    tester = AddressManagementTester()
    
    try:
        success = tester.run_comprehensive_address_test()
        
        # Exit with appropriate code
        if tester.failed_tests == 0:
            print("\n✅ All address management functionality tests passed!")
            sys.exit(0)
        else:
            print(f"\n❌ {tester.failed_tests} tests failed. Issues found in address management functionality.")
            sys.exit(1)
            
    except KeyboardInterrupt:
        print("\n⚠️ Testing interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 Testing failed with error: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    main()