#!/bin/bash

echo "🔧 Testing Order Placement Fix"
echo "============================="

BASE_URL="https://02ee6ebf-832a-438b-830c-4fcc5a409047.preview.emergentagent.com"
SESSION_ID="fix-test-$(date +%s)"

echo "Session ID: $SESSION_ID"
echo ""

echo "1️⃣ Getting first product..."
PRODUCT_DATA=$(curl -s "$BASE_URL/api/products/" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if data.get('data') and len(data['data']) > 0:
    product = data['data'][0]
    print(f'{product[\"id\"]}|{product[\"name\"]}|{product[\"discount_price\"] or product[\"price\"]}')
else:
    print('ERROR|No products found|0')
")

PRODUCT_ID=$(echo $PRODUCT_DATA | cut -d'|' -f1)
PRODUCT_NAME=$(echo $PRODUCT_DATA | cut -d'|' -f2)
PRODUCT_PRICE=$(echo $PRODUCT_DATA | cut -d'|' -f3)

echo "Using: $PRODUCT_NAME ($PRODUCT_PRICE)"
echo ""

echo "2️⃣ Adding to cart..."
ADD_RESPONSE=$(curl -s -X POST "$BASE_URL/api/cart/items/$PRODUCT_ID" \
  -H "Content-Type: application/json" \
  -H "X-Session-Id: $SESSION_ID" \
  -d '{"quantity": 1}')

echo "Cart Status: $(echo $ADD_RESPONSE | python3 -c "import sys, json; data=json.load(sys.stdin); print('SUCCESS' if data.get('success') else 'FAILED')")"
echo ""

echo "3️⃣ Testing guest order placement (with proper validation data)..."
ORDER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/orders/guest" \
  -H "Content-Type: application/json" \
  -H "X-Session-Id: $SESSION_ID" \
  -d "{
    \"items\": [
      {
        \"product_id\": \"$PRODUCT_ID\",
        \"product_name\": \"$PRODUCT_NAME\",
        \"quantity\": 1,
        \"price\": $PRODUCT_PRICE,
        \"total_price\": $PRODUCT_PRICE
      }
    ],
    \"shipping_address\": {
      \"full_name\": \"Fix Test Customer\",
      \"phone\": \"9876543210\",
      \"address_line1\": \"123 Fix Test Street\",
      \"city\": \"Fix City\",
      \"state\": \"Fix State\",
      \"zip_code\": \"123456\",
      \"country\": \"India\"
    },
    \"total_amount\": $PRODUCT_PRICE,
    \"tax_amount\": 6.00,
    \"shipping_cost\": 0,
    \"discount_amount\": 0,
    \"final_amount\": $(echo \"$PRODUCT_PRICE + 6.00\" | bc),
    \"payment_method\": \"COD\",
    \"customer_email\": \"fixtest@example.com\"
  }")

echo $ORDER_RESPONSE | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if data.get('success'):
        print('✅ ORDER PLACEMENT: SUCCESS')
        print(f'   Order Number: {data[\"data\"][\"order\"][\"order_number\"]}')
        print(f'   Auto Login: {data[\"data\"].get(\"user_logged_in\", False)}')
        print(f'   Customer: {data[\"data\"][\"user\"][\"full_name\"]}')
        print('')
        print('🎉 VALIDATION FIX: WORKING!')
    else:
        print('❌ ORDER PLACEMENT: FAILED')
        print(f'   Error: {data.get(\"detail\", \"Unknown error\")}')
except Exception as e:
    print(f'❌ Parse Error: {e}')
    print('Raw response:', sys.stdin.read())
"

echo ""
echo "✅ Order placement test completed!"
echo "The frontend validation error should now be fixed."
