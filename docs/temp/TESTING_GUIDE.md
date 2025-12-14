# Comprehensive Testing Guide - Strict Order

This guide outlines every feature and how to test it systematically in strict dependency order.

## Test Execution Order

Tests must be run in this specific order because later features depend on earlier ones.

---

## Phase 1: Core Infrastructure (Foundation)

### 1. Database Connection & Models
- **What**: MongoDB connection, model initialization
- **How to test**:
  ```bash
  npm test -- --testPathPattern="models" --testNamePattern="database"
  ```
- **Test file**: `__tests__/core/database.test.ts`
- **Prerequisites**: None
- **Success criteria**:
  - ✓ Can connect to MongoDB
  - ✓ All models initialize without errors
  - ✓ Database indexes created

---

## Phase 2: Authentication & Authorization (Must be before any user operations)

### 2. User Creation & Authentication
- **What**: User signup, login, token generation
- **How to test**:
  ```bash
  npm test -- userService
  ```
- **Test file**: `__tests__/userService.test.ts`
- **Prerequisites**: Phase 1 (Database)
- **Success criteria**:
  - ✓ User creation with validation
  - ✓ Password hashing works
  - ✓ Login with correct/incorrect credentials
  - ✓ JWT token generation
  - ✓ Token validation

### 3. Role-Based Access Control (RBAC)
- **What**: Role assignment, permission checking
- **How to test**:
  ```bash
  npm test -- --testPathPattern="rbac|role"
  ```
- **Test file**: `__tests__/rbacService.test.ts`
- **Prerequisites**: Phase 2 (User Authentication)
- **Success criteria**:
  - ✓ Admin role creation
  - ✓ Customer role assignment
  - ✓ Permission checking
  - ✓ Access control enforcement

---

## Phase 3: Catalog Management (Product setup)

### 4. Product Management
- **What**: Create, read, update, delete products
- **How to test**:
  ```bash
  npm test -- productService
  ```
- **Test file**: `__tests__/productService.test.ts`
- **Prerequisites**: Phase 2 (User - Admin)
- **Success criteria**:
  - ✓ Create product with valid data
  - ✓ Product validation (price, SKU, etc.)
  - ✓ Update product fields
  - ✓ Soft delete (archive)
  - ✓ Product search/filter

### 5. Category Management
- **What**: Create, manage product categories
- **How to test**:
  ```bash
  npm test -- categoryService
  ```
- **Test file**: `__tests__/categoryService.test.ts`
- **Prerequisites**: Phase 3.4 (Products)
- **Success criteria**:
  - ✓ Create category
  - ✓ Assign products to category
  - ✓ Update category
  - ✓ Delete category (with product handling)

### 6. Inventory Management
- **What**: Stock tracking, reservations, updates
- **How to test**:
  ```bash
  npm test -- inventoryService
  ```
- **Test file**: `__tests__/inventoryService.test.ts`
- **Prerequisites**: Phase 3.4 (Products)
- **Success criteria**:
  - ✓ Add inventory for product
  - ✓ Check stock availability
  - ✓ Reserve stock (atomic)
  - ✓ Release reservation
  - ✓ Update after order fulfillment
  - ✓ Low stock warnings

### 7. Collection Management
- **What**: Group products into collections (featured, seasonal, etc.)
- **How to test**:
  ```bash
  npm test -- collectionService
  ```
- **Test file**: `__tests__/collectionService.test.ts`
- **Prerequisites**: Phase 3.4 (Products)
- **Success criteria**:
  - ✓ Create collection
  - ✓ Add/remove products from collection
  - ✓ Manage collection visibility
  - ✓ Sort and filter

---

## Phase 4: Shopping Cart & Checkout

### 8. Shopping Cart
- **What**: Add/remove items, manage cart state
- **How to test**:
  ```bash
  npm test -- --testPathPattern="cart"
  ```
- **Test file**: `__tests__/cartService.test.ts`
- **Prerequisites**: Phase 3 (Products with Inventory)
- **Success criteria**:
  - ✓ Add item to cart
  - ✓ Update quantity
  - ✓ Remove item
  - ✓ Clear cart
  - ✓ Calculate subtotal
  - ✓ Apply discount codes

### 9. Coupon & Discount Management
- **What**: Create, validate, apply coupons
- **How to test**:
  ```bash
  npm test -- --testPathPattern="coupon"
  ```
- **Test file**: `__tests__/couponService.test.ts`
- **Prerequisites**: Phase 4.8 (Shopping Cart)
- **Success criteria**:
  - ✓ Create coupon (fixed/percentage)
  - ✓ Check coupon validity
  - ✓ Apply coupon to order
  - ✓ Track coupon usage
  - ✓ Validate coupon constraints

