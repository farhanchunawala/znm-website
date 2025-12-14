# Payments Module - Code Samples

## Quick Reference - 3 Essential Snippets

### Snippet 1: Payment Model & Schema

```typescript
// models/PaymentModel.ts
import mongoose, { Schema } from 'mongoose';

export interface IPayment extends mongoose.Document {
  orderId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  method: 'COD' | 'ONLINE';
  provider: 'razorpay' | 'stripe' | 'manual' | null;
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  txnId?: string;
  paymentId?: string;
  receiptId?: string;
  gatewayRequest?: Record<string, any>;
  gatewayResponse?: Record<string, any>;
  meta?: Record<string, any>;
  refundStatus?: string;
  refundAmount?: number;
  statusHistory: Array<{
    status: string;
    changedAt: Date;
    changedBy: 'system' | 'admin' | 'gateway';
    reason?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR', enum: ['INR', 'USD'] },
    method: { type: String, required: true, enum: ['COD', 'ONLINE'], index: true },
    provider: { type: String, enum: ['razorpay', 'stripe', 'manual', null], default: null, index: true },
    status: { type: String, required: true, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending', index: true },
    txnId: { type: String, sparse: true, unique: true },
    paymentId: { type: String, sparse: true },
    receiptId: { type: String, sparse: true },
    gatewayRequest: { type: Object },
    gatewayResponse: { type: Object },
    meta: { type: Object },
    refundStatus: { type: String, default: 'none' },
    refundAmount: { type: Number },
    statusHistory: [{
      status: String,
      changedAt: { type: Date, default: Date.now },
      changedBy: { type: String, enum: ['system', 'admin', 'gateway'] },
      reason: String,
      _id: false
    }],
  },
  { timestamps: true }
);

// Indexes
PaymentSchema.index({ orderId: 1, status: 1 });
PaymentSchema.index({ customerId: 1, status: 1 });

export default mongoose.models.Payment || mongoose.model('Payment', PaymentSchema);
```

### Snippet 2: Initiate Payment Handler

```typescript
// app/api/payments/initiate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import PaymentService, { PaymentError } from '@/lib/services/paymentService';
import { InitiatePaymentSchema } from '@/lib/validations/paymentValidation';
import { connectDB } from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const validated = InitiatePaymentSchema.parse(body);

    // Get customer ID from auth context (or header in testing)
    const customerId = body.customerId || request.headers.get('x-customer-id');

    const payment = await PaymentService.initiatePayment({
      ...validated,
      customerId,
      meta: {
        ...validated.meta,
        ipAddress: request.ip,
        userAgent: request.headers.get('user-agent') || undefined,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: payment._id,
          orderId: payment.orderId,
          amount: payment.amount,
          status: payment.status,
          method: payment.method,
          createdAt: payment.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Initiate payment error:', error);

    if (error instanceof PaymentError) {
      return NextResponse.json(
        {
          success: false,
          code: error.code,
          message: error.message,
          details: error.details,
        },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      {
        success: false,
        code: 'INTERNAL_ERROR',
        message: 'Failed to initiate payment',
      },
      { status: 500 }
    );
  }
}
```

**Usage in Frontend:**
```typescript
const initiatePayment = async (orderId: string, method: 'COD' | 'ONLINE') => {
  const response = await fetch('/api/payments/initiate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderId,
      customerId: user._id,
      amount: order.totals.grandTotal,
      method,
      provider: method === 'ONLINE' ? 'razorpay' : null,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  const { data: payment } = await response.json();
  return payment;
};
```

### Snippet 3: Confirm Payment Handler

