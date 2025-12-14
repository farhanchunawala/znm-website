import mongoose, { Document, Schema, Model } from 'mongoose';

/**
 * Gateway Request/Response Snapshot
 * Immutable record of what was sent to and received from gateway
 */
export interface IGatewaySnapshot {
  provider: 'razorpay' | 'stripe' | 'manual' | null;
  orderId?: string; // Gateway-assigned order ID
  signature?: string; // Razorpay/Stripe signature for verification
  method?: string; // Payment method used (card, netbanking, etc.)
  amount?: number; // Amount charged (may differ from order total)
  currency?: string; // INR, USD, etc.
  timestamp?: Date;
  requestId?: string; // For tracking with gateway
  errorCode?: string; // If failed: gateway error code
  errorMessage?: string; // If failed: gateway error message
}

/**
 * Payment Document Interface
 * Represents a single payment transaction
 */
export interface IPayment extends Document {
  // Identification & Linking
  orderId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  
  // Amount & Currency
  amount: number; // Must match order.totals.grandTotal
  currency: string; // Default: INR
  
  // Payment Method & Status
  method: 'COD' | 'ONLINE';
  provider: 'razorpay' | 'stripe' | 'manual' | null;
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  
  // Transaction Details
  txnId?: string; // External transaction ID from gateway
  paymentId?: string; // Razorpay payment ID or Stripe payment intent ID
  receiptId?: string; // For COD
  
  // Gateway Snapshots (immutable)
  gatewayRequest?: IGatewaySnapshot; // What we sent/requested
  gatewayResponse?: IGatewaySnapshot; // What gateway returned
  
  // Metadata & Audit
  meta?: {
    ipAddress?: string;
    userAgent?: string;
    deviceType?: 'mobile' | 'desktop' | 'tablet';
    idempotencyKey?: string; // Prevent duplicate processing
    notes?: string;
    adminOverride?: boolean;
    overriddenBy?: mongoose.Types.ObjectId;
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

/**
 * Payment Schema
 */
const PaymentSchema = new Schema<IPayment>(
  {
    // Linking
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Amount
    amount: {
      type: Number,
      required: true,
      min: 0,
      get: (val: number) => Math.round(val * 100) / 100, // 2 decimal places
    },
    currency: {
      type: String,
      default: 'INR',
      enum: ['INR', 'USD', 'EUR', 'GBP'],
    },

    // Payment Method
    method: {
      type: String,
      required: true,
      enum: ['COD', 'ONLINE'],
      index: true,
    },
    provider: {
      type: String,
      enum: ['razorpay', 'stripe', 'manual', null],
      default: null,
      index: true,
    },

    // Status
    status: {
      type: String,
      required: true,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
      index: true,
    },

    // Transaction IDs
    txnId: {
      type: String,
      sparse: true,
      index: true,
      unique: true,
    },
    paymentId: {
      type: String,
      sparse: true,
      index: true,
    },
    receiptId: {
      type: String,
      sparse: true,
      unique: true,
    },

    // Gateway Snapshots
    gatewayRequest: {
      type: {
        provider: String,
        orderId: String,
        method: String,
        amount: Number,
        currency: String,
        timestamp: Date,
        requestId: String,
      },
      _id: false,
    },
    gatewayResponse: {
      type: {
        provider: String,
        signature: String,
        method: String,
        amount: Number,
        currency: String,
        timestamp: Date,
        requestId: String,
        errorCode: String,
        errorMessage: String,
      },
      _id: false,
    },

    // Metadata
    meta: {
      ipAddress: String,
      userAgent: String,
      deviceType: {
        type: String,
        enum: ['mobile', 'desktop', 'tablet'],
      },
      idempotencyKey: {
        type: String,
        sparse: true,
        index: true,
      },
      notes: String,
      adminOverride: { type: Boolean, default: false },
      overriddenBy: Schema.Types.ObjectId,
      overriddenAt: Date,
    },

    // Refunds
    refundStatus: {
      type: String,
      enum: ['none', 'initiated', 'processing', 'completed', 'failed'],
      default: 'none',
    },
    refundAmount: Number,
    refundTxnId: String,
    refundInitiatedAt: Date,
    refundCompletedAt: Date,

    // Status History
    statusHistory: [
      {
        status: {
          type: String,
          enum: ['pending', 'paid', 'failed', 'refunded'],
        },
        changedAt: { type: Date, default: Date.now },
        changedBy: {
          type: String,
          enum: ['system', 'admin', 'gateway'],
        },
        reason: String,
        _id: false,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Compound indexes
PaymentSchema.index({ orderId: 1, status: 1 });
PaymentSchema.index({ customerId: 1, status: 1 });
PaymentSchema.index({ createdAt: 1 });
PaymentSchema.index({ 'meta.idempotencyKey': 1, orderId: 1 });

// Create or get model
const Payment: Model<IPayment> =
  mongoose.models.Payment || mongoose.model('Payment', PaymentSchema);

export default Payment;
