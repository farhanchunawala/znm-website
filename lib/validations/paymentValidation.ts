import { z } from 'zod';

/**
 * Payment Validation Schemas
 * Covers: Payment initiation, confirmation, webhook handling, admin CRUD
 */

// ============= ERROR CODES =============
export const PAYMENT_ERROR_CODES = {
  PAYMENT_NOT_FOUND: 'PAYMENT_NOT_FOUND',
  ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',
  CUSTOMER_NOT_FOUND: 'CUSTOMER_NOT_FOUND',
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  AMOUNT_MISMATCH: 'AMOUNT_MISMATCH',
  INVALID_METHOD: 'INVALID_METHOD',
  INVALID_PROVIDER: 'INVALID_PROVIDER',
  PAYMENT_ALREADY_PAID: 'PAYMENT_ALREADY_PAID',
  PAYMENT_ALREADY_FAILED: 'PAYMENT_ALREADY_FAILED',
  PAYMENT_ALREADY_REFUNDED: 'PAYMENT_ALREADY_REFUNDED',
  CANNOT_MODIFY_PAID_PAYMENT: 'CANNOT_MODIFY_PAID_PAYMENT',
  SIGNATURE_VERIFICATION_FAILED: 'SIGNATURE_VERIFICATION_FAILED',
  DUPLICATE_WEBHOOK: 'DUPLICATE_WEBHOOK',
  GATEWAY_ERROR: 'GATEWAY_ERROR',
  IDEMPOTENCY_KEY_MISMATCH: 'IDEMPOTENCY_KEY_MISMATCH',
  REFUND_NOT_ALLOWED: 'REFUND_NOT_ALLOWED',
  REFUND_ALREADY_INITIATED: 'REFUND_ALREADY_INITIATED',
  INVALID_REFUND_AMOUNT: 'INVALID_REFUND_AMOUNT',
  PROVIDER_NOT_CONFIGURED: 'PROVIDER_NOT_CONFIGURED',
  WEBHOOK_SIGNATURE_MISSING: 'WEBHOOK_SIGNATURE_MISSING',
  INVALID_WEBHOOK_PAYLOAD: 'INVALID_WEBHOOK_PAYLOAD',
};

// ============= BASE SCHEMAS =============

/**
 * Gateway Snapshot Schemas
 */
const GatewaySnapshotSchema = z.object({
  provider: z.enum(['razorpay', 'stripe', 'manual']).nullable(),
  orderId: z.string().optional(),
  signature: z.string().optional(),
  method: z.string().optional(),
  amount: z.number().positive().optional(),
  currency: z.string().optional(),
  timestamp: z.date().optional(),
  requestId: z.string().optional(),
  errorCode: z.string().optional(),
  errorMessage: z.string().optional(),
});

const PaymentMetaSchema = z.object({
  ipAddress: z.string().ip().optional(),
  userAgent: z.string().optional(),
  deviceType: z.enum(['mobile', 'desktop', 'tablet']).optional(),
  idempotencyKey: z.string().uuid().optional(),
  notes: z.string().max(500).optional(),
  adminOverride: z.boolean().default(false),
  overriddenBy: z.string().optional(),
  overriddenAt: z.date().optional(),
});

// ============= PAYMENT INITIATION =============

/**
 * Initiate Payment Request
 * Customer selects payment method during checkout
 */
export const InitiatePaymentSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  customerId: z.string().min(1, 'Customer ID is required'),
  amount: z.number().positive('Amount must be greater than 0'),
  currency: z.string().default('INR'),
  method: z.enum(['COD', 'ONLINE']),
  provider: z.enum(['razorpay', 'stripe', 'manual']).nullable().optional(),
  meta: PaymentMetaSchema.optional(),
});

export type InitiatePaymentRequest = z.infer<typeof InitiatePaymentSchema>;

// ============= PAYMENT CONFIRMATION =============

/**
 * Confirm Payment (Online Gateway)
 * After customer completes gateway payment, confirm with gateway verification
 */