```typescript
// app/api/payments/confirm/route.ts
import { NextRequest, NextResponse } from 'next/server';
import PaymentService, { PaymentError } from '@/lib/services/paymentService';
import { ConfirmPaymentSchema, ConfirmCODPaymentSchema } from '@/lib/validations/paymentValidation';
import { connectDB } from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { type } = body;

    // Handle COD confirmation
    if (type === 'COD') {
      const validated = ConfirmCODPaymentSchema.parse({
        paymentId: body.paymentId,
        receiptId: body.receiptId,
        confirmedBy: request.headers.get('x-admin-id'),
        notes: body.notes,
      });

      if (!validated.confirmedBy) {
        return NextResponse.json(
          { success: false, code: 'UNAUTHORIZED', message: 'Admin required' },
          { status: 401 }
        );
      }

      const payment = await PaymentService.confirmCODPayment(validated);
      return NextResponse.json({ success: true, data: payment }, { status: 200 });
    }

    // Handle online payment confirmation
    const validated = ConfirmPaymentSchema.parse({
      paymentId: body.paymentId,
      orderId: body.orderId,
      txnId: body.txnId,
      signature: body.signature,
    });

    const payment = await PaymentService.confirmPayment(validated);

    return NextResponse.json(
      { success: true, data: payment, message: 'Payment confirmed' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Confirm payment error:', error);

    if (error instanceof PaymentError) {
      return NextResponse.json(
        { success: false, code: error.code, message: error.message },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { success: false, code: 'ERROR', message: 'Failed to confirm' },
      { status: 500 }
    );
  }
}
```