### 10. Order Creation
- **What**: Convert cart to order, reserve inventory
- **How to test**:
  ```bash
  npm test -- orderService
  ```
- **Test file**: `__tests__/orderService.test.ts`
- **Prerequisites**: Phase 4 (Cart, Inventory), Phase 3.6 (Inventory)
- **Success criteria**:
  - ✓ Create order from cart
  - ✓ Generate unique order number
  - ✓ Reserve inventory atomically
  - ✓ Store billing/shipping address
  - ✓ Create timeline event
  - ✓ Fail if insufficient stock

---

## Phase 5: Order Management

### 11. Order Items Management
- **What**: Manage individual items within order
- **How to test**:
  ```bash
  npm test -- orderItemService
  ```
- **Test file**: `__tests__/orderItemService.test.ts`
- **Prerequisites**: Phase 5.10 (Orders)
- **Success criteria**:
  - ✓ Retrieve order items
  - ✓ Update item status
  - ✓ Calculate item totals
  - ✓ Track item fulfillment

### 12. Order Status Tracking
- **What**: Update order status, manage timeline
- **How to test**:
  ```bash
  npm test -- --testNamePattern="order.*status"
  ```
- **Test file**: `__tests__/orderService.test.ts` (extended)
- **Prerequisites**: Phase 5.11 (Order Items)
- **Success criteria**:
  - ✓ Update order status (pending → confirmed → shipped → delivered)
  - ✓ Add timeline events
  - ✓ Prevent invalid transitions
  - ✓ Track status changes with timestamps

### 13. Order Cancellation
- **What**: Cancel order, release inventory, refund
- **How to test**:
  ```bash
  npm test -- --testNamePattern="cancel"
  ```
- **Test file**: `__tests__/orderService.test.ts` (extended)
- **Prerequisites**: Phase 5.12 (Status Tracking)
- **Success criteria**:
  - ✓ Cancel within allowed time
  - ✓ Release reserved inventory
  - ✓ Initiate refund
  - ✓ Update order status to cancelled

---

## Phase 6: Payment Processing

### 14. Payment Methods
- **What**: Support multiple payment methods (COD, Online, etc.)
- **How to test**:
  ```bash
  npm test -- paymentService
  ```
- **Test file**: `__tests__/paymentService.test.ts`
- **Prerequisites**: Phase 5 (Orders)
- **Success criteria**:
  - ✓ Create payment record
  - ✓ Track payment method
  - ✓ COD handling (deferred payment)
  - ✓ Online payment handling

### 15. Payment Integration
- **What**: Handle payment gateway responses (Stripe, Razorpay, etc.)
- **How to test**:
  ```bash
  npm test -- --testPathPattern="payment.*integration"
  ```
- **Test file**: `__tests__/paymentIntegration.test.ts`
- **Prerequisites**: Phase 6.14 (Payment Methods)
- **Success criteria**:
  - ✓ Process payment webhooks
  - ✓ Update order status on payment success
  - ✓ Handle payment failures
  - ✓ Prevent double-charging (idempotency)

### 16. Refund Processing
- **What**: Issue refunds, track refund status
- **How to test**:
  ```bash
  npm test -- --testNamePattern="refund"
  ```
- **Test file**: `__tests__/paymentService.test.ts` (extended)
- **Prerequisites**: Phase 6.15 (Payment Integration)
- **Success criteria**:
  - ✓ Create refund request
  - ✓ Process refund
  - ✓ Track refund status
  - ✓ Update inventory on refund
  - ✓ Handle partial refunds

---

## Phase 7: Fulfillment & Shipping

### 17. Shipment Management
- **What**: Create shipments, track tracking numbers
- **How to test**:
  ```bash
  npm test -- --testPathPattern="shipment"
  ```
- **Test file**: `__tests__/shipmentService.test.ts`
- **Prerequisites**: Phase 5.12 (Order Status)
- **Success criteria**:
  - ✓ Create shipment for order
  - ✓ Add tracking number
  - ✓ Update shipment status
  - ✓ Multiple shipments per order

### 18. Delivery & Fulfillment
- **What**: Mark as delivered, handle delivery issues
- **How to test**:
  ```bash
  npm test -- --testNamePattern="deliver|fulfill"
  ```
- **Test file**: `__tests__/fulfillmentService.test.ts`
- **Prerequisites**: Phase 7.17 (Shipment)
- **Success criteria**:
  - ✓ Mark shipment as delivered
  - ✓ Update order status to delivered
  - ✓ Handle delivery failures
  - ✓ Require proof of delivery (optional)

