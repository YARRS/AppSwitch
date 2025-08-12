#!/bin/bash

echo "🛒 Testing Complete Cart to Checkout Flow"
echo "=========================================="

BASE_URL="https://guest-order-login.preview.emergentagent.com"
SESSION_ID="test-session-$(date +%s)"

echo "Session ID: $SESSION_ID"
echo ""

echo "1️⃣ Adding product to cart (Guest user)..."
ADD_RESPONSE=$(curl -s -X POST "$BASE_URL/api/cart/items/$(curl -s "$BASE_URL/api/products/" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['data'][0]['id'])")" \
  -H "Content-Type: application/json" \
  -H "X-Session-Id: $SESSION_ID" \
  -d '{"quantity": 1}')

echo "Response: $ADD_RESPONSE"
echo ""

echo "2️⃣ Getting cart contents..."
CART_RESPONSE=$(curl -s -X GET "$BASE_URL/api/cart/" \
  -H "X-Session-Id: $SESSION_ID")

echo "Response: $CART_RESPONSE"
echo ""

echo "3️⃣ Sending OTP for phone verification..."
OTP_SEND_RESPONSE=$(curl -s -X POST "$BASE_URL/api/otp/send" \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "9876543210"}')

echo "Response: $OTP_SEND_RESPONSE"
echo ""

echo "4️⃣ Verifying OTP..."
OTP_VERIFY_RESPONSE=$(curl -s -X POST "$BASE_URL/api/otp/verify" \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "9876543210", "otp": "079254"}')

echo "Response: $OTP_VERIFY_RESPONSE"
echo ""

echo "5️⃣ Placing guest order (should auto-login user)..."
ORDER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/orders/guest" \
  -H "Content-Type: application/json" \
  -H "X-Session-Id: $SESSION_ID" \
  -d '{
    "items": [
      {
        "product_id": "test-product-id",
        "product_name": "Test Product",
        "quantity": 1,
        "price": 29.99,
        "total_price": 29.99
      }
    ],
    "shipping_address": {
      "full_name": "Test Customer",
      "phone": "9876543210",
      "address_line1": "123 Test Street",
      "city": "Test City",
      "state": "Test State",
      "zip_code": "123456",
      "country": "India"
    },
    "total_amount": 29.99,
    "tax_amount": 2.40,
    "shipping_cost": 0,
    "discount_amount": 0,
    "final_amount": 32.39,
    "payment_method": "COD",
    "customer_email": "test@example.com"
  }')

echo "Response: $ORDER_RESPONSE"
echo ""

echo "✅ Flow test completed!"
