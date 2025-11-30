#!/bin/bash

BASE_URL="http://localhost:3001/api"

echo "=== Testing Auth & Settings API ==="
echo ""

# 1. Register a test user
echo "1. Register a test user:"
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser4","email":"test4@example.com","password":"TestPassword123!"}')
echo "$REGISTER_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$REGISTER_RESPONSE"

# Extract token
TOKEN=$(echo "$REGISTER_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('token', ''))" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "Failed to get token. Trying login..."
  LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"test4@example.com","password":"TestPassword123!"}')
  echo "$LOGIN_RESPONSE"
  TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('token', ''))" 2>/dev/null)
fi

echo ""
echo "Token: ${TOKEN:0:50}..."
echo ""

if [ -n "$TOKEN" ]; then
  echo "2. Get all settings (should be empty):"
  curl -s "$BASE_URL/settings" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool 2>/dev/null
  echo ""

  echo "3. Save visual_config:"
  curl -s -X PUT "$BASE_URL/settings/visual_config" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"value":{"showHull":true,"nodeFontSize":16,"nodeSize":22}}' | python3 -m json.tool 2>/dev/null
  echo ""

  echo "4. Get settings after save:"
  curl -s "$BASE_URL/settings" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool 2>/dev/null
  echo ""

  echo "5. Create a custom link:"
  curl -s -X POST "$BASE_URL/custom-links" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"from":"zaf-r1","to":"lso-r1","forwardCost":15,"reverseCost":20}' | python3 -m json.tool 2>/dev/null
  echo ""

  echo "6. Get all custom links:"
  curl -s "$BASE_URL/custom-links" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool 2>/dev/null
  echo ""

  echo "7. Create a failure scenario:"
  curl -s -X POST "$BASE_URL/scenarios" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"name":"Test Scenario","description":"Testing","failedNodes":["zaf-r1"],"failedEdges":[],"mode":"single"}' | python3 -m json.tool 2>/dev/null
  echo ""

  echo "8. Get all scenarios:"
  curl -s "$BASE_URL/scenarios" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool 2>/dev/null
  echo ""

  echo "=== All API tests completed! ==="
else
  echo "ERROR: Could not obtain authentication token"
  exit 1
fi
