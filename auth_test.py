#!/usr/bin/env python3
"""
Authentication Testing Script for SmartSwitch IoT Application
Tests all authentication endpoints and verifies functionality
"""

import requests
import json
import sys
from datetime import datetime
import random
import string

# Backend URL from frontend .env
BACKEND_URL = "https://21c6fd07-04cc-4552-9eb4-bb9285be6a80.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

class AuthenticationTester:
    def __init__(self):
        self.results = []
        self.total_tests = 0
        self.passed_tests = 0
        self.failed_tests = 0
        self.access_token = None
        self.admin_token = None
        self.test_user_data = None
        self.admin_user_data = None
        
    def generate_random_string(self, length=8):
        """Generate random string for unique usernames/emails"""
        return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))
        
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
    
    def test_user_registration(self):
        """Test POST /api/auth/register with valid user data"""
        try:
            # Generate unique test data
            random_suffix = self.generate_random_string()
            self.test_user_data = {
                "email": f"sarah.johnson{random_suffix}@smartswitch.com",
                "username": f"sarah_johnson_{random_suffix}",
                "password": "SecurePass123!",
                "full_name": "Sarah Johnson",
                "phone": "+1-555-0123",
                "role": "customer"
            }
            
            response = requests.post(
                f"{API_BASE}/auth/register",
                json=self.test_user_data,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("data"):
                    user_data = data["data"]
                    if (user_data.get("email") == self.test_user_data["email"] and 
                        user_data.get("username") == self.test_user_data["username"]):
                        self.log_result(
                            "User Registration", 
                            "PASS", 
                            "User registered successfully with valid data",
                            {"user_id": user_data.get("id"), "email": user_data.get("email")}
                        )
                    else:
                        self.log_result(
                            "User Registration", 
                            "FAIL", 
                            "Registration response missing expected user data",
                            data
                        )
                else:
                    self.log_result(
                        "User Registration", 
                        "FAIL", 
                        "Registration response format invalid",
                        data
                    )
            else:
                self.log_result(
                    "User Registration", 
                    "FAIL", 
                    f"HTTP {response.status_code}: {response.text}",
                    {"status_code": response.status_code}
                )
                
        except requests.exceptions.RequestException as e:
            self.log_result(
                "User Registration", 
                "FAIL", 
                f"Connection error: {str(e)}",
                {"error_type": type(e).__name__}
            )
    
    def test_user_login(self):
        """Test POST /api/auth/login with registered user credentials"""
        if not self.test_user_data:
            self.log_result(
                "User Login", 
                "FAIL", 
                "Cannot test login - user registration failed",
                None
            )
            return
            
        try:
            # Login with form data (OAuth2PasswordRequestForm format)
            login_data = {
                "username": self.test_user_data["email"],  # Using email as username
                "password": self.test_user_data["password"]
            }
            
            response = requests.post(
                f"{API_BASE}/auth/login",
                data=login_data,  # Form data, not JSON
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if (data.get("access_token") and data.get("token_type") == "bearer" and 
                    data.get("user")):
                    self.access_token = data["access_token"]
                    user_data = data["user"]
                    if user_data.get("email") == self.test_user_data["email"]:
                        self.log_result(
                            "User Login", 
                            "PASS", 
                            "User login successful with JWT token generated",
                            {
                                "token_type": data.get("token_type"),
                                "expires_in": data.get("expires_in"),
                                "user_email": user_data.get("email")
                            }
                        )
                    else:
                        self.log_result(
                            "User Login", 
                            "FAIL", 
                            "Login response user data mismatch",
                            data
                        )
                else:
                    self.log_result(
                        "User Login", 
                        "FAIL", 
                        "Login response missing required fields",
                        data
                    )
            else:
                self.log_result(
                    "User Login", 
                    "FAIL", 
                    f"HTTP {response.status_code}: {response.text}",
                    {"status_code": response.status_code}
                )
                
        except requests.exceptions.RequestException as e:
            self.log_result(
                "User Login", 
                "FAIL", 
                f"Connection error: {str(e)}",
                {"error_type": type(e).__name__}
            )
    
    def test_get_current_user(self):
        """Test GET /api/auth/me with JWT token"""
        if not self.access_token:
            self.log_result(
                "Get Current User", 
                "FAIL", 
                "Cannot test - no access token available",
                None
            )
            return
            
        try:
            headers = {"Authorization": f"Bearer {self.access_token}"}
            response = requests.get(
                f"{API_BASE}/auth/me",
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if (data.get("email") == self.test_user_data["email"] and 
                    data.get("username") == self.test_user_data["username"]):
                    self.log_result(
                        "Get Current User", 
                        "PASS", 
                        "Current user info retrieved successfully with JWT",
                        {
                            "user_id": data.get("id"),
                            "email": data.get("email"),
                            "role": data.get("role")
                        }
                    )
                else:
                    self.log_result(
                        "Get Current User", 
                        "FAIL", 
                        "User info response data mismatch",
                        data
                    )
            else:
                self.log_result(
                    "Get Current User", 
                    "FAIL", 
                    f"HTTP {response.status_code}: {response.text}",
                    {"status_code": response.status_code}
                )
                
        except requests.exceptions.RequestException as e:
            self.log_result(
                "Get Current User", 
                "FAIL", 
                f"Connection error: {str(e)}",
                {"error_type": type(e).__name__}
            )
    
    def test_update_user_profile(self):
        """Test PUT /api/auth/me with profile updates"""
        if not self.access_token:
            self.log_result(
                "Update User Profile", 
                "FAIL", 
                "Cannot test - no access token available",
                None
            )
            return
            
        try:
            update_data = {
                "full_name": "Sarah Johnson Updated",
                "phone": "+1-555-9876"
            }
            
            headers = {"Authorization": f"Bearer {self.access_token}"}
            response = requests.put(
                f"{API_BASE}/auth/me",
                json=update_data,
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if (data.get("success") and data.get("data")):
                    user_data = data["data"]
                    if user_data.get("full_name") == update_data["full_name"]:
                        self.log_result(
                            "Update User Profile", 
                            "PASS", 
                            "User profile updated successfully",
                            {
                                "updated_name": user_data.get("full_name"),
                                "user_id": user_data.get("id")
                            }
                        )
                    else:
                        self.log_result(
                            "Update User Profile", 
                            "FAIL", 
                            "Profile update not reflected in response",
                            data
                        )
                else:
                    self.log_result(
                        "Update User Profile", 
                        "FAIL", 
                        "Update response format invalid",
                        data
                    )
            else:
                self.log_result(
                    "Update User Profile", 
                    "FAIL", 
                    f"HTTP {response.status_code}: {response.text}",
                    {"status_code": response.status_code}
                )
                
        except requests.exceptions.RequestException as e:
            self.log_result(
                "Update User Profile", 
                "FAIL", 
                f"Connection error: {str(e)}",
                {"error_type": type(e).__name__}
            )
    
    def test_user_logout(self):
        """Test POST /api/auth/logout"""
        if not self.access_token:
            self.log_result(
                "User Logout", 
                "FAIL", 
                "Cannot test - no access token available",
                None
            )
            return
            
        try:
            headers = {"Authorization": f"Bearer {self.access_token}"}
            response = requests.post(
                f"{API_BASE}/auth/logout",
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_result(
                        "User Logout", 
                        "PASS", 
                        "User logout successful",
                        {"message": data.get("message")}
                    )
                else:
                    self.log_result(
                        "User Logout", 
                        "FAIL", 
                        "Logout response format invalid",
                        data
                    )
            else:
                self.log_result(
                    "User Logout", 
                    "FAIL", 
                    f"HTTP {response.status_code}: {response.text}",
                    {"status_code": response.status_code}
                )
                
        except requests.exceptions.RequestException as e:
            self.log_result(
                "User Logout", 
                "FAIL", 
                f"Connection error: {str(e)}",
                {"error_type": type(e).__name__}
            )
    
    def test_admin_user_management(self):
        """Test GET /api/auth/users (admin endpoint)"""
        # First create an admin user for testing
        try:
            random_suffix = self.generate_random_string()
            admin_data = {
                "email": f"admin.smith{random_suffix}@smartswitch.com",
                "username": f"admin_smith_{random_suffix}",
                "password": "AdminPass123!",
                "full_name": "Admin Smith",
                "role": "admin"
            }
            
            # Register admin user
            response = requests.post(
                f"{API_BASE}/auth/register",
                json=admin_data,
                timeout=10
            )
            
            if response.status_code != 200:
                self.log_result(
                    "Admin User Management", 
                    "FAIL", 
                    "Failed to create admin user for testing",
                    {"status_code": response.status_code}
                )
                return
            
            # Login as admin
            login_data = {
                "username": admin_data["email"],
                "password": admin_data["password"]
            }
            
            response = requests.post(
                f"{API_BASE}/auth/login",
                data=login_data,
                timeout=10
            )
            
            if response.status_code != 200:
                self.log_result(
                    "Admin User Management", 
                    "FAIL", 
                    "Failed to login as admin user",
                    {"status_code": response.status_code}
                )
                return
            
            admin_token = response.json().get("access_token")
            if not admin_token:
                self.log_result(
                    "Admin User Management", 
                    "FAIL", 
                    "No admin token received",
                    None
                )
                return
            
            # Test admin endpoint
            headers = {"Authorization": f"Bearer {admin_token}"}
            response = requests.get(
                f"{API_BASE}/auth/users",
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if (data.get("success") and data.get("data") and 
                    isinstance(data["data"].get("users"), list)):
                    users_data = data["data"]
                    self.log_result(
                        "Admin User Management", 
                        "PASS", 
                        "Admin can access user management endpoint",
                        {
                            "total_users": users_data.get("total"),
                            "users_count": len(users_data.get("users", [])),
                            "page": users_data.get("page")
                        }
                    )
                else:
                    self.log_result(
                        "Admin User Management", 
                        "FAIL", 
                        "Admin endpoint response format invalid",
                        data
                    )
            else:
                self.log_result(
                    "Admin User Management", 
                    "FAIL", 
                    f"HTTP {response.status_code}: {response.text}",
                    {"status_code": response.status_code}
                )
                
        except requests.exceptions.RequestException as e:
            self.log_result(
                "Admin User Management", 
                "FAIL", 
                f"Connection error: {str(e)}",
                {"error_type": type(e).__name__}
            )
    
    def test_error_handling(self):
        """Test error handling for invalid inputs"""
        error_tests = [
            {
                "name": "Invalid Registration - Missing Password",
                "endpoint": "/auth/register",
                "method": "POST",
                "data": {
                    "email": "test@example.com",
                    "username": "testuser"
                    # Missing password
                },
                "expected_status": 422
            },
            {
                "name": "Invalid Registration - Weak Password",
                "endpoint": "/auth/register", 
                "method": "POST",
                "data": {
                    "email": "test2@example.com",
                    "username": "testuser2",
                    "password": "weak"  # Too weak
                },
                "expected_status": 422
            },
            {
                "name": "Invalid Login - Wrong Credentials",
                "endpoint": "/auth/login",
                "method": "POST",
                "data": {
                    "username": "nonexistent@example.com",
                    "password": "wrongpassword"
                },
                "expected_status": 401,
                "form_data": True
            },
            {
                "name": "Unauthorized Access - No Token",
                "endpoint": "/auth/me",
                "method": "GET",
                "data": None,
                "expected_status": 401
            },
            {
                "name": "Unauthorized Access - Invalid Token",
                "endpoint": "/auth/me",
                "method": "GET",
                "data": None,
                "headers": {"Authorization": "Bearer invalid_token"},
                "expected_status": 401
            }
        ]
        
        for test in error_tests:
            try:
                url = f"{API_BASE}{test['endpoint']}"
                headers = test.get("headers", {})
                
                if test["method"] == "POST":
                    if test.get("form_data"):
                        response = requests.post(url, data=test["data"], headers=headers, timeout=10)
                    else:
                        response = requests.post(url, json=test["data"], headers=headers, timeout=10)
                elif test["method"] == "GET":
                    response = requests.get(url, headers=headers, timeout=10)
                
                if response.status_code == test["expected_status"]:
                    self.log_result(
                        f"Error Handling - {test['name']}", 
                        "PASS", 
                        f"Proper error response ({response.status_code}) for invalid input",
                        {"expected": test["expected_status"], "actual": response.status_code}
                    )
                else:
                    self.log_result(
                        f"Error Handling - {test['name']}", 
                        "FAIL", 
                        f"Expected {test['expected_status']}, got {response.status_code}",
                        {"response": response.text}
                    )
                    
            except requests.exceptions.RequestException as e:
                self.log_result(
                    f"Error Handling - {test['name']}", 
                    "FAIL", 
                    f"Connection error: {str(e)}",
                    {"error_type": type(e).__name__}
                )
    
    def test_password_validation(self):
        """Test password validation requirements"""
        password_tests = [
            {
                "password": "short",
                "should_fail": True,
                "reason": "too short"
            },
            {
                "password": "nouppercase123",
                "should_fail": True,
                "reason": "no uppercase"
            },
            {
                "password": "NOLOWERCASE123",
                "should_fail": True,
                "reason": "no lowercase"
            },
            {
                "password": "NoNumbers",
                "should_fail": True,
                "reason": "no numbers"
            },
            {
                "password": "ValidPass123",
                "should_fail": False,
                "reason": "valid password"
            }
        ]
        
        for i, test in enumerate(password_tests):
            try:
                random_suffix = self.generate_random_string()
                user_data = {
                    "email": f"passtest{i}{random_suffix}@example.com",
                    "username": f"passtest{i}_{random_suffix}",
                    "password": test["password"],
                    "full_name": "Password Test User"
                }
                
                response = requests.post(
                    f"{API_BASE}/auth/register",
                    json=user_data,
                    timeout=10
                )
                
                if test["should_fail"]:
                    if response.status_code == 422:
                        self.log_result(
                            f"Password Validation - {test['reason']}", 
                            "PASS", 
                            f"Password validation correctly rejected {test['reason']}",
                            {"password_length": len(test["password"])}
                        )
                    else:
                        self.log_result(
                            f"Password Validation - {test['reason']}", 
                            "FAIL", 
                            f"Expected validation error, got {response.status_code}",
                            {"response": response.text}
                        )
                else:
                    if response.status_code == 200:
                        self.log_result(
                            f"Password Validation - {test['reason']}", 
                            "PASS", 
                            "Valid password accepted correctly",
                            {"password_length": len(test["password"])}
                        )
                    else:
                        self.log_result(
                            f"Password Validation - {test['reason']}", 
                            "FAIL", 
                            f"Valid password rejected with {response.status_code}",
                            {"response": response.text}
                        )
                        
            except requests.exceptions.RequestException as e:
                self.log_result(
                    f"Password Validation - {test['reason']}", 
                    "FAIL", 
                    f"Connection error: {str(e)}",
                    {"error_type": type(e).__name__}
                )
    
    def test_role_based_access_control(self):
        """Test role-based access control"""
        if not self.access_token:
            self.log_result(
                "Role-Based Access Control", 
                "FAIL", 
                "Cannot test - no regular user token available",
                None
            )
            return
            
        try:
            # Test regular user trying to access admin endpoint
            headers = {"Authorization": f"Bearer {self.access_token}"}
            response = requests.get(
                f"{API_BASE}/auth/users",
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 403:
                self.log_result(
                    "Role-Based Access Control", 
                    "PASS", 
                    "Regular user correctly denied access to admin endpoint",
                    {"status_code": response.status_code}
                )
            else:
                self.log_result(
                    "Role-Based Access Control", 
                    "FAIL", 
                    f"Expected 403 Forbidden, got {response.status_code}",
                    {"response": response.text}
                )
                
        except requests.exceptions.RequestException as e:
            self.log_result(
                "Role-Based Access Control", 
                "FAIL", 
                f"Connection error: {str(e)}",
                {"error_type": type(e).__name__}
            )
    
    def run_all_tests(self):
        """Run all authentication tests"""
        print("🚀 Starting SmartSwitch IoT Authentication System Tests")
        print(f"Backend URL: {BACKEND_URL}")
        print("=" * 70)
        
        # Run all authentication tests in order
        self.test_user_registration()
        self.test_user_login()
        self.test_get_current_user()
        self.test_update_user_profile()
        self.test_user_logout()
        self.test_admin_user_management()
        self.test_error_handling()
        self.test_password_validation()
        self.test_role_based_access_control()
        
        # Print summary
        print("\n" + "=" * 70)
        print("📊 AUTHENTICATION TEST SUMMARY")
        print("=" * 70)
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
    tester = AuthenticationTester()
    success = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)