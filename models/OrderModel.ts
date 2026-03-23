import mongoose, { Document, Schema, Model } from 'mongoose';

/**
 * Timeline Event Interface
 * Represents a single event in the order's life cycle
 */
export interface ITimelineEvent {
  actor: 'system' | 'admin' | 'customer';
  action:
    | 'order.created'
    | 'order.confirmed'
    | 'order.packed'
    | 'order.shipped'
    | 'order.delivered'
    | 'order.cancelled'
    | 'payment.success'
    | 'payment.failed'
    | 'shipment.created'
    | 'refund.issued'
    | 'return.initiated'
    | 'bill.generated'
    | 'bill.cancelled'
    | 'order.note';
  timestamp: Date;
  meta?: Record<string, any>;
  note?: string;
}

/**
 * Order Item Interface
 * Snapshot of product + variant at order time
 */
export interface IOrderItem {
  productId: mongoose.Types.ObjectId;
  variantSku: string;
  qty: number;
  price: number; // Unit price at time of order (snapshot)
  subtotal: number; // qty * price
  batchId?: string; // Which inventory batch (for FIFO tracking)
}

/**
 * Totals Interface
 * Complete financial breakdown
 */
export interface IOrderTotals {
  subtotal: number;
  tax: number;
  discount: number;
  shipping: number;
  grandTotal: number;
}

/**
 * Address Snapshot Interface
 * Immutable copy of shipping address at order time
 */
export interface IAddressSnapshot {
  recipientName: string;
  phoneNumber: string;
  streetAddress: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault?: boolean;
}

/**
 * Order Document Interface
 */
export interface IOrder extends Document {
  // Identification
  orderNumber: string;
  customerId: mongoose.Types.ObjectId;
  
  // Items & Totals
  items: IOrderItem[];
  totals: IOrderTotals;
  
  // Payment & Order Status
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  orderStatus: 'pending' | 'confirmed' | 'packed' | 'shipped' | 'delivered' | 'cancelled';
  paymentMethod?: 'cod' | 'card' | 'upi' | 'wallet';
  paymentGatewayRef?: string; // External payment ID
  
  // Shipping
  address: IAddressSnapshot;
  shipmentId?: mongoose.Types.ObjectId;
  trackingNumber?: string;
  
  // Metadata
  timeline: ITimelineEvent[];
  notes?: string;
  tags?: string[]; // For segmentation: 'priority', 'high-value', 'problematic'
  
  // Audit
  createdAt: Date;
  updatedAt: Date;
  
  // Virtuals
  daysToShip?: number;
  isOverdue?: boolean;
  totalItems?: number;

  // Methods
  addTimelineEvent(action: ITimelineEvent['action'], actor?: ITimelineEvent['actor'], meta?: Record<string, any>, note?: string): ITimelineEvent;
  getLatestEvent(): ITimelineEvent | null;
  hasEventAction(action: ITimelineEvent['action']): boolean;
}

/**
 * Order Schema
 * Production-grade order management with timeline and atomic operations
 */
