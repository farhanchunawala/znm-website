# Test Execution Strategy - Step-by-Step Guide

This document provides the exact step-by-step testing approach in strict dependency order.

## Quick Start

```bash
# Run ALL tests in correct order
npm test

# Run tests with detailed output
npm test -- --verbose

# Run with coverage report
npm test -- --coverage

# Run specific phase only
npm test -- phase1
npm test -- phase2
npm test -- phase3
npm test -- phase5
npm test -- phase6
```

---

## Complete Test Execution Order (STRICT)

### Step 1: Database & Models (Foundation)
```bash
npm test -- phase1-database.test.ts
```

**What's being tested:**
- ✓ MongoDB connection
- ✓ Model initialization
- ✓ CRUD operations on all models
- ✓ Database indexes

**Success = All models initialized, database working**

---

### Step 2: User Authentication
```bash
npm test -- phase2-1-authentication.test.ts
```

**What's being tested:**
- ✓ User creation and validation
- ✓ Duplicate email prevention
- ✓ Password hashing with bcrypt
- ✓ User login verification
- ✓ User profile storage

**Success = Users can be created and authenticated**

**Required for:**
- Admin users (product management)
- Customer users (orders)

---

### Step 3: Products
```bash
npm test -- phase3-1-products.test.ts
```

**What's being tested:**
- ✓ Product creation with validation
- ✓ SKU uniqueness
- ✓ Price validation
- ✓ Product updates
- ✓ Product search and filtering
- ✓ Variant handling

**Success = Products can be created and managed**

**Required for:**
- Orders (need products to order)
- Inventory (need products to track)

---

### Step 4: Inventory Management (CRITICAL)
```bash
npm test -- phase3-2-inventory.test.ts
```

**What's being tested:**
- ✓ Stock tracking
- ✓ **ATOMIC stock reservations** (most important!)
- ✓ Stock release
- ✓ Stock consumption
- ✓ Low stock alerts
- ✓ Inventory consistency
- ✓ Multiple SKU variants

**CRITICAL: This MUST work atomically or orders will fail!**

**Success = Stock can be safely reserved and released**

