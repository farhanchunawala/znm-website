# 🧪 Complete Testing Guide

## Overview

This project has a **strict dependency order** for testing. Features must be tested in order because later features depend on earlier ones.

## Quick Commands

```bash
# Run ALL tests in correct order
npm test

# Run specific phase
npm test -- phase1-database.test.ts
npm test -- phase2-1-authentication.test.ts
npm test -- phase3-1-products.test.ts
npm test -- phase3-2-inventory.test.ts
npm test -- phase5-orders.test.ts
npm test -- paymentService.test.ts

# With coverage report
npm test -- --coverage

# Watch mode (re-run on file changes)
npm test -- --watch

# Verbose output (helpful for debugging)
npm test -- --verbose
```

## Testing Architecture

### Test Dependency Chain

```
┌─────────────────────────────────────┐
│ Phase 1: Database & Models          │
│ (Foundation - no dependencies)      │
└─────────────┬───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│ Phase 2: User Authentication        │
│ (Needs: Database)                   │
└─────────────┬───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│ Phase 3: Catalog Management         │
│ ├─ Products (Needs: Users)          │
│ └─ Inventory (Needs: Products)      │
└─────────────┬───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│ Phase 5: Order Processing           │
│ (Needs: Inventory, Users)           │
│ 🔴 CRITICAL: Must reserve stock     │
│    atomically!                      │
└─────────────┬───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│ Phase 6: Payments                   │
│ (Needs: Orders)                     │
│ 🔴 CRITICAL: No double-charging!    │
└─────────────┬───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│ Phase 7: Order Items & Fulfillment  │
│ (Needs: Payments)                   │
└─────────────────────────────────────┘
```

## Test Files

| File | Phase | Purpose | Dependencies |
|------|-------|---------|--------------|
| `__tests__/phase1-database.test.ts` | 1 | DB connection, model init | None |
| `__tests__/phase2-1-authentication.test.ts` | 2 | User creation, login, JWT | Phase 1 |
| `__tests__/phase3-1-products.test.ts` | 3 | Product CRUD, validation | Phase 2 |
| `__tests__/phase3-2-inventory.test.ts` | 3 | Stock tracking, reservations | Phase 3.1 |
| `__tests__/phase5-orders.test.ts` | 5 | Order creation, status flow | Phase 3.2 |
| `__tests__/paymentService.test.ts` | 6 | Payment processing | Phase 5 |
| `__tests__/orderItemService.test.ts` | 7 | Item tracking, fulfillment | Phase 6 |

## Key Testing Concepts

### 1. ✅ Atomic Operations (CRITICAL for Inventory)

**Problem:** If stock reservation isn't atomic, two customers could buy the same item.

**Solution:** Use MongoDB's atomic `findOneAndUpdate`:

```typescript
// ✓ CORRECT - Atomic
const updated = await Inventory.findOneAndUpdate(
  {
    _id: inventoryId,
    availableStock: { $gte: quantityNeeded }  // Check AND reserve in one operation
  },
  {
    $inc: {
      reservedStock: quantityNeeded,
      availableStock: -quantityNeeded
    }
  },
  { new: true }
);

// ✗ WRONG - Not atomic (race condition!)
const inv = await Inventory.findById(inventoryId);
if (inv.availableStock >= quantityNeeded) {
  inv.availableStock -= quantityNeeded;
  inv.reservedStock += quantityNeeded;
  await inv.save();  // Two operations = race condition!
}
```

### 2. ✅ Idempotent Payments (CRITICAL for Payments)

**Problem:** Network retry could charge customer twice.

**Solution:** Use payment ID as unique key:

```typescript
// ✓ CORRECT - Same paymentId = no duplicate charge
const payment = await Payment.findOneAndUpdate(
  { paymentId: webhookData.paymentId },  // Unique key
  { status: 'success', ... },
  { upsert: true, new: true }  // Insert if not exists
);

// ✗ WRONG - Creates duplicate payments
const payment = new Payment(webhookData);
await payment.save();  // No deduplication!
```

### 3. ✅ State Consistency

**Invariant:** Order item quantity must be reserved from inventory

```typescript
// When creating order:
const reservation = await reserveInventory(item.sku, item.qty);
if (!reservation) throw new Error('Out of stock');

const order = await Order.create({ ... });
if (!order) await releaseInventory(item.sku, item.qty);
```

## Running Tests Interactively

### Option 1: Using npm script
```bash
npm test
```