export const ConfirmPaymentSchema = z.object({
  paymentId: z.string().min(1, 'Payment ID is required'),
  orderId: z.string().min(1, 'Order ID is required'),
  txnId: z.string().min(1, 'Transaction ID is required'),
  signature: z.string().min(1, 'Signature is required for verification'),
  meta: PaymentMetaSchema.optional(),
});

export type ConfirmPaymentRequest = z.infer<typeof ConfirmPaymentSchema>;

// ============= PAYMENT FAILURE =============

/**
 * Mark Payment Failed
 * Customer cancels or gateway rejects payment
 */
export const FailPaymentSchema = z.object({
  paymentId: z.string().min(1, 'Payment ID is required'),
  orderId: z.string().min(1, 'Order ID is required'),
  errorCode: z.string().optional(),
  errorMessage: z.string().optional(),
  meta: PaymentMetaSchema.optional(),
});

export type FailPaymentRequest = z.infer<typeof FailPaymentSchema>;

// ============= COD CONFIRMATION =============

/**
 * Confirm COD Payment (Admin Action)
 * Admin confirms cash collected from customer
 */
export const ConfirmCODPaymentSchema = z.object({
  paymentId: z.string().min(1, 'Payment ID is required'),
  receiptId: z.string().optional(),
  confirmedBy: z.string().min(1, 'Admin ID is required'),
  notes: z.string().max(500).optional(),
});

export type ConfirmCODPaymentRequest = z.infer<typeof ConfirmCODPaymentSchema>;

// ============= REFUND REQUEST =============

/**
 * Initiate Refund
 * Admin initiates refund for paid payment
 */
export const InitiateRefundSchema = z.object({
  paymentId: z.string().min(1, 'Payment ID is required'),
  amount: z.number().positive('Refund amount must be greater than 0').optional(),
  reason: z.string().min(10, 'Refund reason must be at least 10 characters'),
  initiatedBy: z.string().min(1, 'Admin ID is required'),
  meta: PaymentMetaSchema.optional(),
});

export type InitiateRefundRequest = z.infer<typeof InitiateRefundSchema>;

// ============= WEBHOOK HANDLING =============

/**
 * Razorpay Webhook Payload
 * Sent by Razorpay when payment status changes
 */
export const RazorpayWebhookSchema = z.object({
  event: z.enum(['payment.authorized', 'payment.failed', 'payment.captured']),
  payload: z.object({
    payment: z.object({
      entity: z.literal('payment'),
      id: z.string(), // pay_xxxxx
      amount: z.number(),
      currency: z.string(),
      status: z.enum(['authorized', 'failed', 'captured']),
      method: z.string(),
      description: z.string().optional(),
      order_id: z.string().optional(), // order_xxxxx
    }),
  }),
});

export type RazorpayWebhookPayload = z.infer<typeof RazorpayWebhookSchema>;

/**
 * Stripe Webhook Payload
 * Sent by Stripe for charge/payment events
 */
export const StripeWebhookSchema = z.object({
  type: z.enum(['charge.succeeded', 'charge.failed', 'charge.refunded']),
  data: z.object({
    object: z.object({
      id: z.string(), // ch_xxxxx
      amount: z.number(),
      currency: z.string(),
      status: z.enum(['succeeded', 'failed']),
      payment_intent: z.string().optional(),
    }),
  }),
});

export type StripeWebhookPayload = z.infer<typeof StripeWebhookSchema>;

/**
 * Webhook Signature Verification
 * Sent with X-Razorpay-Signature or Stripe-Signature header
 */
export const WebhookSignatureSchema = z.object({
  payload: z.string(),
  signature: z.string().min(1, 'Signature is required'),
  timestamp: z.number().optional(),
});

export type WebhookSignature = z.infer<typeof WebhookSignatureSchema>;

// ============= ADMIN CRUD =============

/**
 * Create Payment (Admin Override)
 * Admin manually creates payment record (rare edge case)
 */
export const CreatePaymentAdminSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  customerId: z.string().min(1, 'Customer ID is required'),
  amount: z.number().positive('Amount must be greater than 0'),
  method: z.enum(['COD', 'ONLINE']),
  provider: z.enum(['razorpay', 'stripe', 'manual']).nullable().optional(),
  status: z.enum(['pending', 'paid', 'failed']).default('pending'),
  txnId: z.string().optional(),
  notes: z.string().max(500).optional(),
  createdBy: z.string().min(1, 'Admin ID is required'),
});

