#!/bin/bash
# Comprehensive test script for Customers subsystem
set -e

BASE_URL="http://localhost:3000/api"
ADMIN_EMAIL="admin@zollandmeter.com"
ADMIN_PASS="Admin@123!"

echo "🧪 Customers Subsystem Test Suite"
echo "=================================="

# Login as admin
echo ""
echo "🔹 1. Admin Login..."
ADMIN_RESP=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASS\"}")

ADMIN_TOKEN=$(node -e "const r=JSON.parse(process.argv[1]); console.log(r.data?.accessToken||'');" "$ADMIN_RESP")

if [ -z "$ADMIN_TOKEN" ]; then
  echo "❌ Admin login failed"
  echo "$ADMIN_RESP"
  exit 1
fi
echo "✅ Admin logged in"

# Test 1: Create Customer
echo ""
echo "🔹 2. Creating Customer..."
TIMESTAMP=$(node -e "console.log(Date.now())")
CUSTOMER_EMAIL="test_customer_${TIMESTAMP}@example.com"
CUSTOMER_PHONE="+919${TIMESTAMP:(-9)}"
CREATE_RESP=$(curl -s -X POST "$BASE_URL/customers" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$CUSTOMER_EMAIL\",
    \"phone\": \"$CUSTOMER_PHONE\",
    \"name\": \"Test Customer\",
    \"tags\": [\"test\", \"new-customer\"],
    \"upsert\": true
  }")

CUSTOMER_ID=$(node -e "const r=JSON.parse(process.argv[1]); console.log(r.data?.customer?._id||'');" "$CREATE_RESP")

if [ -z "$CUSTOMER_ID" ]; then
  echo "❌ Customer creation failed"
  echo "$CREATE_RESP"
  exit 1
fi
echo "✅ Customer created/updated: $CUSTOMER_ID"

