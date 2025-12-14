# Payments Module - Comprehensive Implementation Guide

## Table of Contents
1. [Overview & Architecture](#overview--architecture)
2. [Data Model](#data-model)
3. [Payment Methods](#payment-methods)
4. [Service Layer](#service-layer)
5. [API Routes](#api-routes)
6. [Webhook Handling](#webhook-handling)
7. [Order Integration](#order-integration)
8. [Inventory Integration](#inventory-integration)
9. [Admin UI](#admin-ui)
10. [Customer Flows](#customer-flows)
11. [Error Handling](#error-handling)
12. [Security & Validation](#security--validation)
13. [Testing](#testing)
14. [Deployment Checklist](#deployment-checklist)
15. [Troubleshooting](#troubleshooting)

---

## Overview & Architecture

### Payment System Overview

The Payments module provides a secure, flexible payment engine supporting:
- **Cash on Delivery (COD)**: Direct payment confirmation without gateway
- **Online Payments**: Razorpay and Stripe gateway integration
- **Refunds**: Full and partial refund support with gateway callbacks
- **Webhook Handling**: Secure HMAC signature verification
- **Admin Controls**: Payment CRUD, refund initiation, payment override

### Architecture Diagram

```
Customer Order
    ↓
    ├─→ COD Path: Create Payment (pending) → Admin confirms (paid) → Order confirmed
    │
    └─→ Online Path: Create Payment (pending) → Redirect to Gateway → 
                    Webhook callback → Verify signature → Confirm payment (paid) → Order confirmed

Payment Status Flow:
pending → paid → (refund initiated) → refunded
pending → failed → (order failed)

Order Integration:
payment.pending → order.status = pending
payment.paid → order.status = confirmed (inventory committed)
payment.failed → order.status = failed (inventory released)
```

### Key Features

✅ **Atomic Transactions**: All payment updates happen with database transactions
✅ **Idempotency**: Duplicate requests return cached response (uuid-based keys)
✅ **Webhook Verification**: HMAC SHA256 signature validation for Razorpay/Stripe
✅ **Timeline Audit**: All payment status changes recorded in order.timeline
✅ **Gateway Snapshots**: Immutable request/response records from gateways
✅ **Admin Override**: Admin can manually confirm COD or override payment status
✅ **Refund Tracking**: Full refund lifecycle (initiated → processing → completed)

---

## Data Model

### Payment Document Schema

```typescript
interface IPayment {
  // Identification
  orderId: ObjectId;           // Reference to Order
  customerId: ObjectId;        // Reference to User
  
  // Amount
  amount: number;              // Must match order.totals.grandTotal
  currency: string;            // INR, USD, EUR, GBP (default: INR)
  
  // Method & Status
  method: 'COD' | 'ONLINE';    // Payment method
  provider: 'razorpay' | 'stripe' | 'manual' | null;
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  
  // Transaction Details
  txnId?: string;              // External transaction ID
  paymentId?: string;          // Gateway order/payment ID
  receiptId?: string;          // COD receipt number
  
  // Gateway Snapshots (immutable)
  gatewayRequest?: {
    provider: string;
    orderId?: string;
    amount: number;
    currency: string;
    timestamp: Date;
    requestId: string;
  };
  
  gatewayResponse?: {
    provider: string;
    signature?: string;
    amount?: number;
    errorCode?: string;
    errorMessage?: string;
    timestamp: Date;
  };
  
  // Metadata
  meta?: {
    ipAddress?: string;
    userAgent?: string;
    deviceType?: 'mobile' | 'desktop' | 'tablet';
    idempotencyKey?: string;   // Prevent duplicates
    notes?: string;
    adminOverride?: boolean;   // Manual admin action
    overriddenBy?: ObjectId;
    overriddenAt?: Date;
  };
  
  // Refund Tracking
  refundStatus?: 'none' | 'initiated' | 'processing' | 'completed' | 'failed';
  refundAmount?: number;
  refundTxnId?: string;
  refundInitiatedAt?: Date;
  refundCompletedAt?: Date;
  
  // Audit Trail
  statusHistory: Array<{
    status: 'pending' | 'paid' | 'failed' | 'refunded';
    changedAt: Date;
    changedBy: 'system' | 'admin' | 'gateway';
    reason?: string;
  }>;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
```

### Database Indexes

```javascript
// Primary indexes
db.payments.createIndex({ orderId: 1 });
db.payments.createIndex({ status: 1 });
db.payments.createIndex({ provider: 1 });
db.payments.createIndex({ customerId: 1 });

// Compound indexes for queries
db.payments.createIndex({ orderId: 1, status: 1 });
db.payments.createIndex({ customerId: 1, status: 1 });

// For idempotency and webhook deduplication
db.payments.createIndex({ 'meta.idempotencyKey': 1, orderId: 1 });
db.payments.createIndex({ txnId: 1 }, { sparse: true, unique: true });
```

---

## Payment Methods

### COD (Cash on Delivery)

**Flow:**
```
1. Customer selects COD at checkout
2. System creates Payment (method: 'COD', status: 'pending', provider: null)
3. Order created with status: 'pending'
4. Admin receives order notification
5. Admin confirms payment after collecting cash
6. System updates Payment (status: 'paid'), Order (status: 'confirmed')
7. Inventory items committed
```

**Example:**
```json
{
  "orderId": "order_abc123",
  "customerId": "user_xyz789",
  "amount": 2500,
  "method": "COD",
  "provider": null,
  "status": "pending"
}
```

### Online Payment (Razorpay)

**Flow:**
```
1. Customer selects ONLINE payment
2. System creates Payment (method: 'ONLINE', status: 'pending', provider: 'razorpay')
3. System creates Razorpay order via API
4. Frontend redirects customer to Razorpay checkout
5. Customer completes payment on Razorpay
6. Razorpay sends webhook to /api/payments/webhook
7. System verifies HMAC signature
8. System confirms Payment (status: 'paid')
9. Order status updated to 'confirmed'
```

**Environment Variables:**
```bash
RAZORPAY_KEY_ID=rzp_live_xxxxx
RAZORPAY_KEY_SECRET=secret_xxxxx
RAZORPAY_WEBHOOK_SECRET=webhook_secret_xxxxx

STRIPE_PUBLIC_KEY=pk_live_xxxxx
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

---

## Service Layer

### PaymentService Methods

#### 1. initiatePayment()
Creates a pending payment record.

```typescript
const payment = await PaymentService.initiatePayment({
  orderId: 'order_123',
  customerId: 'customer_456',
  amount: 2500,
  currency: 'INR',
  method: 'COD' | 'ONLINE',
  provider: 'razorpay' | 'stripe' | null,
  meta: {
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0...',
    deviceType: 'mobile',
    idempotencyKey: 'uuid-v4'
  }
});
// Returns: Payment document (status: 'pending')
```

**Validations:**
- Order exists and is not failed
- Customer exists
- Amount matches order.totals.grandTotal (±0.01)
- No duplicate idempotency key for same order
- Prevents duplicate payments for completed orders

#### 2. confirmPayment()
Confirms online payment after gateway verification.

```typescript
const payment = await PaymentService.confirmPayment({
  paymentId: 'pay_123',
  orderId: 'order_456',
  txnId: 'txn_789',
  signature: 'hmac_signature_here',
  meta: { ... }
});
// Returns: Payment document (status: 'paid')
```

**Actions:**
- Verifies HMAC signature based on provider
- Updates payment status to 'paid'
- Records gateway response
- Updates order status to 'confirmed'
- Commits inventory items
- Adds timeline event

#### 3. failPayment()
Marks payment as failed (customer cancelled or gateway rejected).

```typescript
const payment = await PaymentService.failPayment({
  paymentId: 'pay_123',
  orderId: 'order_456',
  errorCode: 'USER_CANCELLED',
  errorMessage: 'Customer cancelled payment'
});
// Returns: Payment document (status: 'failed')
```

**Actions:**
- Updates payment status to 'failed'
- Records error details
- Updates order status to 'failed'
- Releases inventory items
- Adds timeline event

#### 4. confirmCODPayment()
Admin confirms cash collection for COD orders.

```typescript
const payment = await PaymentService.confirmCODPayment({
  paymentId: 'pay_123',
  receiptId: 'REC-001-2024',
  confirmedBy: 'admin_xyz',
  notes: 'Cash collected by Raj'
});
// Returns: Payment document (status: 'paid')
```

**Validations:**
- Payment method must be 'COD'
- Payment status must be 'pending'
- Admin ID required

#### 5. initiateRefund()
Admin initiates refund for paid payment.

```typescript
const payment = await PaymentService.initiateRefund({
  paymentId: 'pay_123',
  amount: 2500, // Optional, defaults to full amount
  reason: 'Customer requested full refund',
  initiatedBy: 'admin_xyz',
  meta: { ... }
});
// Returns: Payment document (refundStatus: 'initiated' or 'completed')
```

**For COD/Manual:** Refund completes immediately
**For Razorpay/Stripe:** Refund marked as 'processing', waits for gateway webhook

#### 6. handleWebhook()
Processes webhook callbacks from payment gateways.

```typescript
const payment = await PaymentService.handleWebhook(
  webhookPayload,
  signature,
  provider
);
// Returns: Payment document (updated based on webhook)
```

**Signature Verification:**
```typescript
// Razorpay: HMAC SHA256
const message = `${orderId}|${paymentId}`;
const signature = crypto
  .createHmac('sha256', RAZORPAY_KEY_SECRET)
  .update(message)
  .digest('hex');

// Stripe: Similar HMAC SHA256 with event ID
const signature = crypto
  .createHmac('sha256', STRIPE_WEBHOOK_SECRET)
  .update(payload)
  .digest('hex');
```

#### 7. getPaymentById()
Retrieve payment by ID.

```typescript
const payment = await PaymentService.getPaymentById('pay_123');
```

#### 8. getPaymentByOrderId()
Get most recent payment for an order.

```typescript
const payment = await PaymentService.getPaymentByOrderId('order_456');
```

#### 9. listPayments()
List payments with filters and pagination (admin).

```typescript
const { payments, pagination } = await PaymentService.listPayments(
  {
    status: 'paid',
    method: 'ONLINE',
    provider: 'razorpay',
    customerId: 'cust_123',
    orderId: 'order_456',
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-01-31')
  },
  page = 1,
  limit = 20,
  sortBy = 'createdAt',
  sortOrder = 'desc'
);
```

#### 10. updatePayment()
Admin updates payment details.

```typescript
const payment = await PaymentService.updatePayment(
  paymentId,
  {
    amount: 2500,
    status: 'paid',
    notes: 'Manually confirmed'
  },
  adminId,
  reason = 'Manual adjustment'
);
```

#### 11. deletePayment()
Admin deletes payment (only pending payments).

```typescript
await PaymentService.deletePayment(paymentId, adminId);
```

#### 12. completeRefund()
Gateway callback to mark refund as completed.

```typescript
const payment = await PaymentService.completeRefund(
  paymentId,
  refundTxnId
);
```

---

## API Routes

### Customer Routes

#### POST /api/payments/initiate
Initiate a payment for checkout.

**Request:**
```json
{
  "orderId": "order_123",
  "customerId": "cust_456",
  "amount": 2500,
  "currency": "INR",
  "method": "COD",
  "provider": null,
  "meta": {
    "deviceType": "mobile"
  }
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "pay_789",
    "orderId": "order_123",
    "amount": 2500,
    "status": "pending",
    "method": "COD",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

**Error (400):**
```json
{
  "success": false,
  "code": "AMOUNT_MISMATCH",
  "message": "Amount does not match order total",
  "details": {
    "expectedAmount": 2500,
    "providedAmount": 2400
  }
}
```

#### GET /api/payments?orderId=order_123&status=pending
Get payment details for customer.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "pay_789",
    "orderId": "order_123",
    "amount": 2500,
    "currency": "INR",
    "method": "COD",
    "status": "pending",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

#### POST /api/payments/confirm
Confirm payment after gateway or COD collection.

**For Online Payment:**
```json
{
  "paymentId": "pay_789",
  "orderId": "order_123",
  "txnId": "txn_razorpay_123",
  "signature": "hmac_signature_value"
}
```

**For COD Payment:**
```json
{
  "type": "COD",
  "paymentId": "pay_789",
  "receiptId": "REC-001-2024",
  "confirmedBy": "admin_xyz",
  "notes": "Cash collected"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "pay_789",
    "status": "paid",
    "txnId": "txn_razorpay_123"
  },
  "message": "Payment confirmed successfully"
}
```

### Admin Routes

#### POST /api/admin/payments
Create payment (admin override).

**Request:**
```json
{
  "orderId": "order_123",
  "customerId": "cust_456",
  "amount": 2500,
  "method": "COD",
  "provider": null,
  "status": "pending",
  "notes": "Manual creation for test"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": { ... }
}
```

**Header Required:**
```
x-admin-id: admin_xyz
```

#### GET /api/admin/payments?status=paid&page=1&limit=20
List all payments with filters.

**Query Parameters:**
```
status=pending|paid|failed|refunded
method=COD|ONLINE
provider=razorpay|stripe|manual
customerId=cust_123
orderId=order_456
startDate=2024-01-01T00:00:00Z
endDate=2024-01-31T23:59:59Z
page=1
limit=20
sortBy=createdAt|amount|status
sortOrder=asc|desc
```

**Response (200):**
```json
{
  "success": true,
  "data": [ ... payments array ... ],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "pages": 8
  }
}
```

#### PATCH /api/payments/[id]
Update payment (admin).

**Request:**
```json
{
  "amount": 2600,
  "status": "paid",
  "notes": "Amount corrected",
  "reason": "Customer paid extra 100 for shipping"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": { ... updated payment ... }
}
```

#### DELETE /api/payments/[id]
Delete payment (admin, only pending).

**Response (200):**
```json
{
  "success": true,
  "message": "Payment deleted successfully"
}
```

**Error (400):**
```json
{
  "success": false,
  "code": "CANNOT_MODIFY_PAID_PAYMENT",
  "message": "Cannot delete a paid payment"
}
```

#### POST /api/admin/payments/[id]/refund
Initiate refund.

**Request:**
```json
{
  "amount": 2500,
  "reason": "Customer requested full refund - order cancelled"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "pay_789",
    "refundStatus": "completed",
    "refundAmount": 2500,
    "refundInitiatedAt": "2024-01-15T11:00:00Z"
  }
}
```

---

## Webhook Handling

### Razorpay Webhook

**Endpoint:** POST /api/payments/webhook

**Headers:**
```
x-razorpay-signature: signature_from_razorpay
```

**Payload:**
```json
{
  "event": "payment.captured",
  "payload": {
    "payment": {
      "entity": "payment",
      "id": "pay_DBJOWzybf0sJbb",
      "amount": 1000,
      "currency": "INR",
      "status": "captured",
      "method": "card",
      "order_id": "order_DBJOWzybf0sJbb"
    }
  }
}
```

**Verification:**
```javascript
const crypto = require('crypto');

const body = JSON.stringify(payload);
const expectedSignature = crypto
  .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
  .update(body)
  .digest('hex');

const isValid = expectedSignature === incomingSignature;
```

### Stripe Webhook

**Endpoint:** POST /api/payments/webhook

**Headers:**
```
stripe-signature: t=timestamp,v1=signature
```

**Payload:**
```json
{
  "id": "evt_1234567890",
  "type": "charge.succeeded",
  "data": {
    "object": {
      "id": "ch_1234567890",
      "amount": 100000,
      "currency": "inr",
      "status": "succeeded"
    }
  }
}
```

**Verification:**
```javascript
const crypto = require('crypto');

const timestamp = req.headers['t'];
const signature = req.headers['v1'];
const body = req.body;

const signed_content = `${timestamp}.${body}`;
const expected_sig = crypto
  .createHmac('sha256', STRIPE_WEBHOOK_SECRET)
  .update(signed_content)
  .digest('hex');

const isValid = expected_sig === signature;
```

### Idempotency for Webhooks

Prevent double-processing of webhooks:

```javascript
// Store webhook IDs
const webhookCache = new Map();

const webhookId = `${provider}_${paymentId}_${timestamp}`;

if (webhookCache.has(webhookId)) {
  return { success: true, message: 'Already processed' };
}

// Process webhook...

webhookCache.set(webhookId, true);
```

---

## Order Integration

### Timeline Events

Payment status changes are recorded in order.timeline:

```json
{
  "timeline": [
    {
      "actor": "system",
      "action": "payment.initiated",
      "timestamp": "2024-01-15T10:30:00Z",
      "meta": {
        "paymentId": "pay_123",
        "method": "COD",
        "amount": 2500
      }
    },
    {
      "actor": "admin_xyz",
      "action": "payment.success",
      "timestamp": "2024-01-15T11:00:00Z",
      "meta": {
        "paymentId": "pay_123",
        "amount": 2500,
        "receiptId": "REC-001-2024"
      }
    },
    {
      "actor": "system",
      "action": "payment.refund.initiated",
      "timestamp": "2024-01-16T09:00:00Z",
      "meta": {
        "paymentId": "pay_123",
        "refundAmount": 2500,
        "reason": "Customer cancelled"
      }
    },
    {
      "actor": "system",
      "action": "payment.refund.completed",
      "timestamp": "2024-01-16T10:30:00Z",
      "meta": {
        "paymentId": "pay_123",
        "refundAmount": 2500,
        "refundTxnId": "rfnd_123"
      }
    }
  ]
}
```

### Order Status Transitions

```
Order Created
    ↓
status: 'pending' ← payment.initiated
    ↓ (payment.paid received)
status: 'confirmed' ← inventory committed
    ↓ (items packed, shipped, delivered)
status: 'delivered'

Alternative: payment.failed
    ↓
status: 'failed' ← inventory released
```

---

## Inventory Integration

### Commit on Payment Success

When payment.paid:
```typescript
// In order confirmation flow
const order = await Order.findById(payment.orderId);
for (const item of order.items) {
  await InventoryService.commitReservation(
    item.productId,
    item.variantId,
    item.quantity,
    payment._id.toString()
  );
}
order.status = 'confirmed';
await order.save();
```

### Release on Payment Failure

When payment.failed:
```typescript
const order = await Order.findById(payment.orderId);
for (const item of order.items) {
  await InventoryService.releaseReservation(
    item.productId,
    item.variantId,
    item.quantity,
    payment._id.toString()
  );
}
order.status = 'failed';
await order.save();
```

---

## Admin UI

### Payment List View

Create `app/admin/payments/page.tsx`:

```typescript
'use client';
import { useState, useEffect } from 'react';
import PaymentsList from '@/components/Admin/PaymentsList';
import PaymentFilters from '@/components/Admin/PaymentFilters';

export default function PaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [filters, setFilters] = useState({
    status: '',
    method: '',
    provider: '',
  });
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});

  useEffect(() => {
    fetchPayments();
  }, [filters, page]);

  const fetchPayments = async () => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
    params.append('page', page);
    params.append('limit', '20');

    const res = await fetch(`/api/admin/payments?${params}`, {
      headers: { 'x-admin-id': adminId },
    });
    const { data, pagination } = await res.json();
    setPayments(data);
    setPagination(pagination);
  };

  return (
    <div className="payments-page">
      <h1>Payments</h1>
      <PaymentFilters filters={filters} onChange={setFilters} />
      <PaymentsList payments={payments} pagination={pagination} />
    </div>
  );
}
```

### Payment Detail View

Create `app/admin/payments/[id]/page.tsx`:

```typescript
'use client';
import { useEffect, useState } from 'react';
import PaymentDetail from '@/components/Admin/PaymentDetail';
import RefundModal from '@/components/Admin/RefundModal';

export default function PaymentDetailPage({ params }) {
  const [payment, setPayment] = useState(null);
  const [showRefundModal, setShowRefundModal] = useState(false);

  useEffect(() => {
    fetchPayment();
  }, []);

  const fetchPayment = async () => {
    const res = await fetch(`/api/payments/${params.id}`);
    const { data } = await res.json();
    setPayment(data);
  };

  const handleRefund = async (amount, reason) => {
    const res = await fetch(`/api/admin/payments/${params.id}/refund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-id': adminId,
      },
      body: JSON.stringify({ amount, reason }),
    });
    const { data } = await res.json();
    setPayment(data);
    setShowRefundModal(false);
  };

  return (
    <div>
      {payment && (
        <>
          <PaymentDetail payment={payment} onRefund={() => setShowRefundModal(true)} />
          {showRefundModal && (
            <RefundModal
              payment={payment}
              onRefund={handleRefund}
              onClose={() => setShowRefundModal(false)}
            />
          )}
        </>
      )}
    </div>
  );
}
```

---

## Customer Flows

### COD Flow

1. **Checkout Page:**
   - Display payment method selection
   - Show COD option
   - Calculate total

2. **Select COD:**
   ```javascript
   const response = await fetch('/api/payments/initiate', {
     method: 'POST',
     body: JSON.stringify({
       orderId: order._id,
       customerId: user._id,
       amount: order.totals.grandTotal,
       method: 'COD'
     })
   });
   const { data: payment } = await response.json();
   // Redirect to order confirmation
   ```

3. **Order Confirmation Page:**
   - Show "Order placed, awaiting payment"
   - Display payment status: pending

### Online Payment Flow

1. **Checkout Page:**
   - Display payment method selection
   - Show online payment option

2. **Select Online:**
   ```javascript
   const paymentResponse = await fetch('/api/payments/initiate', {
     method: 'POST',
     body: JSON.stringify({
       orderId: order._id,
       customerId: user._id,
       amount: order.totals.grandTotal,
       method: 'ONLINE',
       provider: 'razorpay'
     })
   });
   const { data: payment } = await paymentResponse.json();
   
   // Create Razorpay order
   const razorpayOrder = await createRazorpayOrder(payment.amount);
   
   // Open Razorpay checkout
   const options = {
     key: RAZORPAY_KEY,
     amount: payment.amount * 100,
     order_id: razorpayOrder.id,
     handler: async (response) => {
       // Confirm with backend
       const confirmRes = await fetch('/api/payments/confirm', {
         method: 'POST',
         body: JSON.stringify({
           paymentId: payment._id,
           orderId: order._id,
           txnId: response.razorpay_payment_id,
           signature: response.razorpay_signature
         })
       });
       const { success } = await confirmRes.json();
       if (success) {
         // Redirect to success page
       }
     }
   };
   
   window.Razorpay(options).open();
   ```

3. **Razorpay Callback:**
   - Razorpay sends webhook to `/api/payments/webhook`
   - System verifies signature
   - Payment updated to 'paid'
   - Order updated to 'confirmed'

4. **Order Confirmation Page:**
   - Show "Payment received, order confirmed"
   - Display payment status: paid

---

## Error Handling

### Error Codes

| Code | Status | Description |
|------|--------|-------------|
| PAYMENT_NOT_FOUND | 404 | Payment record not found |
| ORDER_NOT_FOUND | 404 | Order does not exist |
| CUSTOMER_NOT_FOUND | 404 | Customer does not exist |
| INVALID_AMOUNT | 400 | Amount is zero or negative |
| AMOUNT_MISMATCH | 400 | Amount doesn't match order total |
| INVALID_METHOD | 400 | Invalid payment method |
| PAYMENT_ALREADY_PAID | 400 | Payment already confirmed |
| PAYMENT_ALREADY_FAILED | 400 | Payment already failed |
| SIGNATURE_VERIFICATION_FAILED | 403 | Invalid gateway signature |
| DUPLICATE_WEBHOOK | 400 | Webhook already processed |
| GATEWAY_ERROR | 500 | Payment gateway error |
| REFUND_NOT_ALLOWED | 400 | Cannot refund non-paid payment |
| REFUND_ALREADY_INITIATED | 400 | Refund already in progress |
| INVALID_REFUND_AMOUNT | 400 | Refund exceeds payment amount |

### Error Response Format

```json
{
  "success": false,
  "code": "AMOUNT_MISMATCH",
  "message": "Amount does not match order total",
  "details": {
    "expectedAmount": 2500,
    "providedAmount": 2400
  }
}
```

---

## Security & Validation

### Input Validation

- **Amount:** Positive number, matches order total
- **Payment ID:** Valid MongoDB ObjectId
- **Order ID:** Valid MongoDB ObjectId
- **Customer ID:** Valid MongoDB ObjectId
- **Signature:** Non-empty string for gateway verification
- **Reason (refund):** Min 10 characters

### Idempotency

- Generate UUID-based idempotency key
- Store in meta.idempotencyKey
- Check for duplicate key before processing
- Return cached response for duplicates

### Signature Verification

```javascript
// Razorpay
const message = `${orderId}|${paymentId}`;
const signature = crypto
  .createHmac('sha256', RAZORPAY_KEY_SECRET)
  .update(message)
  .digest('hex');

// Stripe
const signature = crypto
  .createHmac('sha256', STRIPE_WEBHOOK_SECRET)
  .update(payload)
  .digest('hex');
```

### Admin Authorization

All admin routes require `x-admin-id` header:

```typescript
const adminId = request.headers.get('x-admin-id');
if (!adminId) {
  return { success: false, code: 'UNAUTHORIZED', statusCode: 401 };
}
```

### Transaction Safety

All critical operations use MongoDB transactions:

```typescript
const session = await Payment.startSession();
session.startTransaction();

try {
  // Update payment
  // Update order
  // Update inventory
  await session.commitTransaction();
} catch (error) {
  await session.abortTransaction();
  throw error;
} finally {
  session.endSession();
}
```

---

## Testing

### Test Categories

1. **Initiate Payment:** 5 tests
   - COD creation
   - Online creation
   - Order not found
   - Amount mismatch
   - Duplicate prevention

2. **Confirm Payment:** 3 tests
   - Valid signature
   - Payment not found
   - Non-pending prevention

3. **COD Confirmation:** 2 tests
   - Admin confirmation
   - Non-COD prevention

4. **Refund:** 3 tests
   - Refund initiation
   - Amount validation
   - Status requirements

5. **List/Get:** 4 tests
   - Pagination
   - Filtering
   - Retrieval
   - Error handling

### Running Tests

```bash
npm test __tests__/paymentService.test.ts
npm test -- --coverage  # With coverage
npm test -- --watch    # Watch mode
```

### Test Coverage Goals

- Line Coverage: 85%+
- Branch Coverage: 80%+
- Function Coverage: 90%+

---

## Deployment Checklist

- [ ] Database indexes created
- [ ] Environment variables configured (Razorpay, Stripe keys)
- [ ] Webhook URLs registered with gateways
- [ ] SSL certificate installed (for webhooks)
- [ ] Admin UI components created and tested
- [ ] All API routes tested
- [ ] Error handling verified
- [ ] Signature verification tested with real gateway keys
- [ ] Transaction rollback tested
- [ ] Load testing completed
- [ ] Monitoring/logging setup
- [ ] Backup strategy verified
- [ ] Refund flow tested end-to-end
- [ ] Admin override tested
- [ ] Documentation complete

---

## Troubleshooting

### Payment Stuck in Pending

**Symptom:** Payment shows pending for long time

**Causes & Fixes:**
1. Check if webhook received: `db.payments.findOne({ status: 'pending', txnId: { $exists: true } })`
2. Verify webhook secret is correct in env
3. Check logs for signature verification failures
4. Manually confirm if webhook lost: Use admin API

### Signature Verification Failed

**Symptom:** Webhook payload validation error

**Causes & Fixes:**
1. Verify webhook secret matches gateway configuration
2. Check if gateway sending correct signature format
3. Ensure body is not modified before signature check
4. Log incoming signature and payload for debugging

### Double Webhook Processing

**Symptom:** Payment confirmed twice, inventory over-committed

**Causes & Fixes:**
1. Idempotency key check is failing
2. Database transaction not rolling back on error
3. Webhook retries not handling duplicates properly

**Fix:** Add webhook ID to processed cache:
```javascript
const webhookId = `${provider}_${event_id}`;
if (processedWebhooks.has(webhookId)) return success;
processedWebhooks.set(webhookId, true);
```

### Order Inventory Not Committed

**Symptom:** Payment confirmed but inventory not committed

**Causes & Fixes:**
1. Check if order status is 'confirmed'
2. Verify inventory service call succeeded
3. Check for errors in service layer
4. Manual fix: Admin API to retry inventory commit

### Refund Not Processed

**Symptom:** Refund initiated but not completed

**Causes & Fixes:**
1. Check if refundStatus is 'initiated' but not 'processing'
2. For online payments, verify gateway refund API response
3. Check webhook for refund completion event
4. Manual fix: Admin API to mark refund complete

---

## Additional Resources

- [Razorpay Documentation](https://razorpay.com/docs/api/)
- [Stripe Documentation](https://stripe.com/docs/api)
- [Order Module Integration](./ORDERS_SYSTEM_GUIDE.md)
- [Inventory Module Integration](./INVENTORY_SYSTEM_GUIDE.md)
- [Admin Authentication](./ADMIN_AUTH_GUIDE.md)
