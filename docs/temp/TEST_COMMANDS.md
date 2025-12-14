# 🧪 Complete Test Command Reference

All test commands organized by phase and use case.

## Run Everything

```bash
# 🏃 Run ALL tests in correct order (RECOMMENDED)
npm test

# With verbose output
npm test -- --verbose

# With coverage report
npm test -- --coverage
```

---

## Run By Phase

### Phase 1: Database & Models Foundation
```bash
npm test -- phase1-database.test.ts
npm test -- phase1-database.test.ts --verbose
npm test -- phase1-database -- --testNamePattern="Database Connection"
```

### Phase 2: User Authentication
```bash
npm test -- phase2-1-authentication.test.ts
npm test -- phase2-1-authentication.test.ts --verbose
npm test -- phase2-1-authentication -- --testNamePattern="User Creation"
```

### Phase 3.1: Product Management
```bash
npm test -- phase3-1-products.test.ts
npm test -- phase3-1-products.test.ts --verbose
npm test -- phase3-1-products -- --testNamePattern="Product Creation"
```

### Phase 3.2: Inventory Management (CRITICAL)
```bash
npm test -- phase3-2-inventory.test.ts
npm test -- phase3-2-inventory.test.ts --verbose
npm test -- phase3-2-inventory -- --testNamePattern="ATOMIC"
npm test -- phase3-2-inventory -- --testNamePattern="Reservation"
```

### Phase 5: Order Processing (CRITICAL)
```bash
npm test -- phase5-orders.test.ts
npm test -- phase5-orders.test.ts --verbose
npm test -- phase5-orders -- --testNamePattern="Order Creation"
npm test -- phase5-orders -- --testNamePattern="Status Transition"
```

### Phase 6: Payment Service (CRITICAL)
```bash
npm test -- paymentService.test.ts
npm test -- paymentService.test.ts --verbose
npm test -- paymentService -- --testNamePattern="idempotent"
npm test -- paymentService -- --testNamePattern="double"
```

### Phase 7: Order Items
```bash
npm test -- orderItemService.test.ts
npm test -- orderItemService.test.ts --verbose
npm test -- orderItemService -- --testNamePattern="fulfillment"
```

---

## Run By Feature

### Authentication Features
```bash
npm test -- phase2-1-authentication
```

### Inventory Features (CRITICAL)
```bash
npm test -- phase3-2-inventory

# Specifically test atomic operations
npm test -- phase3-2-inventory -- --testNamePattern="Reservation.*ATOMIC"

# Test race conditions
npm test -- phase3-2-inventory -- --testNamePattern="prevent double"
```

### Order Features
```bash
npm test -- phase5-orders

# Test order creation
npm test -- phase5-orders -- --testNamePattern="Order Creation"

# Test inventory coordination
npm test -- phase5-orders -- --testNamePattern="reserve"

# Test cancellation
npm test -- phase5-orders -- --testNamePattern="cancel"
```

### Payment Features
```bash
npm test -- paymentService

# Test no double-charging
npm test -- paymentService -- --testNamePattern="idempotent"
```

---

## Run Multiple Phases

```bash
# Run Phases 1 and 2
npm test -- phase1 && npm test -- phase2-1

# Run Phases 1-3
npm test -- "phase(1|2-1|3)" --listTests

# Run all critical phases
npm test -- phase3-2 && npm test -- phase5 && npm test -- paymentService
```

---

## Useful Test Options

### Verbose Output (For Debugging)
```bash
npm test -- --verbose
npm test -- --verbose phase3-2-inventory.test.ts
```

### Watch Mode (Re-run on file change)
```bash
npm test -- --watch
npm test -- --watch phase1-database.test.ts
```

### Coverage Report
```bash
npm test -- --coverage

# Coverage for specific file
npm test -- --coverage phase3-2-inventory.test.ts

# HTML report (opens in browser)
npm test -- --coverage && open coverage/lcov-report/index.html
```

### List Test Names Only
```bash
npm test -- --listTests
npm test -- --listTests --testPathPattern="phase3"
```

### Run Specific Test by Name
```bash
npm test -- --testNamePattern="should reserve stock"
npm test -- --testNamePattern="atomic"
npm test -- --testNamePattern="CRITICAL"
```

---

## Using the Shell Script

```bash
# Run all tests
./run-tests.sh all

# Run by phase number
./run-tests.sh 1          # Phase 1
./run-tests.sh 2          # Phase 2
./run-tests.sh 3          # Phase 3.1
./run-tests.sh 4          # Phase 3.2
./run-tests.sh 5          # Phase 5
./run-tests.sh 6          # Phase 6
./run-tests.sh 7          # Phase 7

# With coverage
./run-tests.sh coverage

# Watch mode
./run-tests.sh watch

# Interactive menu
./run-tests.sh
```