**Usage in Frontend (Razorpay Checkout):**
```typescript
const handleRazorpayCheckout = async (payment: any, order: any) => {
  const options = {
    key: process.env.NEXT_PUBLIC_RAZORPAY_KEY,
    amount: payment.amount * 100,
    currency: 'INR',
    name: 'ZNM Store',
    description: `Order #${order._id}`,
    order_id: payment.paymentId,
    handler: async (response: any) => {
      try {
        // Confirm with backend
        const confirmRes = await fetch('/api/payments/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentId: payment._id,
            orderId: order._id,
            txnId: response.razorpay_payment_id,
            signature: response.razorpay_signature,
          }),
        });

        const result = await confirmRes.json();
        if (result.success) {
          router.push(`/order/${order._id}/success`);
        }
      } catch (error) {
        console.error('Payment confirmation error:', error);
      }
    },
    prefill: {
      email: user.email,
      contact: user.phone,
    },
  };

  const razorpay = new window.Razorpay(options);
  razorpay.open();
};
```

---

## Implementation Examples

### Example 1: COD Payment Flow

```typescript
// Customer checkout with COD
async function checkoutWithCOD(orderId: string, userId: string) {
  // Step 1: Create payment record
  const initiateRes = await fetch('/api/payments/initiate', {
    method: 'POST',
    body: JSON.stringify({
      orderId,
      customerId: userId,
      amount: 2500,
      method: 'COD',
      provider: null,
    }),
  });

  const { data: payment } = await initiateRes.json();
  console.log('Payment created:', payment.id, 'Status:', payment.status);

  // Step 2: Order confirmation page shows "Awaiting payment confirmation"
  // Admin receives notification

  // Step 3: Admin confirms payment after collecting cash
  const confirmRes = await fetch('/api/payments/confirm', {
    method: 'POST',
    headers: { 'x-admin-id': 'admin_123' },
    body: JSON.stringify({
      type: 'COD',
      paymentId: payment.id,
      receiptId: 'REC-2024-001',
      notes: 'Cash collected by Raj Kumar',
    }),
  });

  const { data: confirmedPayment } = await confirmRes.json();
  console.log('Payment confirmed:', confirmedPayment.status); // 'paid'

  // Order now shows as "Confirmed, processing"
}
```

### Example 2: Online Payment with Razorpay

```typescript
// Customer checkout with online payment
async function checkoutWithRazorpay(orderId: string, userId: string) {
  // Step 1: Create payment record with provider
  const initiateRes = await fetch('/api/payments/initiate', {
    method: 'POST',
    body: JSON.stringify({
      orderId,
      customerId: userId,
      amount: 2500,
      method: 'ONLINE',
      provider: 'razorpay',
    }),
  });

  const { data: payment } = await initiateRes.json();

  // Step 2: Create Razorpay order
  const razorpayOrderRes = await createRazorpayOrder({
    amount: payment.amount * 100,
    currency: 'INR',
    receipt: `order_${orderId}`,
  });

  const razorpayOrder = await razorpayOrderRes.json();

  // Step 3: Display Razorpay checkout
  const options = {
    key: process.env.NEXT_PUBLIC_RAZORPAY_KEY,
    amount: payment.amount * 100,
    order_id: razorpayOrder.id,
    handler: async (response: any) => {
      // Step 4: Confirm with backend signature verification
      const confirmRes = await fetch('/api/payments/confirm', {
        method: 'POST',
        body: JSON.stringify({
          paymentId: payment.id,
          orderId,
          txnId: response.razorpay_payment_id,
          signature: response.razorpay_signature,
        }),
      });

      const { success } = await confirmRes.json();
      if (success) {
        // Order now shows as "Paid, processing"
        router.push(`/order/${orderId}/success`);
      }
    },
  };

  const razorpay = new window.Razorpay(options);
  razorpay.open();

  // Step 5 (automatic): Razorpay webhook calls /api/payments/webhook
  // System verifies signature and updates payment status
}
```

### Example 3: Admin Refund Initiation

```typescript
// Admin initiates refund for paid payment
async function refundPayment(paymentId: string, amount: number, reason: string) {
  const refundRes = await fetch(`/api/admin/payments/${paymentId}/refund`, {
    method: 'POST',
    headers: { 'x-admin-id': 'admin_123' },
    body: JSON.stringify({
      amount, // Optional, defaults to full amount
      reason, // Required, min 10 chars
    }),
  });

  const { data: payment } = await refundRes.json();

  if (payment.method === 'COD') {
    // Refund immediately completed for COD
    console.log('Refund completed:', payment.refundStatus); // 'completed'
  } else {
    // Refund processing for online payments
    console.log('Refund initiated:', payment.refundStatus); // 'initiated'
    // Gateway webhook will complete refund later
  }

  // Order timeline includes refund events
  const order = await getOrder(payment.orderId);
  const refundEvent = order.timeline.find((e: any) => e.action === 'payment.refund.initiated');
  console.log('Refund event:', refundEvent);
}
```

### Example 4: List Payments with Filters

```typescript
// Admin dashboard - list payments
async function listPayments(filters: {
  status?: string;
  method?: string;
  provider?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
}) {
  const params = new URLSearchParams();
  if (filters.status) params.append('status', filters.status);
  if (filters.method) params.append('method', filters.method);
  if (filters.provider) params.append('provider', filters.provider);
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  params.append('page', filters.page?.toString() || '1');
  params.append('limit', '20');

  const listRes = await fetch(`/api/admin/payments?${params}`, {
    headers: { 'x-admin-id': 'admin_123' },
  });

  const { data: payments, pagination } = await listRes.json();

  console.log(`Found ${pagination.total} payments`);
  console.log(`Page ${pagination.page} of ${pagination.pages}`);

  // Display table
  payments.forEach((p: any) => {
    console.log(`[${p.status}] ${p.method} | Amount: ₹${p.amount} | Customer: ${p.customerId}`);
  });
}
```

---

## Validation Examples

### Valid Request

```json
{
  "orderId": "507f1f77bcf86cd799439011",
  "customerId": "507f1f77bcf86cd799439012",
  "amount": 2500.00,
  "currency": "INR",
  "method": "ONLINE",
  "provider": "razorpay",
  "meta": {
    "deviceType": "mobile",
    "ipAddress": "192.168.1.1"
  }
}
```

### Invalid Requests

```json
// Missing required field
{
  "orderId": "507f1f77bcf86cd799439011",
  "customerId": "507f1f77bcf86cd799439012"
  // Missing: amount, method
}
```

```json
// Invalid amount
{
  "orderId": "507f1f77bcf86cd799439011",
  "customerId": "507f1f77bcf86cd799439012",
  "amount": -500,  // Negative amount
  "method": "COD"
}
```

```json
// Mismatched amount
{
  "orderId": "507f1f77bcf86cd799439011",
  "customerId": "507f1f77bcf86cd799439012",
  "amount": 2000,  // Order total is 2500
  "method": "ONLINE"
}
```

---

## API Response Examples

### Successful Payment Initiation (201)

```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439013",
    "orderId": "507f1f77bcf86cd799439011",
    "customerId": "507f1f77bcf86cd799439012",
    "amount": 2500,
    "currency": "INR",
    "method": "ONLINE",
    "provider": "razorpay",
    "status": "pending",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

### Payment Confirmation Success (200)

