import mongoose, { Document, Schema, Model } from 'mongoose';

/**
 * Customer Snapshot for Biller
 * Immutable copy of customer data at bill creation
 */
export interface IBillerCustomerSnapshot {
  customerId: mongoose.Types.ObjectId;
  name: string;
  phone: string;
  email?: string;
}

/**
 * Order Snapshot for Biller
 * Immutable copy of order data at bill creation
 */
export interface IBillerOrderSnapshot {
  orderId: mongoose.Types.ObjectId;
  orderNumber: string;
  itemCount: number;
  itemsSummary: string; // e.g., "3 items (Shirt, Pants, Shoes)"
  address: string; // Full address on single line for printing
}

/**
 * Audit Log Entry for Biller Actions
 */
export interface IBillerAuditEntry {
  action: 'created' | 'edited' | 'printed' | 'cancelled' | 'regenerated';
  actor: 'system' | 'admin';
  actorId?: mongoose.Types.ObjectId;
  timestamp: Date;
  changes?: Record<string, any>; // What changed in edit action
  reason?: string; // Why cancelled/regenerated
  printCount?: number; // Track print count
}

/**
 * Biller Document Interface
 * Represents a billing slip for warehouse and delivery use
 */
export interface IBiller extends Document {
  // Identification & Linking
  orderId: mongoose.Types.ObjectId;
  paymentId: mongoose.Types.ObjectId;
  
  // Bill Type & Amount
  billType: 'COD' | 'PAID';
  amountToCollect: number; // Only for COD; 0 for PAID
  amountPaid: number; // Only for PAID; tracks what was already paid
  currency: string; // Default: INR
  
  // Snapshots (immutable)
  customerSnapshot: IBillerCustomerSnapshot;
  orderSnapshot: IBillerOrderSnapshot;
  
  // Status & Operations
  status: 'active' | 'cancelled';
  printCount: number; // How many times printed
  lastPrintedAt?: Date;
  
  // Creation Metadata
  createdBy: 'system' | 'admin';
  createdById?: mongoose.Types.ObjectId; // If admin created
  
  // Optional Notes (for manual overrides)
  notes?: string;
  
  // Audit Trail
  auditLog: IBillerAuditEntry[];
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Biller Schema
 * Full CRUD support with audit trail and manual override capabilities
 */
const BillerSchema = new Schema<IBiller>(
  {
    // Identification
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: 'Payment',
      required: true,
    },

    // Bill Type & Amount
    billType: {
      type: String,
      enum: ['COD', 'PAID'],
      required: true,
      index: true,
    },
    amountToCollect: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    amountPaid: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    currency: {
      type: String,
      default: 'INR',
    },

    // Snapshots
    customerSnapshot: {
      customerId: { type: Schema.Types.ObjectId, required: true },
      name: { type: String, required: true },
      phone: { type: String, required: true },
      email: { type: String },
    },
    orderSnapshot: {
      orderId: { type: Schema.Types.ObjectId, required: true },
      orderNumber: { type: String, required: true },
      itemCount: { type: Number, required: true },
      itemsSummary: { type: String, required: true },
      address: { type: String, required: true },
    },

    // Status & Operations
    status: {
      type: String,
      enum: ['active', 'cancelled'],
      default: 'active',
      index: true,
    },
    printCount: {
      type: Number,
      default: 0,
    },
    lastPrintedAt: {
      type: Date,
    },

    // Creation Metadata
    createdBy: {
      type: String,
      enum: ['system', 'admin'],
      required: true,
    },
    createdById: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },

    // Optional Notes
    notes: {
      type: String,
    },

    // Audit Trail
    auditLog: [
      {
        action: {
          type: String,
          enum: ['created', 'edited', 'printed', 'cancelled', 'regenerated'],
          required: true,
        },
        actor: {
          type: String,
          enum: ['system', 'admin'],
          required: true,
        },
        actorId: {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        changes: { type: Schema.Types.Mixed },
        reason: String,
        printCount: Number,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
BillerSchema.index({ orderId: 1, status: 1 }); // Composite: one active bill per order
BillerSchema.index({ paymentId: 1 });
BillerSchema.index({ billType: 1, status: 1 }); // Filter by bill type
BillerSchema.index({ 'customerSnapshot.customerId': 1 }); // Find by customer
BillerSchema.index({ createdAt: -1 }); // Sort by creation date

export const Biller: Model<IBiller> =
  mongoose.models.Biller || mongoose.model('Biller', BillerSchema);

export default Biller;