export type CreatePaymentAdminRequest = z.infer<typeof CreatePaymentAdminSchema>;

/**
 * Update Payment (Admin)
 * Admin updates payment details (status, amount, etc.)
 */
export const UpdatePaymentAdminSchema = z.object({
  paymentId: z.string().min(1, 'Payment ID is required'),
  amount: z.number().positive('Amount must be greater than 0').optional(),
  status: z.enum(['pending', 'paid', 'failed', 'refunded']).optional(),
  notes: z.string().max(500).optional(),
  updatedBy: z.string().min(1, 'Admin ID is required'),
  reason: z.string().min(10, 'Update reason must be at least 10 characters').optional(),
});

export type UpdatePaymentAdminRequest = z.infer<typeof UpdatePaymentAdminSchema>;

/**
 * Delete Payment (Admin)
 * Only allowed for pending payments
 */
export const DeletePaymentAdminSchema = z.object({
  paymentId: z.string().min(1, 'Payment ID is required'),
  deletedBy: z.string().min(1, 'Admin ID is required'),
  reason: z.string().min(10, 'Deletion reason must be at least 10 characters'),
});

export type DeletePaymentAdminRequest = z.infer<typeof DeletePaymentAdminSchema>;

// ============= LIST & FILTER =============

/**
 * List Payments (Admin)
 * Filter by status, method, provider, date range, etc.
 */
export const ListPaymentsQuerySchema = z.object({
  status: z.enum(['pending', 'paid', 'failed', 'refunded']).optional(),
  method: z.enum(['COD', 'ONLINE']).optional(),
  provider: z.enum(['razorpay', 'stripe', 'manual']).optional(),
  customerId: z.string().optional(),
  orderId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'amount', 'status']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type ListPaymentsQuery = z.infer<typeof ListPaymentsQuerySchema>;

// ============= RESPONSE SCHEMAS =============

/**
 * Payment Response (Safe for client)
 * Excludes sensitive gateway data
 */
export const PaymentResponseSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  customerId: z.string(),
  amount: z.number(),
  currency: z.string(),
  method: z.enum(['COD', 'ONLINE']),
  provider: z.enum(['razorpay', 'stripe', 'manual']).nullable(),
  status: z.enum(['pending', 'paid', 'failed', 'refunded']),
  txnId: z.string().optional(),
  paymentId: z.string().optional(),
  refundStatus: z.enum(['none', 'initiated', 'processing', 'completed', 'failed']),
  refundAmount: z.number().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type PaymentResponse = z.infer<typeof PaymentResponseSchema>;

/**
 * Payment Detail Response (Admin)
 * Includes full details and gateway data
 */
export const PaymentDetailResponseSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  customerId: z.string(),
  amount: z.number(),
  currency: z.string(),
  method: z.enum(['COD', 'ONLINE']),
  provider: z.enum(['razorpay', 'stripe', 'manual']).nullable(),
  status: z.enum(['pending', 'paid', 'failed', 'refunded']),
  txnId: z.string().optional(),
  paymentId: z.string().optional(),
  receiptId: z.string().optional(),
  gatewayRequest: z.record(z.any()).optional(),
  gatewayResponse: z.record(z.any()).optional(),
  refundStatus: z.enum(['none', 'initiated', 'processing', 'completed', 'failed']),
  refundAmount: z.number().optional(),
  refundTxnId: z.string().optional(),
  meta: z.record(z.any()).optional(),
  statusHistory: z.array(z.record(z.any())),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type PaymentDetailResponse = z.infer<typeof PaymentDetailResponseSchema>;

// ============= ERROR RESPONSE =============

export const PaymentErrorResponseSchema = z.object({
  code: z.enum(Object.values(PAYMENT_ERROR_CODES) as any),
  statusCode: z.number(),
  message: z.string(),
  details: z.record(z.any()).optional(),
  timestamp: z.date().default(() => new Date()),
});

export type PaymentErrorResponse = z.infer<typeof PaymentErrorResponseSchema>;