```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439013",
    "orderId": "507f1f77bcf86cd799439011",
    "status": "paid",
    "txnId": "pay_DBJOWzybf0sJbb",
    "paymentId": "pay_DBJOWzybf0sJbb",
    "gatewayResponse": {
      "provider": "razorpay",
      "signature": "9ef4dffbfd84f1318f6739a3ce19f9d85851857ae648f114332d8401e0949a3d",
      "amount": 2500,
      "timestamp": "2024-01-15T10:35:00Z"
    }
  },
  "message": "Payment confirmed successfully"
}
```

### Error Response (400)

```json
{
  "success": false,
  "code": "AMOUNT_MISMATCH",
  "message": "Amount does not match order total",
  "details": {
    "expectedAmount": 2500,
    "providedAmount": 2000
  }
}
```

### Signature Verification Failed (403)

```json
{
  "success": false,
  "code": "SIGNATURE_VERIFICATION_FAILED",
  "message": "Invalid webhook signature",
  "details": {
    "provider": "razorpay"
  }
}
```

---

## Testing with cURL

### Initiate Payment

```bash
curl -X POST http://localhost:3000/api/payments/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "507f1f77bcf86cd799439011",
    "customerId": "507f1f77bcf86cd799439012",
    "amount": 2500,
    "currency": "INR",
    "method": "COD"
  }'
```

### Confirm COD Payment

```bash
curl -X POST http://localhost:3000/api/payments/confirm \
  -H "Content-Type: application/json" \
  -H "x-admin-id: admin_123" \
  -d '{
    "type": "COD",
    "paymentId": "507f1f77bcf86cd799439013",
    "receiptId": "REC-001-2024",
    "notes": "Cash collected"
  }'
```

### List Payments

```bash
curl -X GET 'http://localhost:3000/api/admin/payments?status=paid&page=1&limit=10' \
  -H "x-admin-id: admin_123"
```

### Initiate Refund

```bash
curl -X POST http://localhost:3000/api/admin/payments/507f1f77bcf86cd799439013/refund \
  -H "Content-Type: application/json" \
  -H "x-admin-id: admin_123" \
  -d '{
    "amount": 2500,
    "reason": "Customer requested full refund"
  }'
```

---

## Webhook Processing Example

### Razorpay Webhook

```typescript
// Simulating webhook from Razorpay
const webhookPayload = {
  event: 'payment.captured',
  payload: {
    payment: {
      entity: 'payment',
      id: 'pay_DBJOWzybf0sJbb',
      amount: 2500,
      currency: 'INR',
      status: 'captured',
      method: 'card',
      order_id: 'order_DBJOWzybf0sJbb',
    },
  },
};

// Calculate signature
const crypto = require('crypto');
const message = JSON.stringify(webhookPayload);
const signature = crypto
  .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
  .update(message)
  .digest('hex');

// Send webhook
const response = await fetch('http://localhost:3000/api/payments/webhook', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-razorpay-signature': signature,
  },
  body: message,
});

console.log(await response.json());
// { success: true, message: 'Webhook processed successfully' }
```

---

## Integration with Order Module

### Timeline Event Structure

```json
{
  "actor": "system|admin_id|gateway",
  "action": "payment.initiated|payment.success|payment.failed|payment.refund.initiated|payment.refund.completed",
  "timestamp": "2024-01-15T10:30:00Z",
  "meta": {
    "paymentId": "507f1f77bcf86cd799439013",
    "method": "COD|ONLINE",
    "provider": "razorpay|stripe",
    "amount": 2500,
    "receiptId": "REC-001-2024",
    "refundAmount": 2500,
    "reason": "Customer requested cancellation",
    "errorCode": "SIGNATURE_VERIFICATION_FAILED",
    "refundTxnId": "rfnd_123"
  }
}
```

### Order Status Update on Payment

```typescript
// When payment is confirmed
const order = await Order.findById(payment.orderId);
order.status = 'confirmed';
order.timeline.push({
  actor: 'system',
  action: 'payment.success',
  timestamp: new Date(),
  meta: {
    paymentId: payment._id.toString(),
    amount: payment.amount,
  },
});
await order.save();

// When payment fails
order.status = 'failed';
order.timeline.push({
  actor: 'system',
  action: 'payment.failed',
  timestamp: new Date(),
  meta: {
    paymentId: payment._id.toString(),
    errorCode: payment.gatewayResponse?.errorCode,
  },
});
await order.save();
```

---

This document provides practical code examples for all major payment operations.
