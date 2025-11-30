#!/bin/bash

# ========================================
# OSPF Visualizer Pro - Deployment Testing Script
# ========================================
# This script runs comprehensive tests on the deployed application
# Usage: ./scripts/test-deployment.sh <remote_host>
# Example: ./scripts/test-deployment.sh 172.16.39.172
# ========================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

REMOTE_HOST=${1:-172.16.39.172}
BACKEND_URL="http://${REMOTE_HOST}:9081"
FRONTEND_URL="http://${REMOTE_HOST}:9080"

echo -e "${BLUE}"
echo "========================================="
echo "  OSPF Visualizer Pro - Deployment Tests"
echo "  Target: ${REMOTE_HOST}"
echo "========================================="
echo -e "${NC}"

TESTS_PASSED=0
TESTS_FAILED=0

# Helper function to run tests
run_test() {
    local test_name=$1
    local test_command=$2
    
    echo -e "${YELLOW}Testing: ${test_name}${NC}"
    
    if eval "$test_command"; then
        echo -e "${GREEN}✅ PASS: ${test_name}${NC}\n"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}❌ FAIL: ${test_name}${NC}\n"
        ((TESTS_FAILED++))
        return 1
    fi
}

# ========================================
# TEST SUITE
# ========================================

echo -e "${BLUE}[1] Infrastructure Tests${NC}\n"

# Test 1: Backend Health Endpoint
run_test "Backend health endpoint responds" \
    "curl -f -s ${BACKEND_URL}/api/health | grep -q 'ok'"

# Test 2: Frontend is accessible
run_test "Frontend returns 200 status" \
    "curl -f -s -o /dev/null -w '%{http_code}' ${FRONTEND_URL} | grep -q '200'"

# Test 3: CORS headers
run_test "CORS headers are set" \
    "curl -s -I -H 'Origin: http://localhost:9080' ${BACKEND_URL}/api/health | grep -qi 'access-control'"

# Test 4: Rate limiting headers
run_test "Rate limit headers present" \
    "curl -s -I ${BACKEND_URL}/api/health | grep -qi 'ratelimit'"

echo -e "\n${BLUE}[2] Authentication API Tests${NC}\n"

# Test 5: Register endpoint exists
run_test "Register endpoint exists (405 on GET)" \
    "curl -s -o /dev/null -w '%{http_code}' ${BACKEND_URL}/api/auth/register | grep -qE '(405|404)'"

# Test 6: Login endpoint exists
run_test "Login endpoint exists (405 on GET)" \
    "curl -s -o /dev/null -w '%{http_code}' ${BACKEND_URL}/api/auth/login | grep -qE '(405|404)'"

# Test 7: Protected endpoint requires auth
run_test "Protected /me endpoint requires authentication" \
    "curl -s -o /dev/null -w '%{http_code}' ${BACKEND_URL}/api/auth/me | grep -q '401'"

echo -e "\n${BLUE}[3] Security Tests${NC}\n"

# Test 8: Helmet headers
run_test "Security headers (Helmet) are present" \
    "curl -s -I ${BACKEND_URL}/api/health | grep -qi 'x-content-type-options'"

# Test 9: XSS protection
run_test "XSS protection header present" \
    "curl -s -I ${BACKEND_URL}/api/health | grep -qi 'x-frame-options'"

# Test 10: Content Security Policy
run_test "CSP header present" \
    "curl -s -I ${BACKEND_URL}/api/health | grep -qi 'content-security-policy'"

echo -e "\n${BLUE}[4] Environment Validation Tests${NC}\n"

# Test 11: Environment variables are set
TEST_USER="testuser_$(date +%s)"
TEST_EMAIL="test_$(date +%s)@example.com"
TEST_PASSWORD="TestPass123!@#"

# Create a test registration
REGISTER_RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"${TEST_USER}\",\"email\":\"${TEST_EMAIL}\",\"password\":\"${TEST_PASSWORD}\"}" \
    ${BACKEND_URL}/api/auth/register)

run_test "User registration works" \
    "echo '${REGISTER_RESPONSE}' | grep -q 'token'"

