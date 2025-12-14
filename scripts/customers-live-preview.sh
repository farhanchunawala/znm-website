#!/bin/bash
# Customers API - Live Feature Demonstration
set -e

BASE_URL="http://localhost:3000/api"
ADMIN_EMAIL="admin@zollandmeter.com"
ADMIN_PASS="Admin@123!"

echo "🎬 Customers API - Live Feature Demonstration"
echo "=============================================="
echo ""

# Login
echo "🔐 Authenticating..."
ADMIN_RESP=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASS\"}")

ADMIN_TOKEN=$(node -e "const r=JSON.parse(process.argv[1]); console.log(r.data?.accessToken||'');" "$ADMIN_RESP")

if [ -z "$ADMIN_TOKEN" ]; then
  echo "❌ Authentication failed"
  exit 1
fi
echo "✅ Authenticated as admin"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Feature 1: List Customers with Pagination"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Request: GET /api/customers?status=active&limit=5"
echo ""

curl -s -X GET "$BASE_URL/customers?status=active&limit=5" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | node -e "
const data = JSON.parse(require('fs').readFileSync(0, 'utf-8'));
if (data.success) {
  console.log('Response:');
  console.log('  Total Customers:', data.data.pagination.total);
  console.log('  Page:', data.data.pagination.page, '/', data.data.pagination.totalPages);
  console.log('  Showing:', data.data.customers.length, 'customers');
  console.log('');
  if (data.data.customers.length > 0) {
    console.log('Customers:');
    data.data.customers.forEach((c, i) => {
      console.log(\`  \${i+1}. \${c.name}\`);
      console.log(\`     Email: \${c.email || 'N/A'}\`);
      console.log(\`     Phone: \${c.phone || 'N/A'}\`);
      console.log(\`     Status: \${c.status}\`);
      console.log(\`     Tags: [\${c.tags.join(', ')}]\`);
      console.log('');
    });
  } else {
    console.log('  (No customers in database yet)');
  }
} else {
  console.log('❌ Error:', data.error.message);
}
"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Feature 2: Smart Search (Phone/Email Priority)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Request: GET /api/customers?q=admin@zollandmeter.com"
echo ""

curl -s -X GET "$BASE_URL/customers?q=admin@zollandmeter.com" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | node -e "
const data = JSON.parse(require('fs').readFileSync(0, 'utf-8'));
if (data.success) {
  console.log('Response:');
  if (data.data.customers.length > 0) {
    const c = data.data.customers[0];
    console.log('  ✅ Exact match found!');
    console.log('  Name:', c.name);
    console.log('  Email:', c.email);
    console.log('  Status:', c.status);
  } else {
    console.log('  No exact match found');
    console.log('  (Would fall back to text search)');
  }
} else {
  console.log('❌ Error:', data.error.message);
}
"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🏷️  Feature 3: Tag-Based Filtering"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Request: GET /api/customers?tag=vip&status=active"
echo ""

curl -s -X GET "$BASE_URL/customers?tag=vip&status=active" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | node -e "
const data = JSON.parse(require('fs').readFileSync(0, 'utf-8'));
if (data.success) {
  console.log('Response:');
  console.log('  VIP Customers Found:', data.data.pagination.total);
  if (data.data.customers.length > 0) {
    data.data.customers.forEach((c, i) => {
      console.log(\`  \${i+1}. \${c.name} - Tags: [\${c.tags.join(', ')}]\`);
    });
  } else {
    console.log('  (No VIP customers yet)');
  }
} else {
  console.log('❌ Error:', data.error.message);
}
"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔄 Feature 4: Duplicate Detection"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Request: POST /api/customers/dedupe/scan"
echo "Body: {\"confidenceThreshold\": 0.8, \"limit\": 10}"
echo ""

curl -s -X POST "$BASE_URL/customers/dedupe/scan" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"confidenceThreshold": 0.8, "limit": 10}' | node -e "
const data = JSON.parse(require('fs').readFileSync(0, 'utf-8'));
if (data.success) {
  console.log('Response:');
  console.log('  Duplicate Candidates:', data.data.count);
  if (data.data.count > 0) {
    data.data.candidates.forEach((c, i) => {
      console.log(\`  \${i+1}. \${c.reason} (Confidence: \${c.confidence * 100}%)\`);
      console.log(\`     Affected Customers: \${c.customers.length}\`);
    });
  } else {
    console.log('  ✅ No duplicates detected');
  }
} else {
  console.log('❌ Error:', data.error.message);
}
"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 Feature 5: Customer Creation with Upsert"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Request: POST /api/customers"
echo "Body: {email, phone, name, tags, upsert: true}"
echo ""

TIMESTAMP=$(node -e "console.log(Date.now())")
TEST_EMAIL="preview_${TIMESTAMP}@example.com"

curl -s -X POST "$BASE_URL/customers" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"name\": \"Preview Demo Customer\",
    \"tags\": [\"demo\", \"preview\"],
    \"upsert\": true
  }" | node -e "
const data = JSON.parse(require('fs').readFileSync(0, 'utf-8'));
if (data.success) {
  const c = data.data.customer;
  console.log('Response:');
  console.log('  ✅ Customer created successfully!');
  console.log('  ID:', c._id);
  console.log('  Name:', c.name);
  console.log('  Email:', c.email);
  console.log('  Tags:', c.tags.join(', '));
  console.log('  Status:', c.status);
  process.env.DEMO_CUSTOMER_ID = c._id;
} else {
  console.log('❌ Error:', data.error.message);
  console.log('   Code:', data.error.code);
}
"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Live Preview Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Features Demonstrated:"
echo "  ✓ Customer listing with pagination"
echo "  ✓ Smart search (exact match priority)"
echo "  ✓ Tag-based filtering"
echo "  ✓ Duplicate detection scan"
echo "  ✓ Customer creation with upsert"
echo ""
echo "📚 Additional Features Available:"
echo "  • Multi-address management (add/update/delete)"
echo "  • Tag management (add/remove)"
echo "  • Customer merge with conflict resolution"
echo "  • GDPR anonymization"
echo "  • Self-access controls for customers"
echo ""
echo "📖 Full documentation:"
echo "  scripts/test-customers.sh - Complete test suite"
echo "  customers-api-documentation.md - API reference"