const OrderSchema = new Schema<IOrder>(
  {
    orderNumber: {
      type: String,
      unique: true,
      required: true,
      index: true,
      // Format: ORD-2025-00001
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    items: [
      {
        productId: {
          type: Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },
        variantSku: {
          type: String,
          required: true,
        },
        qty: {
          type: Number,
          required: true,
          min: 1,
        },
        price: {
          type: Number,
          required: true,
          min: 0,
        },
        subtotal: {
          type: Number,
          required: true,
          min: 0,
        },
        batchId: {
          type: String,
          default: null,
        },
      },
    ],
    totals: {
      subtotal: { type: Number, required: true, default: 0 },
      tax: { type: Number, required: true, default: 0 },
      discount: { type: Number, required: true, default: 0 },
      shipping: { type: Number, required: true, default: 0 },
      grandTotal: { type: Number, required: true, default: 0 },
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
      index: true,
    },
    orderStatus: {
      type: String,
      enum: ['pending', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ['cod', 'card', 'upi', 'wallet'],
      default: null,
    },
    paymentGatewayRef: {
      type: String,
      default: null,
    },
    address: {
      recipientName: { type: String, required: true },
      phoneNumber: { type: String, required: true },
      streetAddress: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, default: 'India' },
      isDefault: { type: Boolean, default: false },
    },
    shipmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Shipment',
      default: null,
    },
    trackingNumber: {
      type: String,
      default: null,
    },
    timeline: [
      {
        actor: { type: String, enum: ['system', 'admin', 'customer'], required: true },
        action: {
          type: String,
          enum: [
            'order.created',
            'order.confirmed',
            'order.packed',
            'order.shipped',
            'order.delivered',
            'order.cancelled',
            'payment.success',
            'payment.failed',
            'shipment.created',
            'refund.issued',
            'return.initiated',
            'bill.generated',
            'bill.cancelled',
            'order.note',
          ],
          required: true,
        },
        timestamp: { type: Date, default: Date.now, index: true },
        meta: { type: Schema.Types.Mixed, default: {} },
        note: { type: String, default: null },
      },
    ],
    notes: {
      type: String,
      default: null,
    },
    tags: [String],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/**
 * Indexes for optimal query performance
 */
OrderSchema.index({ createdAt: -1 }); // Fast admin list with pagination
OrderSchema.index({ customerId: 1, createdAt: -1 }); // Customer's order history
OrderSchema.index({ orderStatus: 1, updatedAt: -1 }); // Status-based filtering
OrderSchema.index({ paymentStatus: 1, orderStatus: 1 }); // Payment + status combo
OrderSchema.index({ 'timeline.timestamp': -1 }); // Timeline queries
OrderSchema.index({ createdAt: -1, paymentStatus: 1 }, { sparse: true }); // Unpaid orders

/**
 * Virtual: Total items in order
 */
OrderSchema.virtual('totalItems').get(function (this: IOrder) {
  return this.items.reduce((sum, item) => sum + item.qty, 0);
});

/**
 * Virtual: Days since order creation
 */
OrderSchema.virtual('daysToShip').get(function (this: IOrder) {
  if (this.orderStatus === 'shipped' || this.orderStatus === 'delivered') {
    return 0;
  }
  const now = new Date();
  const created = new Date(this.createdAt);
  return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
});

/**
 * Virtual: Is order overdue (not shipped after 7 days)
 */
OrderSchema.virtual('isOverdue').get(function (this: IOrder) {
  if (this.orderStatus === 'shipped' || this.orderStatus === 'delivered' || this.orderStatus === 'cancelled') {
    return false;
  }
  return this.daysToShip! > 7;
});

/**
 * Instance method: Add timeline event (append-only)
 */
OrderSchema.methods.addTimelineEvent = function (
  this: IOrder,
  action: ITimelineEvent['action'],
  actor: ITimelineEvent['actor'] = 'system',
  meta?: Record<string, any>,
  note?: string
): ITimelineEvent {
  const event: ITimelineEvent = {
    actor,
    action,
    timestamp: new Date(),
    meta: meta || {},
    note,
  };
  this.timeline.push(event);
  return event;
};

/**
 * Instance method: Get latest timeline event
 */
OrderSchema.methods.getLatestEvent = function (this: IOrder): ITimelineEvent | null {
  return this.timeline.length > 0 ? this.timeline[this.timeline.length - 1] : null;
};

/**
 * Instance method: Has event action
 */
OrderSchema.methods.hasEventAction = function (this: IOrder, action: ITimelineEvent['action']): boolean {
  return this.timeline.some((event) => event.action === action);
};

/**
 * Pre-save middleware: Validate status progression
 */
OrderSchema.pre('save', async function (next) {
  if (!this.isModified('orderStatus')) return next();

  const doc = this as IOrder;
  const statuses = ['pending', 'confirmed', 'packed', 'shipped', 'delivered'];
  const cancelled = 'cancelled';

  // Cannot move backwards (except to cancelled)
  const originalOrder = await mongoose.model('Order').findById(doc._id);
  if (originalOrder) {
    const currentIndex = statuses.indexOf(originalOrder.orderStatus as any);
    const newIndex = statuses.indexOf(doc.orderStatus as any);

    if (doc.orderStatus !== cancelled && newIndex < currentIndex) {
      throw new Error('Cannot update order status backwards');
    }

    // Cannot cancel if already shipped/delivered
    if (doc.orderStatus === cancelled && (originalOrder.orderStatus === 'shipped' || originalOrder.orderStatus === 'delivered')) {
      throw new Error('Cannot cancel order that is already shipped or delivered');
    }
  }

  next();
});

/**
 * Export model with proper typing
 */
const Order: Model<IOrder> = mongoose.models.Order || mongoose.model<IOrder>('Order', OrderSchema);

export default Order;