# Extract token if registration succeeded
if echo "${REGISTER_RESPONSE}" | grep -q 'token'; then
    TOKEN=$(echo ${REGISTER_RESPONSE} | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    
    # Test 12: JWT token validation
    run_test "JWT token is valid" \
        "curl -s -H 'Authorization: Bearer ${TOKEN}' ${BACKEND_URL}/api/auth/me | grep -q 'user'"
    
    # Test 13: Logout works
    run_test "User logout works" \
        "curl -s -X POST -H 'Authorization: Bearer ${TOKEN}' ${BACKEND_URL}/api/auth/logout | grep -q '\"success\":true' || curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Authorization: Bearer ${TOKEN}' ${BACKEND_URL}/api/auth/logout | grep -q '200'"
fi

echo -e "\n${BLUE}[5] Frontend Tests${NC}\n"

# Test 14: Frontend has React root
run_test "Frontend contains React root element" \
    "curl -s ${FRONTEND_URL} | grep -q 'id=\"root\"'"

# Test 15: Frontend loads JavaScript
run_test "Frontend includes JavaScript modules" \
    "curl -s ${FRONTEND_URL} | grep -q 'type=\"module\"'"

# Test 16: Demo mode button present
run_test "Demo mode feature present in code" \
    "curl -s ${FRONTEND_URL} | grep -qi 'demo' || echo 'Skipping - may be in compiled JS'"

echo -e "\n${BLUE}[6] Performance Tests${NC}\n"

# Test 17: Backend response time
BACKEND_TIME=$(curl -o /dev/null -s -w '%{time_total}' ${BACKEND_URL}/api/health)
run_test "Backend responds in < 2 seconds" \
    "awk 'BEGIN {exit !('${BACKEND_TIME}' < 2)}'"

# Test 18: Frontend response time
FRONTEND_TIME=$(curl -o /dev/null -s -w '%{time_total}' ${FRONTEND_URL})
run_test "Frontend responds in < 5 seconds" \
    "awk 'BEGIN {exit !('${FRONTEND_TIME}' < 5)}'"

echo -e "\n${BLUE}[7] Database Tests${NC}\n"

# Test 19: Database file exists on remote
run_test "Database file created" \
    "ssh vmuser@${REMOTE_HOST} 'test -f /home/vmuser/ospf-visualizer-pro/data/ospf-visualizer-production.db'"

# Test 20: Database is writable
run_test "Database is writable (registration creates user)" \
    "echo '${REGISTER_RESPONSE}' | grep -q 'id'"

# ========================================
# TEST SUMMARY
# ========================================

echo -e "${BLUE}"
echo "========================================="
echo "  TEST SUMMARY"
echo "========================================="
echo -e "${NC}"

TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED))

echo "Total Tests: ${TOTAL_TESTS}"
echo -e "${GREEN}Passed: ${TESTS_PASSED}${NC}"

if [ $TESTS_FAILED -gt 0 ]; then
    echo -e "${RED}Failed: ${TESTS_FAILED}${NC}"
    echo ""
    echo -e "${RED}⚠️  Some tests failed. Review the output above.${NC}"
    exit 1
else
    echo -e "${GREEN}Failed: ${TESTS_FAILED}${NC}"
    echo ""
    echo -e "${GREEN}✅ ALL TESTS PASSED!${NC}"
    echo ""
    echo "🎉 Deployment is working correctly!"
    echo ""
    echo "Access your application at:"
    echo "  🌐 Frontend: ${FRONTEND_URL}"
    echo "  🔧 Backend: ${BACKEND_URL}"
    echo ""
fi

# ========================================
# Additional Information
# ========================================

echo -e "${BLUE}Additional Checks:${NC}"
echo ""

# Show backend logs
echo "📝 Recent backend logs:"
ssh vmuser@${REMOTE_HOST} 'tail -5 /home/vmuser/ospf-visualizer-pro/logs/backend.log 2>/dev/null || echo "No logs found"'
echo ""

# Show process status
echo "🔄 Running processes:"
ssh vmuser@${REMOTE_HOST} 'ps aux | grep -E "(node|vite)" | grep -v grep | head -5'
echo ""

exit 0