**Required for:**
- Orders (must reserve stock)
- Payment (can't process without inventory)

---

### Step 5: Order Processing (Complete Workflow)
```bash
npm test -- phase5-orders.test.ts
```

**What's being tested:**
- ✓ Order creation from cart
- ✓ Inventory reservation on order
- ✓ Unique order number generation
- ✓ Status transitions (pending → confirmed → shipped → delivered)
- ✓ Order cancellation with inventory release
- ✓ Payment processing (success/failure/COD)
- ✓ Order retrieval and filtering

**CRITICAL: This is the core business logic!**

**Success = Orders can be created, tracked, and cancelled**

**Required for:**
- Shipping (need confirmed orders)
- Payments (orders drive payments)
- Refunds (refunds need orders)

---

### Step 6: Payments (Existing Tests)
```bash
npm test -- paymentService.test.ts
```

**What's being tested:**
- ✓ Payment record creation
- ✓ Payment status tracking
- ✓ Multiple payment methods (card, UPI, COD)
- ✓ Payment gateway integration
- ✓ Webhook handling
- ✓ Idempotency (prevent double-charge)

**Success = Payments can be processed safely**

**Required for:**
- Refunds (need successful payments to refund)
- Order confirmation (orders need payment)

---

### Step 7: Order Items (Existing Tests)
```bash
npm test -- orderItemService.test.ts
```

**What's being tested:**
- ✓ Individual item tracking within order
- ✓ Item status updates
- ✓ Fulfillment tracking
- ✓ Item-level inventory coordination

**Success = Order items can be tracked**

---

## Test File Mapping

| File | Phase | Depends On | Tests |
|------|-------|-----------|-------|
| `phase1-database.test.ts` | 1 | None | DB, Models |
| `phase2-1-authentication.test.ts` | 2 | Phase 1 | Auth, Users |
| `phase3-1-products.test.ts` | 3 | Phase 2 | Products |
| `phase3-2-inventory.test.ts` | 3 | Phase 3 | Inventory |
| `phase5-orders.test.ts` | 5 | Phase 3 | Orders |
| `paymentService.test.ts` | 6 | Phase 5 | Payments |
| `orderItemService.test.ts` | 7 | Phase 6 | Order Items |

---

## Understanding Test Dependencies

```
Phase 1: Database
    ↓
Phase 2: Users & Auth (needs DB)
    ↓
Phase 3: Catalog (needs Users for admin)
    ├─ Products
    └─ Inventory (needs Products)
        ↓
Phase 5: Orders (needs Inventory + Users)
    ↓
Phase 6: Payments (needs Orders)
    ↓
Phase 7: Order Items (needs Payments)
```

---

## Critical Features to Validate

### 1. ATOMIC Stock Reservation
**Why:** If stock reservation isn't atomic, two customers can buy the same item

**How to test:**
```bash
npm test -- phase3-2-inventory -- --testNamePattern="ATOMIC"
```

**Success Criteria:**
- Reservation succeeds only if stock available
- No double-booking possible
- Reservation is instantaneous (no race conditions)

### 2. Payment Safety
**Why:** Duplicate charges would be catastrophic

**How to test:**
```bash
npm test -- paymentService -- --testNamePattern="idempotent|duplicate"
```

**Success Criteria:**
- Same payment ID only processed once
- Webhook deduplication works
- Failed payments don't reserve inventory

### 3. Order-to-Inventory Coordination
**Why:** Orders must always reserve inventory atomically

**How to test:**
```bash
npm test -- phase5-orders -- --testNamePattern="reserve|cancel"
```

**Success Criteria:**
- Order creation reserves stock
- Order cancellation releases stock
- Cancellation doesn't affect shipped orders

---

## Running Tests from Web UI

### 1. Via Test Runner (Recommended)
```
http://localhost:3000/devfurqan/runner
```
- Select test category
- Click "Execute Tests"
- View real-time results

### 2. Via Results Viewer
```
http://localhost:3000/devfurqan/results
```
- View all test history
- Filter by status/category
- Analyze trends

---

## Debugging Failed Tests

### If Phase 1 fails:
```bash
# Check MongoDB connection
npm test -- phase1-database -- --verbose

# Fix: Ensure MongoDB is running, check connection string
```

### If Phase 2 fails:
```bash
# Check user model and bcrypt
npm test -- phase2-1-authentication -- --verbose

# Fix: Verify User model exists, bcrypt installed
```

### If Phase 3 fails:
```bash
# Check product validation
npm test -- phase3-1-products -- --verbose

# Fix: Verify Product model validations
```

### If Phase 3-2 fails (CRITICAL):
```bash
# Check inventory atomicity
npm test -- phase3-2-inventory -- --verbose

# Fix: Ensure findOneAndUpdate is used (atomic), no race conditions
```

### If Phase 5 fails:
```bash
# Check order creation and inventory coordination
npm test -- phase5-orders -- --verbose

# Fix: Verify order reserves inventory atomically when created
```

---

## Test Coverage Targets

```
Target: >80% coverage

Phase 1:  >95% (Database)
Phase 2:  >90% (Auth - security critical)
Phase 3:  >85% (Products & Inventory)
Phase 5:  >90% (Orders - business critical)
Phase 6:  >95% (Payments - financial critical)
```

---

## Running in CI/CD

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      mongodb:
        image: mongo:latest
        options: >-
          --health-cmd mongosh
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: 18
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests in order
        run: |
          npm test -- phase1
          npm test -- phase2-1
          npm test -- phase3-1
          npm test -- phase3-2
          npm test -- phase5
          npm test -- paymentService
          npm test -- orderItemService
```

---

## Test Results Interpretation

### ✅ All Tests Pass
- System is ready for deployment
- All features work together

### ⚠️ Phase 1 Fails
- Database issue - nothing will work
- Stop and fix connection/models

### ⚠️ Phase 2 Fails
- Authentication broken
- No users can access system

### ⚠️ Phase 3 Fails
- Catalog management broken
- But won't affect orders if products exist

### 🔴 Phase 3-2 Fails
- **CRITICAL** - Inventory not atomic
- Orders will be unsafe
- Fix immediately before using

### 🔴 Phase 5 Fails
- Orders are broken
- No revenue generation possible
- Fix immediately

### 🔴 Phase 6 Fails
- Payments broken
- Users can't complete purchases
- Fix immediately

---

## Best Practices

1. **Always run Phase 1 first** - It's the foundation
2. **Never skip Inventory tests** - Stock safety is critical
3. **Test in order** - Don't jump around phases
4. **Use verbose mode when debugging** - Helps identify exact failure
5. **Check coverage** - Aim for >80% across phases
6. **Run before deployment** - All tests must pass

---

## Performance Expectations

| Phase | Time | Notes |
|-------|------|-------|
| 1 | <10s | Database operations |
| 2 | <15s | Auth + bcrypt |
| 3 | <20s | Products + Inventory |
| 5 | <30s | Complex order workflows |
| 6 | <20s | Payment processing |
| Total | <2 min | All tests combined |

If tests take >5 minutes, something is wrong.

---

## Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| `Cannot find module` | Path alias wrong | Check jest.config.js |
| `Connection timeout` | MongoDB not running | Start MongoDB service |
| `Stock not reserved` | Not using atomic operation | Use findOneAndUpdate with $inc |
| `Double payment` | No idempotency check | Add payment ID deduplication |
| `Tests hang` | Async not awaited | Check all awaits are present |

---

## Questions?

Refer to the main TESTING_GUIDE.md for detailed feature explanations.
