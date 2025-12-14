# Biller System - Quick Integration Guide

## 5-Minute Setup

### 1. Database
```bash
# Indexes created automatically by Mongoose on first save
# No manual migration needed
```

### 2. Service Layer
```typescript
// lib/services/billerService.ts already created
import BillerService from '@/lib/services/billerService';
```

### 3. API Routes
```
✓ /api/admin/bills                    (admin CRUD)
✓ /api/admin/bills/:id                (admin detail/action)
✓ /api/bills/auto-generate            (system auto-generation)
✓ /api/bills/order/:orderId           (customer view)
```

### 4. Admin UI
```
✓ /admin/bills                        (admin dashboard)
✓ List with filters, search, sort
✓ Full CRUD operations
```

---

## Integration Points (3 Hooks)

### 1. Order Confirmation
**Location**: `lib/services/orderService.ts` or order confirmation handler

```typescript
// When order is confirmed with COD payment
async confirmOrder(orderId: string) {
  const order = await Order.findById(orderId);
  
  // Check if COD
  const payment = await Payment.findOne({ orderId });
  if (payment?.method === 'COD') {
    // Auto-generate COD bill
    await BillerService.autoGenerateBill(orderId);
  }
  
  order.orderStatus = 'confirmed';
  await order.save();
}
```

### 2. Payment Success
**Location**: Payment webhook/success handler

```typescript
// When payment gateway confirms payment
async handlePaymentSuccess(paymentId: string) {
  const payment = await Payment.findById(paymentId);
  
  payment.status = 'paid';
  await payment.save();
  
  // Auto-generate PAID bill
  await BillerService.autoGenerateBill(payment.orderId.toString());
}
```

### 3. Order Cancellation
**Location**: Order cancellation handler

```typescript
// When order is cancelled by admin or customer
async cancelOrder(orderId: string, reason: string) {
  const order = await Order.findById(orderId);
  
  // Cancel associated bill
  const bill = await BillerService.getBillForOrder(orderId);
  if (bill) {
    await BillerService.cancelBiller(bill._id.toString(), reason);
  }
  
  order.orderStatus = 'cancelled';
  await order.save();
}
```

---

## API Usage Examples

### Admin - Create Bill
```bash
curl -X POST http://localhost:3000/api/admin/bills \
  -H "Authorization: Bearer {admin-token}" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "507f1f77bcf86cd799439011",
    "paymentId": "507f1f77bcf86cd799439012",
    "notes": "Manual creation - amount adjustment"
  }'
```

### Admin - List Bills
```bash
curl "http://localhost:3000/api/admin/bills?billType=COD&status=active&sortBy=createdAt&limit=50" \
  -H "Authorization: Bearer {admin-token}"
```

### Admin - Print Bill
```bash
curl -X PATCH http://localhost:3000/api/admin/bills/507f1f77bcf86cd799439013 \
  -H "Authorization: Bearer {admin-token}" \
  -H "Content-Type: application/json" \
  -d '{ "action": "print" }'
```

### Admin - Cancel Bill
```bash
curl -X PATCH http://localhost:3000/api/admin/bills/507f1f77bcf86cd799439013 \
  -H "Authorization: Bearer {admin-token}" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "cancel",
    "reason": "Order cancelled by customer"
  }'
```

### System - Auto-Generate
```bash
curl -X POST http://localhost:3000/api/bills/auto-generate \
  -H "Content-Type: application/json" \
  -d '{ "orderId": "507f1f77bcf86cd799439011" }'
```

### Customer - View Bill Status
```bash
curl "http://localhost:3000/api/bills/order/507f1f77bcf86cd799439011" \
  -H "Authorization: Bearer {customer-token}"
```

---

## Testing

### Run Test Suite
```bash
npm test -- __tests__/billerService.test.ts

# Expected: 25+ tests passing
# Covers: Auto-generation, CRUD, printing, audit, security
```

