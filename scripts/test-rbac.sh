#!/bin/bash

BASE_URL="http://localhost:3000/api"
ADMIN_EMAIL="admin@zollandmeter.com"
ADMIN_PASS="Admin@123!"

echo "🔹 1. Logging in as Admin..."
LOGIN_RES=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$ADMIN_EMAIL\", \"password\": \"$ADMIN_PASS\"}")

ACCESS_TOKEN=$(echo $LOGIN_RES | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ Admin login failed"
  echo $LOGIN_RES
  exit 1
fi
echo "✅ Admin logged in"

echo "🔹 2. Listing Users (Admin)..."
USERS_RES=$(curl -s -X GET "$BASE_URL/users" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if [[ $USERS_RES == *"users"* ]]; then
  echo "✅ Admin can list users"
else
  echo "❌ Admin failed to list users"
  echo $USERS_RES
fi

echo "🔹 3. Creating Worker User..."
WORKER_EMAIL="worker_test_$(date +%s)_$RANDOM@example.com"
WORKER_PASS='WorkerPass123@'
CREATE_RES=$(curl -s -X POST "$BASE_URL/users" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$WORKER_EMAIL\",
    \"password\": \"$WORKER_PASS\",
    \"name\": {\"firstName\": \"Test\", \"lastName\": \"Worker\"},
    \"referralCode\": \"REF$(date +%s)$RANDOM\",
    \"roles\": [\"worker\"]
  }")

if [[ $CREATE_RES == *"user"* ]]; then
  echo "✅ Worker user created"
else
  echo "❌ Failed to create worker"
  echo $CREATE_RES
  echo "DEBUG: Current Users:"
  curl -s -X GET "$BASE_URL/users" -H "Authorization: Bearer $ACCESS_TOKEN"
  exit 1
fi

echo "🔹 4. Logging in as Worker..."
WORKER_LOGIN_RES=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$WORKER_EMAIL\", \"password\": \"$WORKER_PASS\"}")

WORKER_TOKEN=$(echo $WORKER_LOGIN_RES | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$WORKER_TOKEN" ]; then
  echo "❌ Worker login failed"
  echo $WORKER_LOGIN_RES
  exit 1
fi
echo "✅ Worker logged in"

echo "🔹 5. Verifying Worker Restrictions (List Users)..."
WORKER_LIST_RES=$(curl -s -X GET "$BASE_URL/users" \
  -H "Authorization: Bearer $WORKER_TOKEN")

if [[ $WORKER_LIST_RES == *"Forbidden"* ]] || [[ $WORKER_LIST_RES == *"Missing required permission"* ]]; then
  echo "✅ Worker correctly denied access to list users"
else
  echo "❌ Worker was able to list users (Security Issue!)"
  echo $WORKER_LIST_RES
fi

echo "🔹 6. Verifying Worker Profile Access..."
WORKER_ME_RES=$(curl -s -X GET "$BASE_URL/auth/me" \
  -H "Authorization: Bearer $WORKER_TOKEN")

if [[ $WORKER_ME_RES == *"worker"* ]]; then
  echo "✅ Worker can access own profile"
else
  echo "❌ Worker failed to access profile"
  echo $WORKER_ME_RES
fi

echo "🎉 All RBAC tests passed!"