---

## CI/CD Commands

```bash
# For GitHub Actions / Jenkins
npm ci            # Clean install (better for CI)
npm test -- --ci  # Run in CI mode (no watch, no coverage by default)

# With coverage for reporting
npm test -- --ci --coverage

# Stop on first failure (fail fast)
npm test -- --bail

# Run in order and fail if any fails
npm test -- --runInBand --bail
```

---

## Troubleshooting Commands

### When tests are slow
```bash
npm test -- --testTimeout=30000  # Increase timeout
npm test -- --logHeapUsage       # Check memory usage
```

### When tests hang
```bash
npm test -- --detectOpenHandles  # Find open handles
npm test -- --forceExit          # Force exit after tests
```

### When specific test fails
```bash
npm test -- --testNamePattern="exact test name" --verbose
npm test -- phase5-orders -- --testNamePattern="Order Creation"
```

### When you need to debug
```bash
node --inspect-brk ./node_modules/.bin/jest
# Then open chrome://inspect in Chrome DevTools
```

---

## Common Test Scenarios

### Scenario 1: First Time Running Tests
```bash
# Start with Phase 1
npm test -- phase1-database.test.ts --verbose

# If it passes, move to Phase 2
npm test -- phase2-1-authentication.test.ts --verbose

# Continue through phases
npm test -- phase3-1-products.test.ts --verbose
npm test -- phase3-2-inventory.test.ts --verbose
npm test -- phase5-orders.test.ts --verbose
```

### Scenario 2: Inventory Test Keeps Failing
```bash
# Understand the issue
npm test -- phase3-2-inventory.test.ts --verbose

# Test just atomic operations
npm test -- phase3-2-inventory -- --testNamePattern="ATOMIC" --verbose

# Test just reservations
npm test -- phase3-2-inventory -- --testNamePattern="Reservation" --verbose
```

### Scenario 3: Payment Processing Fails
```bash
# Test payment methods
npm test -- paymentService -- --testNamePattern="Payment Method" --verbose

# Test idempotency (prevent double-charge)
npm test -- paymentService -- --testNamePattern="idempotent" --verbose

# Test double-charge prevention
npm test -- paymentService -- --testNamePattern="duplicate" --verbose
```

### Scenario 4: Order Tests Fail
```bash
# Test order creation
npm test -- phase5-orders -- --testNamePattern="Order Creation" --verbose

# Test inventory coordination
npm test -- phase5-orders -- --testNamePattern="reserve" --verbose

# Test cancellation
npm test -- phase5-orders -- --testNamePattern="Cancellation" --verbose
```

---

## Performance Monitoring

```bash
# Time each test suite
npm test -- --verbose

# See heap memory usage
npm test -- --logHeapUsage

# Profile the tests
npm test -- --detectOpenHandles --verbose

# Run with timing information
npm test -- --verbose --testTimeout=30000
```

---

## Quick Copy-Paste Commands

### ✅ All Tests (Safest)
```bash
npm test
```

### ✅ One Phase at a Time
```bash
npm test -- phase1-database.test.ts
npm test -- phase2-1-authentication.test.ts
npm test -- phase3-1-products.test.ts
npm test -- phase3-2-inventory.test.ts
npm test -- phase5-orders.test.ts
npm test -- paymentService.test.ts
npm test -- orderItemService.test.ts
```

### ✅ With Coverage
```bash
npm test -- --coverage
```

### ✅ Watch Mode (Development)
```bash
npm test -- --watch
```

### ✅ Debugging
```bash
npm test -- --verbose phase3-2-inventory.test.ts
```

### ✅ Shell Script (Easiest)
```bash
./run-tests.sh all
```

---

## Test File Paths

For reference when running specific files:

```
__tests__/phase1-database.test.ts
__tests__/phase2-1-authentication.test.ts
__tests__/phase3-1-products.test.ts
__tests__/phase3-2-inventory.test.ts
__tests__/phase5-orders.test.ts
__tests__/paymentService.test.ts
__tests__/orderItemService.test.ts
```

---

## Environment Setup

If tests aren't working:

```bash
# Ensure Node and npm are installed
node --version
npm --version

# Install/update dependencies
npm install

# Run tests
npm test
```

---

**Remember:**
- 🔴 **Phase 1 must pass** or nothing works
- 🔴 **Phase 3.2 must pass** or orders will be unsafe (stock overbook)
- 🔴 **Phase 5 must pass** or no orders work
- 🔴 **Phase 6 must pass** or no payments work
- Always run phases in order!
