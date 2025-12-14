#!/bin/bash
# Live test script for RBAC system
set -e
BASE_URL="http://localhost:3000/api"

# Admin login
ADMIN_RESP=$(curl -s -X POST "$BASE_URL/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"admin@zollandmeter.com\",\"password\":\"Admin@123!\"}")
ADMIN_TOKEN=$(node -e "const r=JSON.parse(process.argv[1]); console.log(r.data?.accessToken||'');" "$ADMIN_RESP")
echo "Admin login response: $ADMIN_RESP"

# List users as admin
echo "\nList users as admin:"
curl -s -X GET "$BASE_URL/users" -H "Authorization: Bearer $ADMIN_TOKEN"

# Create worker
WORKER_EMAIL="worker_$(date +%s)_$RANDOM@example.com"
WORKER_PASS="WorkerPass123@"
CREATE_RESP=$(curl -s -X POST "$BASE_URL/users" -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" -d "{\"email\":\"$WORKER_EMAIL\",\"password\":\"$WORKER_PASS\",\"name\":{\"firstName\":\"Test\",\"lastName\":\"Worker\"},\"referralCode\":\"REF$(date +%s)$RANDOM\",\"roles\":[\"worker\"]}")
echo "\nCreate worker response: $CREATE_RESP"

# Worker login
WORKER_RESP=$(curl -s -X POST "$BASE_URL/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"$WORKER_EMAIL\",\"password\":\"$WORKER_PASS\"}")
WORKER_TOKEN=$(node -e "const r=JSON.parse(process.argv[1]); console.log(r.data?.accessToken||'');" "$WORKER_RESP")
echo "\nWorker login response: $WORKER_RESP"

# List users as worker (should be forbidden)
echo "\nList users as worker (expected forbidden):"
curl -s -X GET "$BASE_URL/users" -H "Authorization: Bearer $WORKER_TOKEN"

# List audits as admin
echo "\nList audits as admin:"
AUDIT_LIST=$(curl -s -X GET "$BASE_URL/audit" -H "Authorization: Bearer $ADMIN_TOKEN")
echo "$AUDIT_LIST"
# Get first audit ID if exists
AUDIT_ID=$(node -e "const r=JSON.parse(process.argv[1]); const audits=r.data?.audits||[]; console.log(audits.length>0?audits[0]._id:'');" "$AUDIT_LIST")
if [ -n "$AUDIT_ID" ]; then
  echo "\nGet single audit entry $AUDIT_ID:"
  curl -s -X GET "$BASE_URL/audit/$AUDIT_ID" -H "Authorization: Bearer $ADMIN_TOKEN"
else
  echo "\nNo audit entries found."
fi