### Option 2: Using shell script
```bash
./run-tests.sh all        # Run all tests
./run-tests.sh 1          # Phase 1
./run-tests.sh 2          # Phase 2
./run-tests.sh coverage   # With coverage
```

### Option 3: Using Web UI

Visit these pages after running `npm run dev`:

1. **Test Runner** (execute tests)
   - http://localhost:3000/devfurqan/runner

2. **Results Viewer** (view history)
   - http://localhost:3000/devfurqan/results

3. **Dashboard** (overview)
   - http://localhost:3000/devfurqan

## Test Coverage

Current targets:

```
Phase 1: >95%  (database - foundation)
Phase 2: >90%  (auth - security critical)
Phase 3: >85%  (products & inventory)
Phase 5: >90%  (orders - business critical)
Phase 6: >95%  (payments - financial critical)
Phase 7: >80%  (order items)
```

Run with coverage:
```bash
npm test -- --coverage
```

## Debugging Tests

### If a test fails:

1. **Read the error message**
   ```bash
   npm test -- --verbose  # Get detailed output
   ```

2. **Check the specific test file**
   ```bash
   npm test -- path/to/test.ts  # Run only this file
   ```

3. **Add debug output**
   ```typescript
   console.log('Debug info:', variable);  // Will show in test output
   ```

4. **Use isolation**
   ```bash
   npm test -- phase3-2-inventory -- --testNamePattern="should reserve"
   ```

### Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `Cannot find module '@/...'` | Path alias broken | Check `jest.config.js` moduleNameMapper |
| `ECONNREFUSED 127.0.0.1:27017` | MongoDB not running | Start MongoDB or use in-memory |
| `Timeout - Async callback was not invoked` | Missing await | Add `await` to async operations |
| `findOneAndUpdate returns null` | Condition not met | Check query conditions |
| `Stock reserved > total stock` | Logic error | Verify inventory math |

## Test Structure Template

Each test file follows this pattern:

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongoServer: MongoMemoryServer;

// ✓ Setup database before any tests
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

// ✓ Cleanup after all tests
afterAll(async () => {
  await mongoose.connection.close();
  await mongoServer.stop();
});

describe('Feature Name', () => {
  // ✓ Clear database before each test
  beforeEach(async () => {
    await mongoose.connection.dropDatabase();
  });

  describe('Specific functionality', () => {
    it('should do something', async () => {
      // Arrange - setup test data
      const user = await User.create({ ... });

      // Act - perform action
      const result = await functionUnderTest(user);

      // Assert - verify results
      expect(result).toBeDefined();
      expect(result.status).toBe('success');
    });

    it('should handle error cases', async () => {
      // Test error scenarios too!
      expect(() => {
        functionUnderTest(invalidData);
      }).toThrow();
    });
  });
});
```

## Performance

Typical test execution times:

| Phase | Time | Notes |
|-------|------|-------|
| Phase 1 | <10s | Database setup |
| Phase 2 | <15s | Bcrypt hashing |
| Phase 3 | <25s | Product/inventory |
| Phase 5 | <30s | Order workflows |
| Phase 6 | <20s | Payment processing |
| **Total** | **<2 min** | All tests combined |

If tests take >5 minutes, something is wrong.

## CI/CD Integration

Tests are meant to run in CI/CD before deployment:

```yaml
# Example GitHub Actions workflow
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      mongodb:
        image: mongo:latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm test  # Run all tests in order
```

## Test Maintenance

### Adding a new test:
1. Place it in `__tests__/` directory
2. Follow file naming: `phase#-description.test.ts`
3. Ensure dependencies are clear
4. Add to this guide

### Updating existing tests:
1. Run tests before changes: `npm test`
2. Make changes
3. Run tests after changes: `npm test`
4. Commit with clear message

### Deleting tests:
1. Ensure no other tests depend on it
2. Update this guide
3. Remove the file

## Questions?

- See `TESTING_GUIDE.md` for detailed feature explanations
- See `TEST_EXECUTION_GUIDE.md` for step-by-step execution instructions
- See individual test files for specific test cases

## Resources

- [Jest Documentation](https://jestjs.io/)
- [TypeScript Testing Best Practices](https://www.typescriptlang.org/docs/handbook/testing.html)
- [MongoDB Testing](https://docs.mongodb.com/manual/tutorial/write-scripts-for-the-mongo-shell/)
- [Atomic Operations](https://docs.mongodb.com/manual/core/write-operations-atomicity/)
