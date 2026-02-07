#!/bin/bash

# Email Scheduler API Examples
# Test these endpoints to verify the system works

API_URL="http://localhost:5000"

echo "=========================================="
echo "Email Scheduler API Test Suite"
echo "=========================================="
echo ""

# Test 1: Health Check
echo "1. Testing Health Check..."
curl -X GET $API_URL/health
echo ""
echo ""

# Test 2: Get Current Stats
echo "2. Getting Email Statistics..."
curl -X GET $API_URL/api/emails/stats/summary
echo ""
echo ""

# Test 3: Schedule Email for 2 minutes from now
echo "3. Scheduling an email for 2 minutes from now..."
SCHEDULED_TIME=$(( $(date +%s) + 120 ))
curl -X POST $API_URL/api/emails/schedule \
  -H "Content-Type: application/json" \
  -d "{
    \"to\": \"user@example.com\",
    \"subject\": \"Hello from Email Scheduler\",
    \"body\": \"This email was scheduled 2 minutes in the future!\",
    \"scheduledTime\": $SCHEDULED_TIME
  }"
echo ""
echo ""

# Test 4: List All Emails
echo "4. Listing all emails..."
curl -X GET $API_URL/api/emails
echo ""
echo ""

# Test 5: List Only Scheduled Emails
echo "5. Listing scheduled emails..."
curl -X GET "$API_URL/api/emails?status=scheduled"
echo ""
echo ""

echo "=========================================="
echo "Tests Complete!"
echo "Check the dashboard at http://localhost:3000"
echo "=========================================="