---

## Phase 8: Customer Features

### 19. Customer Profile
- **What**: Customer details, preferences, addresses
- **How to test**:
  ```bash
  npm test -- --testPathPattern="customer"
  ```
- **Test file**: `__tests__/customerService.test.ts`
- **Prerequisites**: Phase 2 (User Authentication)
- **Success criteria**:
  - ✓ Create customer profile
  - ✓ Update profile
  - ✓ Manage saved addresses
  - ✓ Store preferences

### 20. Order History
- **What**: Customer view all their orders
- **How to test**:
  ```bash
  npm test -- --testNamePattern="customer.*order|order.*history"
  ```
- **Test file**: `__tests__/orderService.test.ts` (extended)
- **Prerequisites**: Phase 8.19 (Customer Profile)
- **Success criteria**:
  - ✓ Retrieve customer orders
  - ✓ Filter by status
  - ✓ Sort by date
  - ✓ Pagination

### 21. Feedback & Reviews
- **What**: Customer reviews, ratings on products
- **How to test**:
  ```bash
  npm test -- --testPathPattern="feedback|review"
  ```
- **Test file**: `__tests__/feedbackService.test.ts`
- **Prerequisites**: Phase 8.20 (Order History)
- **Success criteria**:
  - ✓ Create review after delivery
  - ✓ Add ratings (1-5 stars)
  - ✓ Prevent duplicate reviews
  - ✓ Update product average rating

---

## Phase 9: Analytics & Reporting

### 22. Order Analytics
- **What**: Sales metrics, order trends
- **How to test**:
  ```bash
  npm test -- --testPathPattern="analytics"
  ```
- **Test file**: `__tests__/analyticsService.test.ts`
- **Prerequisites**: Phase 5 (Orders)
- **Success criteria**:
  - ✓ Calculate total sales
  - ✓ Count orders by status
  - ✓ Revenue trends
  - ✓ Top products

### 23. Inventory Analytics
- **What**: Stock levels, low inventory alerts
- **How to test**:
  ```bash
  npm test -- --testNamePattern="inventory.*analytics"
  ```
- **Test file**: `__tests__/inventoryService.test.ts` (extended)
- **Prerequisites**: Phase 3.6 (Inventory)
- **Success criteria**:
  - ✓ Low stock alerts
  - ✓ Inventory turnover
  - ✓ Stock movement tracking

---

## Phase 10: Admin Features

### 24. Admin Dashboard
- **What**: Admin view metrics and manage system
- **How to test**:
  ```bash
  npm test -- --testPathPattern="admin|dashboard"
  ```
- **Test file**: `__tests__/adminService.test.ts`
- **Prerequisites**: Phase 2.3 (RBAC)
- **Success criteria**:
  - ✓ Admin-only access
  - ✓ Display key metrics
  - ✓ User management access

### 25. User Management
- **What**: Admin manage users, permissions
- **How to test**:
  ```bash
  npm test -- --testPathPattern="admin.*user"
  ```
- **Test file**: `__tests__/userManagementService.test.ts`
- **Prerequisites**: Phase 24 (Admin Dashboard)
- **Success criteria**:
  - ✓ List all users
  - ✓ Edit user roles
  - ✓ Deactivate users
  - ✓ View user activity

---

## Running All Tests

### Run all tests in order:
```bash
npm test
```

### Run with verbose output:
```bash
npm test -- --verbose
```

### Run with coverage:
```bash
npm test -- --coverage
```

### Run specific phase:
```bash
npm test -- --testPathPattern="Phase2|Phase3|Phase4" --listTests
```

---

## Test Structure Template

Each test file should follow this pattern:

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  // Setup database
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  // Cleanup
  await mongoose.connection.close();
  await mongoServer.stop();
});

describe('Feature Name', () => {
  beforeEach(async () => {
    // Clear collections before each test
    await mongoose.connection.dropDatabase();
  });

  describe('Feature functionality', () => {
    it('should do X', async () => {
      // Arrange
      // Act
      // Assert
    });

    it('should handle error Y', async () => {
      // Test error cases
    });
  });
});
```

---

## Running Tests from UI

1. Go to: `http://localhost:3000/devfurqan/runner`
2. Select tests by category
3. Click "Execute Tests"
4. View results in real-time

Or visit: `http://localhost:3000/devfurqan/results` to see all test results

---

## Important Notes

- **Order matters**: Tests must run in this order because later features depend on earlier ones
- **Atomic operations**: Always test inventory operations are atomic
- **Payment verification**: Never skip payment testing
- **Data cleanup**: Each test should clean up after itself
- **Error cases**: Test both success and failure scenarios
