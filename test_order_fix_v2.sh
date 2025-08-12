#!/bin/bash

echo "🔧 Testing Order Placement Fix - API Level"
echo "========================================"

BASE_URL="https://guest-order-login.preview.emergentagent.com"
SESSION_ID="fix-test-$(date +%s)"

echo "Session ID: $SESSION_ID"
echo ""

echo "1️⃣ Testing guest order placement..."
ORDER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/orders/guest" \
  -H "Content-Type: application/json" \
  -H "X-Session-Id: $SESSION_ID" \
  -d '{
    "items": [
      {
        "product_id": "29f5774d-a8d1-4295-9cd2-c7c18a3d4e57",
        "product_name": "Test Product",
        "quantity": 1,
        "price": 50.00,
        "total_price": 50.00
      }
    ],
    "shipping_address": {
      "full_name": "Fix Test Customer",
      "phone": "9876543210",
      "address_line1": "123 Fix Test Street",
      "city": "Fix City",
      "state": "Fix State",
      "zip_code": "123456",
      "country": "India"
    },
    "total_amount": 50.00,
    "tax_amount": 4.00,
    "shipping_cost": 0.00,
    "discount_amount": 0.00,
    "final_amount": 54.00,
    "payment_method": "COD",
    "customer_email": "fixtest@example.com"
  }')

echo $ORDER_RESPONSE | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if data.get('success'):
        print('✅ BACKEND ORDER PLACEMENT: SUCCESS')
        print(f'   Order Number: {data[\"data\"][\"order\"][\"order_number\"]}')
        print(f'   Auto Login: {data[\"data\"].get(\"user_logged_in\", False)}')
        print('')
        print('🎉 BACKEND API: WORKING!')
        print('The frontend validation fix should resolve the TypeError.')
    else:
        print('❌ BACKEND ORDER PLACEMENT: FAILED')
        print(f'   Error: {data.get(\"detail\", \"Unknown error\")}')
        print('')
        print('Need to check backend issues.')
except Exception as e:
    print(f'❌ Parse Error: {e}')
    print('Raw response length:', len(sys.stdin.read()))
"

echo ""
echo "2️⃣ Frontend validation fix applied:"
echo "   - Added customer_phone field to initial state"
echo "   - Added null checks before .trim() calls"
echo "   - This should prevent 'Cannot read properties of undefined' error"
echo ""
echo "✅ Please test the frontend checkout flow now!"
