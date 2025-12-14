# System Verification Dashboard - Quick Start Guide

## Access the Dashboard

**URL:** `http://localhost:3000/devfurqan`

## Navigation

### Main Pages

1. **Dashboard** (`/devfurqan`)
   - System overview with stats
   - Quick action shortcuts
   - Gateway status
   - Feature list

2. **Test Runner** (`/devfurqan/runner`)
   - Execute tests
   - Filter by category
   - View real-time results

3. **Results Viewer** (`/devfurqan/results`)
   - Review test history
   - Filter & sort results
   - Detailed result analysis

## How to Use

### Running Tests

#### Via Dashboard UI
1. Visit `/devfurqan/runner`
2. Select tests using checkboxes
3. Click "▶ Execute Tests"
4. View results in real-time

#### Via API (cURL)
```bash
# List all tests
curl http://localhost:3000/api/devtest/tests

# Execute single test
curl -X POST http://localhost:3000/api/devtest/execute \
  -H "Content-Type: application/json" \
  -d '{"testId":"test-id-here"}'

# Execute batch tests by category
curl -X POST http://localhost:3000/api/devtest/batch \
  -H "Content-Type: application/json" \
  -d '{"category":"unit"}'
```

### Testing Payments

#### Via Dashboard
1. Go to Home page
2. Click "Payment Simulator" card
3. (Frontend coming in Phase 2)

#### Via API
```bash
curl -X POST http://localhost:3000/api/devtest/payment \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create",
    "gateway": "razorpay",
    "orderId": "order_123",
    "amount": 10000,
    "scenario": "success",
    "email": "test@example.com",
    "phone": "+919999999999"
  }'
```

### Managing Test Data

#### Reset to Clean State
```bash
curl -X DELETE http://localhost:3000/api/devtest/data?action=reset
```

#### Create Test Document
```bash
curl -X POST http://localhost:3000/api/devtest/data \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create",
    "model": "User",
    "data": {
      "email": "test@example.com",
      "name": "Test User",
      "role": "customer"
    }
  }'
```

#### Get Data State
```bash
curl http://localhost:3000/api/devtest/data
```

## Test Categories

- **Unit Tests** - Individual functions
- **Service Tests** - Business logic
- **Integration Tests** - Module interactions
- **E2E Tests** - Complete flows
- **Payment Tests** - Payment processing

## Filtering Tests

### By Category
```
/devfurqan/runner?category=unit
/devfurqan/runner?category=payment
```

### By Status (Results)
```
/devfurqan/results?status=passed
/devfurqan/results?status=failed
```

## Payment Testing Scenarios

### Success Flow
```bash
"scenario": "success"
# Payment authorized and captured
```

### Failure
```bash
"scenario": "failure"
# Payment declined
```

### Timeout
```bash
"scenario": "timeout"
# Payment processing timeout
```

### Webhook Testing
```bash
"scenario": "webhook"
# Webhook delivery simulation
```

## API Endpoints

### Test Management
- `GET /api/devtest/tests` - List tests
- `POST /api/devtest/execute` - Run single test
- `POST /api/devtest/batch` - Run multiple tests
- `GET /api/devtest/results` - View results
- `DELETE /api/devtest/results` - Clear results

### Data Management
- `GET /api/devtest/data` - Get state
- `POST /api/devtest/data` - Create/seed data
- `PUT /api/devtest/data` - Update data
- `DELETE /api/devtest/data` - Delete data

### Payment Testing
- `POST /api/devtest/payment` - Simulate payments
- `GET /api/devtest/payment` - Payment info/docs

### Architecture
- `POST /api/devtest/flows` - Register/verify flows
- `GET /api/devtest/flows` - Get flows

### Webhooks
- `POST /api/devtest/webhook-test` - Test webhook delivery
- `GET /api/devtest/webhook-test` - Webhook testing guide

## Example Workflows

### Complete Order Test
1. Reset data: `DELETE /api/devtest/data?action=reset`
2. Create order: Run order creation test
3. Check state: `GET /api/devtest/data?model=Order`
4. Review results: `/devfurqan/results`

### Payment Processing Test
1. Create order
2. Initiate payment: `POST /api/devtest/payment` (action: create)
3. Verify signature: `POST /api/devtest/payment` (action: verify)
4. Simulate webhook: `POST /api/devtest/payment` (action: webhook)
5. Test delivery: `POST /api/devtest/webhook-test`

### Data Validation
1. Create test document: `POST /api/devtest/data`
2. Get snapshot before: `GET /api/devtest/data`
3. Update document: `PUT /api/devtest/data`
4. Compare changes: API returns before/after diff
5. Verify state: `GET /api/devtest/data`

## Troubleshooting

### Tests Not Showing
- Check if Devtest is enabled (set DEVTEST_ENABLED=true)
- Verify tests are registered in TestRegistry

### Payment Simulation Fails
- Ensure gateway is specified (razorpay or stripe)
- Check orderId and amount are provided
- Verify scenario is valid

### Data Operations Error
- Ensure model name is correct (User, Product, Order, etc.)
- Check MongoDB connection
- Verify data format matches schema

## Features Being Tested

Currently Testable:
- ✅ Order creation & management
- ✅ Order item operations
- ✅ Payment processing
- ✅ Payment webhooks
- ✅ Refund processing
- ✅ Data state transitions

Coming in Phase 2:
- 🔄 Payment Simulator UI
- 🔄 Data Manager UI
- 🔄 Architecture Visualizer UI
- 🔄 Sample test implementations

## Tips & Best Practices

1. **Always reset data before test runs:**
   ```bash
   curl -X DELETE http://localhost:3000/api/devtest/data?action=reset
   ```

2. **Use realistic test data:**
   - Valid emails
   - Proper phone formats
   - Meaningful order amounts

3. **Check signatures for payment tests:**
   ```bash
   # Generate signature
   POST /api/devtest/payment with action: "generateSignature"
   
   # Verify signature
   POST /api/devtest/payment with action: "verify"
   ```

4. **Monitor result history:**
   - Review failed tests for patterns
   - Check average durations for regressions
   - Use pagination for historical analysis

5. **Test in isolation:**
   - Reset data between test runs
   - Create fresh documents for each test
   - Clean up after completion

## Next Steps

1. **Run your first test:**
   - Visit `/devfurqan/runner`
   - Select a test
   - Click execute

2. **Review results:**
   - Go to `/devfurqan/results`
   - Filter by category
   - Click to expand details

3. **Explore APIs:**
   - Check `/api/devtest/tests` response
   - Try a payment simulation
   - Create test data

4. **Create custom tests:**
   - Register in TestRegistry
   - Implement test logic
   - Add to appropriate category

## Support & Documentation

- **Full Architecture:** `/docs/SYSTEM_VERIFICATION_DASHBOARD_ARCHITECTURE.md`
- **Implementation Details:** `/DEVTEST_IMPLEMENTATION_PHASE1_SUMMARY.md`
- **API Examples:** See endpoints above
- **Code:** `/lib/devtest/` and `/app/api/devtest/`

---

**Ready to start testing?** Visit `http://localhost:3000/devfurqan` now! 🚀
