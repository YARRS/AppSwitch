#!/usr/bin/env python3
"""
Backend Authentication Testing Script for SmartSwitch IoT Application
Tests all authentication endpoints and verifies functionality
"""

import requests
import json
import sys
from datetime import datetime
import random
import string

# Backend URL from frontend .env
BACKEND_URL = "https://b10e2e92-18e0-431f-80c5-732bab767d6c.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

class BackendTester:
    def __init__(self):
        self.results = []
        self.total_tests = 0
        self.passed_tests = 0
        self.failed_tests = 0
        
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