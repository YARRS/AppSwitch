#!/usr/bin/env python3
"""
Backend API Testing Script for Mobile Login Functionality
FOCUS: Testing new mobile number login functionality including:
- Login type detection (email vs phone)
- Mobile login flow with OTP verification
- OTP sending and verification
- Password reset flow
- Traditional email login compatibility
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
BACKEND_URL = "https://admin-user-panel.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

# Auto-seeded user credentials for testing (from seed_database.py)
# Updated with phone numbers from seeded users
AUTO_SEEDED_USERS = [
    {"email": "customer@vallmark.com", "password": "Customer123!", "role": "customer", "phone": "+1234567898"},
    {"email": "admin@vallmark.com", "password": "Admin123!", "role": "admin", "phone": "+1234567891"},
    {"email": "superadmin@vallmark.com", "password": "SuperAdmin123!", "role": "super_admin", "phone": "+1234567890"},
    {"email": "storeowner@vallmark.com", "password": "StoreOwner123!", "role": "store_owner", "phone": "+1234567892"},
    {"email": "storemanager@vallmark.com", "password": "StoreManager123!", "role": "store_admin", "phone": "+1234567893"},
    {"email": "salesperson@vallmark.com", "password": "Salesperson123!", "role": "salesperson", "phone": "+1234567894"},
    {"email": "salesmanager@vallmark.com", "password": "SalesManager123!", "role": "sales_manager", "phone": "+1234567895"},
    {"email": "support@vallmark.com", "password": "Support123!", "role": "support_executive", "phone": "+1234567896"},
    {"email": "marketing@vallmark.com", "password": "Marketing123!", "role": "marketing_manager", "phone": "+1234567897"}
]

# Test phone numbers in different formats for testing
TEST_PHONE_FORMATS = [
    "1234567898",      # 10 digits
    "+1234567898",     # With + prefix
    "01234567898",     # With leading 0
    "911234567898",    # With country code 91
    "+911234567898"    # With +91 country code
]

class MobileLoginTester:
    def __init__(self):
        self.results = []
        self.total_tests = 0
        self.passed_tests = 0
        self.failed_tests = 0
        self.auth_tokens = {}  # Store tokens for different users
        self.otp_sessions = {}  # Store OTP sessions for testing
        
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
    
    def test_login_type_detection_email(self):
        """Test login type detection with email addresses"""
        try:
            test_emails = [
                "admin@vallmark.com",
                "customer@vallmark.com", 
                "test.user@example.com",
                "user+tag@domain.co.uk"
            ]
            
            passed_count = 0
            for email in test_emails:
                try:
                    response = requests.post(
                        f"{API_BASE}/auth/login/detect",
                        json={"identifier": email},
                        timeout=30
                    )
                    
                    if response.status_code == 200:
                        data = response.json()
                        if (data.get("success") and 
                            data.get("data", {}).get("login_type") == "email" and
                            data.get("data", {}).get("requires") == "password"):
                            passed_count += 1
                        else:
                            self.log_result(
                                f"Login Detection Email ({email})", 
                                "FAIL", 
                                f"Incorrect detection result", 
                                data
                            )
                    else:
                        self.log_result(
                            f"Login Detection Email ({email})", 
                            "FAIL", 
                            f"HTTP {response.status_code}: {response.text}"
                        )
                except Exception as e:
                    self.log_result(
                        f"Login Detection Email ({email})", 
                        "FAIL", 
                        f"Error: {str(e)}"
                    )
            
            if passed_count == len(test_emails):
                self.log_result(
                    "Login Type Detection - Email", 
                    "PASS", 
                    f"All {len(test_emails)} email addresses correctly detected as email type"
                )
                return True
            else:
                self.log_result(
                    "Login Type Detection - Email", 
                    "FAIL", 
                    f"Only {passed_count}/{len(test_emails)} emails correctly detected"
                )
                return False
                
        except Exception as e:
            self.log_result("Login Type Detection - Email", "FAIL", f"Error testing email detection: {str(e)}")
            return False
    
    def test_login_type_detection_phone(self):
        """Test login type detection with phone numbers in different formats"""
        try:
            test_phones = [
                "9876543210",      # 10 digits
                "+919876543210",   # With +91 country code
                "09876543210",     # With leading 0
                "919876543210",    # With 91 country code
                "1234567898"       # From seeded user
            ]
            
            passed_count = 0
            for phone in test_phones:
                try:
                    response = requests.post(
                        f"{API_BASE}/auth/login/detect",
                        json={"identifier": phone},
                        timeout=30
                    )
                    
                    if response.status_code == 200:
                        data = response.json()
                        if (data.get("success") and 
                            data.get("data", {}).get("login_type") == "phone" and
                            data.get("data", {}).get("requires") == "otp"):
                            passed_count += 1
                        else:
                            self.log_result(
                                f"Login Detection Phone ({phone})", 
                                "FAIL", 
                                f"Incorrect detection result", 
                                data
                            )
                    else:
                        self.log_result(
                            f"Login Detection Phone ({phone})", 
                            "FAIL", 
                            f"HTTP {response.status_code}: {response.text}"
                        )
                except Exception as e:
                    self.log_result(
                        f"Login Detection Phone ({phone})", 
                        "FAIL", 
                        f"Error: {str(e)}"
                    )
            
            if passed_count == len(test_phones):
                self.log_result(
                    "Login Type Detection - Phone", 
                    "PASS", 
                    f"All {len(test_phones)} phone numbers correctly detected as phone type"
                )
                return True
            else:
                self.log_result(
                    "Login Type Detection - Phone", 
                    "FAIL", 
                    f"Only {passed_count}/{len(test_phones)} phones correctly detected"
                )
                return False
                
        except Exception as e:
            self.log_result("Login Type Detection - Phone", "FAIL", f"Error testing phone detection: {str(e)}")
            return False
    
    def test_login_type_detection_invalid(self):
        """Test login type detection with invalid formats"""
        try:
            invalid_inputs = [
                "invalid",
                "123",
                "abc@",
                "@domain.com",
                "12345",  # Too short for phone
                "123456789012345"  # Too long for phone
            ]
            
            passed_count = 0
            for invalid_input in invalid_inputs:
                try:
                    response = requests.post(
                        f"{API_BASE}/auth/login/detect",
                        json={"identifier": invalid_input},
                        timeout=30
                    )
                    
                    # Should return 400 for invalid formats
                    if response.status_code == 400:
                        passed_count += 1
                    else:
                        self.log_result(
                            f"Login Detection Invalid ({invalid_input})", 
                            "FAIL", 
                            f"Expected 400, got {response.status_code}"
                        )
                except Exception as e:
                    self.log_result(
                        f"Login Detection Invalid ({invalid_input})", 
                        "FAIL", 
                        f"Error: {str(e)}"
                    )
            
            if passed_count == len(invalid_inputs):
                self.log_result(
                    "Login Type Detection - Invalid", 
                    "PASS", 
                    f"All {len(invalid_inputs)} invalid inputs correctly rejected"
                )
                return True
            else:
                self.log_result(
                    "Login Type Detection - Invalid", 
                    "FAIL", 
                    f"Only {passed_count}/{len(invalid_inputs)} invalid inputs correctly rejected"
                )
                return False
                
        except Exception as e:
            self.log_result("Login Type Detection - Invalid", "FAIL", f"Error testing invalid detection: {str(e)}")
            return False
    
    def test_otp_sending(self):
        """Test OTP sending for valid phone numbers"""
        try:
            # Test with seeded user phone numbers
            test_phones = ["1234567898", "1234567891", "9876543210"]
            
            passed_count = 0
            for phone in test_phones:
                try:
                    response = requests.post(
                        f"{API_BASE}/otp/send",
                        json={"phone_number": phone},
                        timeout=30
                    )
                    
                    if response.status_code == 200:
                        data = response.json()
                        if data.get("success"):
                            # Store OTP session info for later verification
                            self.otp_sessions[phone] = {
                                "test_otp": data.get("data", {}).get("test_otp", "079254"),
                                "expires_in": data.get("data", {}).get("expires_in", 600)
                            }
                            passed_count += 1
                        else:
                            self.log_result(
                                f"OTP Send ({phone})", 
                                "FAIL", 
                                f"API returned success=false", 
                                data
                            )
                    else:
                        self.log_result(
                            f"OTP Send ({phone})", 
                            "FAIL", 
                            f"HTTP {response.status_code}: {response.text}"
                        )
                except Exception as e:
                    self.log_result(
                        f"OTP Send ({phone})", 
                        "FAIL", 
                        f"Error: {str(e)}"
                    )
            
            if passed_count == len(test_phones):
                self.log_result(
                    "OTP Sending", 
                    "PASS", 
                    f"OTP sent successfully to all {len(test_phones)} phone numbers"
                )
                return True
            else:
                self.log_result(
                    "OTP Sending", 
                    "FAIL", 
                    f"OTP sent to only {passed_count}/{len(test_phones)} phone numbers"
                )
                return False
                
        except Exception as e:
            self.log_result("OTP Sending", "FAIL", f"Error testing OTP sending: {str(e)}")
            return False
    
    def test_mobile_login_with_otp(self):
        """Test mobile login flow with OTP verification"""
        try:
            # Test with seeded users who have phone numbers
            test_users = [
                {"phone": "1234567898", "role": "customer"},
                {"phone": "1234567891", "role": "admin"}
            ]
            
            test_otps = ["123456", "079254"]  # Both testing OTPs mentioned in review
            
            passed_count = 0
            for user in test_users:
                for otp in test_otps:
                    try:
                        response = requests.post(
                            f"{API_BASE}/auth/login/mobile",
                            json={
                                "phone_number": user["phone"],
                                "otp": otp
                            },
                            timeout=30
                        )
                        
                        if response.status_code == 200:
                            data = response.json()
                            if data.get("access_token") and data.get("user"):
                                # Store token for later use
                                self.auth_tokens[f"{user['role']}_mobile"] = {
                                    "token": data["access_token"],
                                    "user": data["user"],
                                    "expires_in": data.get("expires_in", 86400)
                                }
                                passed_count += 1
                                self.log_result(
                                    f"Mobile Login ({user['role']} - OTP {otp})", 
                                    "PASS", 
                                    f"Successfully logged in with phone {user['phone']} and OTP {otp}",
                                    {
                                        "user_id": data["user"].get("id"),
                                        "email": data["user"].get("email"),
                                        "role": data["user"].get("role")
                                    }
                                )
                                break  # Success with this OTP, no need to test other OTP
                            else:
                                self.log_result(
                                    f"Mobile Login ({user['role']} - OTP {otp})", 
                                    "FAIL", 
                                    f"Missing access_token or user in response", 
                                    data
                                )
                        else:
                            self.log_result(
                                f"Mobile Login ({user['role']} - OTP {otp})", 
                                "FAIL", 
                                f"HTTP {response.status_code}: {response.text}"
                            )
                    except Exception as e:
                        self.log_result(
                            f"Mobile Login ({user['role']} - OTP {otp})", 
                            "FAIL", 
                            f"Error: {str(e)}"
                        )
            
            if passed_count >= len(test_users):
                self.log_result(
                    "Mobile Login Flow", 
                    "PASS", 
                    f"Mobile login successful for {passed_count} test cases"
                )
                return True
            else:
                self.log_result(
                    "Mobile Login Flow", 
                    "FAIL", 
                    f"Mobile login failed - only {passed_count} successful logins"
                )
                return False
                
        except Exception as e:
            self.log_result("Mobile Login Flow", "FAIL", f"Error testing mobile login: {str(e)}")
            return False
    
    def test_password_reset_request(self):
        """Test password reset request functionality"""
        try:
            test_emails = ["admin@vallmark.com", "customer@vallmark.com"]
            
            passed_count = 0
            for email in test_emails:
                try:
                    response = requests.post(
                        f"{API_BASE}/auth/password/reset-request",
                        json={"email": email},
                        timeout=30
                    )
                    
                    if response.status_code == 200:
                        data = response.json()
                        if data.get("success"):
                            # Check if test reset code is provided
                            reset_code = data.get("data", {}).get("test_reset_code")
                            if reset_code:
                                passed_count += 1
                                self.log_result(
                                    f"Password Reset Request ({email})", 
                                    "PASS", 
                                    f"Reset request successful, test code: {reset_code}"
                                )
                            else:
                                self.log_result(
                                    f"Password Reset Request ({email})", 
                                    "FAIL", 
                                    f"No test reset code in response", 
                                    data
                                )
                        else:
                            self.log_result(
                                f"Password Reset Request ({email})", 
                                "FAIL", 
                                f"API returned success=false", 
                                data
                            )
                    else:
                        self.log_result(
                            f"Password Reset Request ({email})", 
                            "FAIL", 
                            f"HTTP {response.status_code}: {response.text}"
                        )
                except Exception as e:
                    self.log_result(
                        f"Password Reset Request ({email})", 
                        "FAIL", 
                        f"Error: {str(e)}"
                    )
            
            if passed_count == len(test_emails):
                self.log_result(
                    "Password Reset Request", 
                    "PASS", 
                    f"Password reset request successful for all {len(test_emails)} emails"
                )
                return True
            else:
                self.log_result(
                    "Password Reset Request", 
                    "FAIL", 
                    f"Password reset request failed for some emails ({passed_count}/{len(test_emails)})"
                )
                return False
                
        except Exception as e:
            self.log_result("Password Reset Request", "FAIL", f"Error testing password reset request: {str(e)}")
            return False
    
    def test_password_reset_confirm(self):
        """Test password reset confirmation with reset code"""
        try:
            # First, request a password reset to get a valid reset code
            test_email = "customer@vallmark.com"
            
            # Request password reset first
            reset_request_response = requests.post(
                f"{API_BASE}/auth/password/reset-request",
                json={"email": test_email},
                timeout=30
            )
            
            if reset_request_response.status_code != 200:
                self.log_result(
                    "Password Reset Confirm", 
                    "FAIL", 
                    f"Could not request password reset: {reset_request_response.text}"
                )
                return False
            
            # Use the static reset code "RESET123" mentioned in review
            reset_code = "RESET123"
            new_password = "NewPassword123!"
            
            response = requests.post(
                f"{API_BASE}/auth/password/reset-confirm",
                json={
                    "email": test_email,
                    "reset_code": reset_code,
                    "new_password": new_password
                },
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_result(
                        "Password Reset Confirm", 
                        "PASS", 
                        f"Password reset confirmed successfully for {test_email}"
                    )
                    return True
                else:
                    self.log_result(
                        "Password Reset Confirm", 
                        "FAIL", 
                        f"API returned success=false", 
                        data
                    )
                    return False
            else:
                self.log_result(
                    "Password Reset Confirm", 
                    "FAIL", 
                    f"HTTP {response.status_code}: {response.text}"
                )
                return False
                
        except Exception as e:
            self.log_result("Password Reset Confirm", "FAIL", f"Error testing password reset confirm: {str(e)}")
            return False
    
    def test_traditional_email_login(self):
        """Test that traditional email/password login still works"""
        try:
            # Test with seeded users
            test_users = [
                {"email": "admin@vallmark.com", "password": "Admin123!", "role": "admin"},
                {"email": "customer@vallmark.com", "password": "Customer123!", "role": "customer"}
            ]
            
            passed_count = 0
            for user in test_users:
                try:
                    login_data = {
                        "username": user["email"],
                        "password": user["password"]
                    }
                    
                    response = requests.post(f"{API_BASE}/auth/login", data=login_data, timeout=30)
                    
                    if response.status_code == 200:
                        data = response.json()
                        if data.get("access_token") and data.get("user"):
                            # Store token for later use
                            self.auth_tokens[f"{user['role']}_email"] = {
                                "token": data["access_token"],
                                "user": data["user"],
                                "expires_in": data.get("expires_in", 86400)
                            }
                            passed_count += 1
                            self.log_result(
                                f"Traditional Email Login ({user['role']})", 
                                "PASS", 
                                f"Successfully logged in with email {user['email']}",
                                {
                                    "user_id": data["user"].get("id"),
                                    "email": data["user"].get("email"),
                                    "role": data["user"].get("role")
                                }
                            )
                        else:
                            self.log_result(
                                f"Traditional Email Login ({user['role']})", 
                                "FAIL", 
                                f"Missing access_token or user in response", 
                                data
                            )
                    else:
                        self.log_result(
                            f"Traditional Email Login ({user['role']})", 
                            "FAIL", 
                            f"HTTP {response.status_code}: {response.text}"
                        )
                except Exception as e:
                    self.log_result(
                        f"Traditional Email Login ({user['role']})", 
                        "FAIL", 
                        f"Error: {str(e)}"
                    )
            
            if passed_count == len(test_users):
                self.log_result(
                    "Traditional Email Login", 
                    "PASS", 
                    f"Traditional email login working for all {len(test_users)} test users"
                )
                return True
            else:
                self.log_result(
                    "Traditional Email Login", 
                    "FAIL", 
                    f"Traditional email login failed for some users ({passed_count}/{len(test_users)})"
                )
                return False
                
        except Exception as e:
            self.log_result("Traditional Email Login", "FAIL", f"Error testing traditional email login: {str(e)}")
            return False
    
    def test_jwt_token_validation(self):
        """Test JWT token validation by accessing protected endpoint"""
        try:
            passed_count = 0
            total_tokens = len(self.auth_tokens)
            
            for token_name, token_data in self.auth_tokens.items():
                try:
                    headers = {"Authorization": f"Bearer {token_data['token']}"}
                    
                    # Test /auth/me endpoint which requires valid JWT
                    response = requests.get(f"{API_BASE}/auth/me", headers=headers, timeout=30)
                    
                    if response.status_code == 200:
                        data = response.json()
                        user_info = data
                        passed_count += 1
                        self.log_result(
                            f"JWT Token Validation ({token_name})", 
                            "PASS", 
                            f"JWT token valid - retrieved user info for {user_info.get('full_name', 'Unknown')}",
                            {
                                "user_id": user_info.get("id"),
                                "email": user_info.get("email"),
                                "role": user_info.get("role")
                            }
                        )
                    else:
                        self.log_result(
                            f"JWT Token Validation ({token_name})", 
                            "FAIL", 
                            f"JWT validation failed: HTTP {response.status_code} - {response.text}"
                        )
                except Exception as e:
                    self.log_result(
                        f"JWT Token Validation ({token_name})", 
                        "FAIL", 
                        f"Error validating JWT: {str(e)}"
                    )
            
            if passed_count == total_tokens and total_tokens > 0:
                self.log_result(
                    "JWT Token Validation", 
                    "PASS", 
                    f"All {total_tokens} JWT tokens are valid and working"
                )
                return True
            else:
                self.log_result(
                    "JWT Token Validation", 
                    "FAIL", 
                    f"Only {passed_count}/{total_tokens} JWT tokens are valid"
                )
                return False
                
        except Exception as e:
            self.log_result("JWT Token Validation", "FAIL", f"Error testing JWT validation: {str(e)}")
            return False
    
    def run_comprehensive_mobile_login_test(self):
        """Run comprehensive mobile login functionality testing"""
        print("🚀 Starting Mobile Login Functionality Testing")
        print(f"Backend URL: {BACKEND_URL}")
        print("=" * 80)
        
        # Step 1: Health check
        print("\n🏥 Step 1: Health Check...")
        if not self.test_health_check():
            print("❌ Health check failed - cannot proceed")
            return False
        
        # Step 2: Login type detection - Email
        print("\n📧 Step 2: Login Type Detection - Email...")
        self.test_login_type_detection_email()
        
        # Step 3: Login type detection - Phone
        print("\n📱 Step 3: Login Type Detection - Phone...")
        self.test_login_type_detection_phone()
        
        # Step 4: Login type detection - Invalid
        print("\n❌ Step 4: Login Type Detection - Invalid Formats...")
        self.test_login_type_detection_invalid()
        
        # Step 5: OTP sending
        print("\n📲 Step 5: OTP Sending...")
        self.test_otp_sending()
        
        # Step 6: Mobile login with OTP
        print("\n🔐 Step 6: Mobile Login with OTP...")
        self.test_mobile_login_with_otp()
        
        # Step 7: Traditional email login
        print("\n📧 Step 7: Traditional Email Login...")
        self.test_traditional_email_login()
        
        # Step 8: JWT token validation
        print("\n🎫 Step 8: JWT Token Validation...")
        self.test_jwt_token_validation()
        
        # Step 9: Password reset request
        print("\n🔑 Step 9: Password Reset Request...")
        self.test_password_reset_request()
        
        # Step 10: Password reset confirm
        print("\n✅ Step 10: Password Reset Confirm...")
        self.test_password_reset_confirm()
        
        # Step 11: Summary and analysis
        print("\n📊 Step 11: Test Results Summary...")
        self.print_test_summary()
        
        return True
    
    def print_test_summary(self):
        """Print comprehensive test summary"""
        print("\n" + "=" * 80)
        print("📊 MOBILE LOGIN FUNCTIONALITY TESTING RESULTS")
        print("=" * 80)
        
        print(f"Total Tests: {self.total_tests}")
        print(f"Passed Tests: {self.passed_tests}")
        print(f"Failed Tests: {self.failed_tests}")
        print(f"Success Rate: {(self.passed_tests/self.total_tests*100):.1f}%")
        
        print(f"\n🔐 Authenticated Users: {len(self.auth_tokens)}")
        for role, token_data in self.auth_tokens.items():
            user_info = token_data.get("user", {})
            print(f"  - {role}: {user_info.get('full_name', 'Unknown')} ({user_info.get('email', 'Unknown')})")
        
        print(f"\n📲 OTP Sessions: {len(self.otp_sessions)}")
        for phone, otp_info in self.otp_sessions.items():
            print(f"  - {phone}: OTP {otp_info.get('test_otp', 'Unknown')}")
        
        print("\n❌ Failed Tests:")
        failed_tests = [r for r in self.results if r["status"] == "FAIL"]
        if failed_tests:
            for test in failed_tests:
                print(f"  - {test['test']}: {test['message']}")
        else:
            print("  None! All tests passed.")
        
        print("\n🔍 Key Findings:")
        
        # Analyze critical functionality
        login_detection_failures = [r for r in self.results if "Login Type Detection" in r["test"] and r["status"] == "FAIL"]
        otp_failures = [r for r in self.results if "OTP" in r["test"] and r["status"] == "FAIL"]
        mobile_login_failures = [r for r in self.results if "Mobile Login" in r["test"] and r["status"] == "FAIL"]
        email_login_failures = [r for r in self.results if "Traditional Email Login" in r["test"] and r["status"] == "FAIL"]
        password_reset_failures = [r for r in self.results if "Password Reset" in r["test"] and r["status"] == "FAIL"]
        jwt_failures = [r for r in self.results if "JWT" in r["test"] and r["status"] == "FAIL"]
        
        if not login_detection_failures:
            print("  - ✅ Login type detection working correctly")
            print("    • Email addresses correctly detected as email type")
            print("    • Phone numbers correctly detected as phone type")
            print("    • Invalid formats correctly rejected")
        else:
            print(f"  - ❌ Login type detection issues found ({len(login_detection_failures)} failures)")
        
        if not otp_failures:
            print("  - ✅ OTP system working correctly")
            print("    • OTP sending successful for valid phone numbers")
        else:
            print(f"  - ❌ OTP system issues ({len(otp_failures)} failures)")
        
        if not mobile_login_failures:
            print("  - ✅ Mobile login flow working correctly")
            print("    • Users can login with phone number and OTP")
            print("    • JWT tokens generated properly for mobile login")
        else:
            print(f"  - ❌ Mobile login issues found ({len(mobile_login_failures)} failures)")
            print("    • Mobile login is NOT working - CRITICAL ISSUE")
        
        if not email_login_failures:
            print("  - ✅ Traditional email login still working")
            print("    • Backward compatibility maintained")
        else:
            print(f"  - ❌ Traditional email login issues ({len(email_login_failures)} failures)")
            print("    • Email login compatibility broken - CRITICAL ISSUE")
        
        if not password_reset_failures:
            print("  - ✅ Password reset flow working correctly")
            print("    • Password reset request and confirmation working")
        else:
            print(f"  - ❌ Password reset issues ({len(password_reset_failures)} failures)")
        
        if not jwt_failures:
            print("  - ✅ JWT token validation working correctly")
            print("    • Tokens from both mobile and email login work properly")
        else:
            print(f"  - ❌ JWT token validation issues ({len(jwt_failures)} failures)")
        
        # Overall assessment
        critical_issues = len(mobile_login_failures) + len(email_login_failures) + len(login_detection_failures)
        if critical_issues == 0:
            print("\n🎉 OVERALL ASSESSMENT: MOBILE LOGIN FUNCTIONALITY WORKING CORRECTLY")
            print("  • Login type detection working for emails and phone numbers")
            print("  • OTP system functioning properly")
            print("  • Mobile login with OTP verification working")
            print("  • Traditional email login compatibility maintained")
            print("  • Password reset flow functional")
            print("  • JWT tokens working for both login methods")
        else:
            print(f"\n🚨 OVERALL ASSESSMENT: {critical_issues} CRITICAL ISSUES FOUND")
            if login_detection_failures:
                print("  • Login type detection has issues")
            if mobile_login_failures:
                print("  • Mobile login flow is NOT working")
            if email_login_failures:
                print("  • Traditional email login compatibility broken")


def main():
    """Main function to run mobile login tests"""
    tester = MobileLoginTester()
    
    try:
        success = tester.run_comprehensive_mobile_login_test()
        
        # Exit with appropriate code
        if tester.failed_tests == 0:
            print("\n✅ All mobile login functionality tests passed!")
            sys.exit(0)
        else:
            print(f"\n❌ {tester.failed_tests} tests failed. Issues found in mobile login functionality.")
            sys.exit(1)
            
    except KeyboardInterrupt:
        print("\n⚠️ Testing interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 Testing failed with error: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    main()