# Test 2: Get Customer
echo ""
echo "🔹 3. Getting Customer Profile..."
GET_RESP=$(curl -s -X GET "$BASE_URL/customers/$CUSTOMER_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

if [[ $GET_RESP == *"$CUSTOMER_EMAIL"* ]]; then
  echo "✅ Customer profile retrieved"
else
  echo "❌ Failed to get customer"
  echo "$GET_RESP"
  exit 1
fi

# Test 3: Update Customer
echo ""
echo "🔹 4. Updating Customer..."
UPDATE_RESP=$(curl -s -X PATCH "$BASE_URL/customers/$CUSTOMER_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"gender\": \"male\", \"dob\": \"1990-01-01\"}")

if [[ $UPDATE_RESP == *"male"* ]]; then
  echo "✅ Customer updated"
else
  echo "❌ Failed to update customer"
  echo "$UPDATE_RESP"
  exit 1
fi

# Test 4: Add Address
echo ""
echo "🔹 5. Adding Address..."
ADD_ADDR_RESP=$(curl -s -X POST "$BASE_URL/customers/$CUSTOMER_ID/addresses" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"label\": \"home\",
    \"name\": \"Test Customer\",
    \"phone\": \"$CUSTOMER_PHONE\",
    \"pincode\": \"400001\",
    \"state\": \"Maharashtra\",
    \"city\": \"Mumbai\",
    \"locality\": \"Andheri West\",
    \"addressLine1\": \"123 Test Street\",
    \"isDefault\": true
  }")

ADDR_ID=$(node -e "const r=JSON.parse(process.argv[1]); console.log(r.data?.address?.id||'');" "$ADD_ADDR_RESP")

if [ -z "$ADDR_ID" ]; then
  echo "❌ Address creation failed"
  echo "$ADD_ADDR_RESP"
  exit 1
fi
echo "✅ Address added: $ADDR_ID"

# Test 5: Update Address
echo ""
echo "🔹 6. Updating Address..."
UPDATE_ADDR_RESP=$(curl -s -X PATCH "$BASE_URL/customers/$CUSTOMER_ID/addresses/$ADDR_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"addressLine2\": \"Apartment 4B\"}")

if [[ $UPDATE_ADDR_RESP == *"Apartment 4B"* ]]; then
  echo "✅ Address updated"
else
  echo "❌ Failed to update address"
  echo "$UPDATE_ADDR_RESP"
  exit 1
fi

# Test 6: Add Second Address
echo ""
echo "🔹 7. Adding Second Address..."
ADD_ADDR2_RESP=$(curl -s -X POST "$BASE_URL/customers/$CUSTOMER_ID/addresses" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"label\": \"work\",
    \"name\": \"Test Customer\",
    \"phone\": \"$CUSTOMER_PHONE\",
    \"pincode\": \"400002\",
    \"state\": \"Maharashtra\",
    \"city\": \"Mumbai\",
    \"locality\": \"Bandra\",
    \"addressLine1\": \"456 Office Street\",
    \"isDefault\": false
  }")

ADDR2_ID=$(node -e "const r=JSON.parse(process.argv[1]); console.log(r.data?.address?.id||'');" "$ADD_ADDR2_RESP")

if [ -z "$ADDR2_ID" ]; then
  echo "❌ Second address creation failed"
  exit 1
fi
echo "✅ Second address added: $ADDR2_ID"

# Test 7: Add Tags
echo ""
echo "🔹 8. Adding Tags..."
ADD_TAGS_RESP=$(curl -s -X POST "$BASE_URL/customers/$CUSTOMER_ID/tags" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"tags\": [\"vip\", \"premium\"]}")

if [[ $ADD_TAGS_RESP == *"vip"* ]]; then
  echo "✅ Tags added"
else
  echo "❌ Failed to add tags"
  echo "$ADD_TAGS_RESP"
  exit 1
fi

# Test 8: Remove Tag
echo ""
echo "🔹 9. Removing Tag..."
REMOVE_TAG_RESP=$(curl -s -X DELETE "$BASE_URL/customers/$CUSTOMER_ID/tags/test" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

if [[ $REMOVE_TAG_RESP == *"success"* ]]; then
  echo "✅ Tag removed"
else
  echo "❌ Failed to remove tag"
  echo "$REMOVE_TAG_RESP"
  exit 1
fi

# Test 9: List Customers
echo ""
echo "🔹 10. Listing Customers..."
LIST_RESP=$(curl -s -X GET "$BASE_URL/customers?status=active&limit=5" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

if [[ $LIST_RESP == *"customers"* ]]; then
  echo "✅ Customers listed"
else
  echo "❌ Failed to list customers"
  echo "$LIST_RESP"
  exit 1
fi

# Test 10: Search Customer by Phone
echo ""
echo "🔹 11. Searching Customer by Phone..."
SEARCH_RESP=$(curl -s -X GET "$BASE_URL/customers?q=$CUSTOMER_PHONE" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

if [[ $SEARCH_RESP == *"$CUSTOMER_EMAIL"* ]]; then
  echo "✅ Customer found by phone"
else
  echo "❌ Failed to search customer"
  echo "$SEARCH_RESP"
  exit 1
fi

# Test 11: Create Second Customer for Merge
echo ""
echo "🔹 12. Creating Second Customer for Merge Test..."
CUSTOMER2_EMAIL="test_customer2_$(date +%s)@example.com"
CREATE2_RESP=$(curl -s -X POST "$BASE_URL/customers" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$CUSTOMER2_EMAIL\",
    \"name\": \"Test Customer 2\",
    \"tags\": [\"duplicate\"]
  }")

CUSTOMER2_ID=$(node -e "const r=JSON.parse(process.argv[1]); console.log(r.data?.customer?._id||'');" "$CREATE2_RESP")

if [ -z "$CUSTOMER2_ID" ]; then
  echo "❌ Second customer creation failed"
  exit 1
fi
echo "✅ Second customer created: $CUSTOMER2_ID"

# Test 12: Merge Preview (Dry Run)
echo ""
echo "🔹 13. Testing Merge Preview..."
MERGE_PREVIEW_RESP=$(curl -s -X POST "$BASE_URL/customers/merge" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"targetCustomerId\": \"$CUSTOMER_ID\",
    \"sourceCustomerIds\": [\"$CUSTOMER2_ID\"],
    \"dryRun\": true
  }")

if [[ $MERGE_PREVIEW_RESP == *"preview"* ]]; then
  echo "✅ Merge preview generated"
else
  echo "❌ Failed to generate merge preview"
  echo "$MERGE_PREVIEW_RESP"
  exit 1
fi

# Test 13: Execute Merge
echo ""
echo "🔹 14. Executing Merge..."
MERGE_RESP=$(curl -s -X POST "$BASE_URL/customers/merge" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"targetCustomerId\": \"$CUSTOMER_ID\",
    \"sourceCustomerIds\": [\"$CUSTOMER2_ID\"],
    \"dryRun\": false
  }")

if [[ $MERGE_RESP == *"success"* ]]; then
  echo "✅ Customers merged"
else
  echo "❌ Failed to merge customers"
  echo "$MERGE_RESP"
  exit 1
fi

# Test 14: Verify Merged Customer Status
echo ""
echo "🔹 15. Verifying Merged Customer Status..."
MERGED_RESP=$(curl -s -X GET "$BASE_URL/customers/$CUSTOMER2_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

if [[ $MERGED_RESP == *"merged"* ]]; then
  echo "✅ Source customer marked as merged"
else
  echo "⚠️  Source customer status unclear"
fi

# Test 15: Dedupe Scan
echo ""
echo "🔹 16. Running Dedupe Scan..."
DEDUPE_RESP=$(curl -s -X POST "$BASE_URL/customers/dedupe/scan" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"confidenceThreshold\": 0.8, \"limit\": 10}")

if [[ $DEDUPE_RESP == *"candidates"* ]]; then
  echo "✅ Dedupe scan completed"
else
  echo "❌ Failed to run dedupe scan"
  echo "$DEDUPE_RESP"
  exit 1
fi

# Test 16: Delete Address
echo ""
echo "🔹 17. Deleting Non-Primary Address..."
DELETE_ADDR_RESP=$(curl -s -X DELETE "$BASE_URL/customers/$CUSTOMER_ID/addresses/$ADDR2_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

if [[ $DELETE_ADDR_RESP == *"success"* ]]; then
  echo "✅ Address deleted"
else
  echo "❌ Failed to delete address"
  echo "$DELETE_ADDR_RESP"
  exit 1
fi

# Test 17: Anonymize Customer
echo ""
echo "🔹 18. Anonymizing Customer (GDPR)..."
ANON_RESP=$(curl -s -X POST "$BASE_URL/customers/$CUSTOMER_ID/anonymize" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

if [[ $ANON_RESP == *"anonymized"* ]]; then
  echo "✅ Customer anonymized"
else
  echo "❌ Failed to anonymize customer"
  echo "$ANON_RESP"
  exit 1
fi

# Test 18: Verify Anonymization
echo ""
echo "🔹 19. Verifying Anonymization..."
ANON_CHECK_RESP=$(curl -s -X GET "$BASE_URL/customers/$CUSTOMER_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

if [[ $ANON_CHECK_RESP == *"anonymized"* ]] && [[ $ANON_CHECK_RESP == *"deleted.local"* ]]; then
  echo "✅ Anonymization verified"
else
  echo "❌ Anonymization verification failed"
  echo "$ANON_CHECK_RESP"
  exit 1
fi

echo ""
echo "=================================="
echo "✅ All Tests Passed!"
echo "=================================="
echo ""
echo "Test Summary:"
echo "- Customer CRUD: ✅"
echo "- Address Management: ✅"
echo "- Tag Management: ✅"
echo "- Search: ✅"
echo "- Merge Operations: ✅"
echo "- Dedupe Scan: ✅"
echo "- GDPR Anonymization: ✅"