### Manual Testing Checklist
```
✓ Create order with COD payment → Bill auto-generates
✓ Create order with prepaid → Bill auto-generates on payment success
✓ Admin creates bill manually → Audit log shows admin.created
✓ Admin edits bill amount → Audit log shows changes
✓ Admin prints bill → printCount increments
✓ Admin cancels bill → Status changes to cancelled
✓ Customer views bill status → Shows correct amount
✓ Prevent duplicate bills → Only one active per order
```

---

## Troubleshooting

### Bill Not Auto-Generating
```
Check:
1. Order confirmation hook is calling BillerService.autoGenerateBill()
2. Payment method is set to 'COD' or payment.status = 'paid'
3. No existing active bill for order (should be none on first creation)
4. MongoDB is connected and BillerModel exists
```

### Cannot Print Bill
```
Check:
1. Bill status is 'active' (not 'cancelled')
2. API route returns proper error message
3. Check audit log for any cancelled entries
```

### Bill Edit Not Working
```
Check:
1. Bill is not cancelled
2. Admin is authenticated and authorized
3. amountToCollect for COD, amountPaid for PAID
4. Check response error message
```

---

## File Locations

```
Models:
  models/BillerModel.ts

Services:
  lib/services/billerService.ts

API Routes:
  app/api/admin/bills/route.ts             (list, create)
  app/api/admin/bills/[id]/route.ts        (get, patch, delete)
  app/api/bills/auto-generate/route.ts     (auto-generation)
  app/api/bills/order/[orderId]/route.ts   (customer view)

Admin UI:
  app/admin/bills/page.tsx
  app/admin/bills/bills.module.scss

Tests:
  __tests__/billerService.test.ts

Documentation:
  docs/BILLER_SYSTEM_ARCHITECTURE.md
```

---

## Environment Variables

```
No additional environment variables needed.
Uses existing MongoDB connection via MONGODB_URI
Uses existing JWT auth via verifyAdminAuth/verifyCustomerAuth
```

---

## Performance Tips

### Database Queries
```typescript
// Use indexes for fast lookups
bills = await Biller.find({ billType: 'COD', status: 'active' })
                    .sort({ createdAt: -1 })
                    .limit(50);

// Composite index (orderId + status) ensures one active bill per order
bill = await Biller.findOne({ 
  orderId: new ObjectId(orderId), 
  status: 'active' 
});
```

### Pagination
```typescript
// Always use skip/limit for list queries
const { bills, total } = await BillerService.listBillers({
  skip: (page - 1) * 50,
  limit: 50
});
```

### Caching (Optional)
```typescript
// Cache bill status for 5 minutes
const cacheKey = `bill:${billId}`;
let bill = await redis.get(cacheKey);
if (!bill) {
  bill = await BillerService.getBiller(billId);
  await redis.set(cacheKey, bill, 'EX', 300);
}
```

---

## What's Included

### Data Model
- ✓ Complete schema with snapshots
- ✓ Immutable customer/order snapshots
- ✓ Full audit trail
- ✓ Performance indexes

### Service Layer (15+ methods)
- ✓ Auto-generation
- ✓ Full CRUD (create, read, update, delete)
- ✓ Print operations
- ✓ Regeneration
- ✓ Audit logging

### API Endpoints (6)
- ✓ Admin list/create
- ✓ Admin detail/edit/delete
- ✓ System auto-generate
- ✓ Customer view

### Admin UI
- ✓ List with filters and sorting
- ✓ Detail modal with full actions
- ✓ Create/edit modals
- ✓ Print, cancel, regenerate buttons
- ✓ Delete functionality

### Testing
- ✓ 25+ comprehensive test cases
- ✓ Auto-generation tests
- ✓ CRUD tests
- ✓ Security tests
- ✓ Audit trail tests

### Documentation
- ✓ Complete architecture guide
- ✓ Integration examples
- ✓ API reference
- ✓ Troubleshooting

---

**Ready to deploy!** Follow the integration checklist above to connect the system to your orders and payments flows.
