import mongoose, { Schema, Document } from 'mongoose';

/**
 * Shipment Document Interface
 * Tracks courier, tracking number, and delivery status for orders
 */
export interface IShipment extends Document {
  orderId: mongoose.Types.ObjectId;
  courierName: string;
  trackingNumber: string;
  trackingUrl: string;
  status: 'created' | 'picked' | 'shipped' | 'delivered' | 'cancelled';
  shippedAt?: Date;
  deliveredAt?: Date;
  createdBy: 'system' | 'admin';
  adminId?: mongoose.Types.ObjectId;
  meta?: {
    notes?: string;
    carrierCode?: string;
    weight?: number;
    estimatedDelivery?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Shipment Schema
 */
const ShipmentSchema = new Schema<IShipment>(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    courierName: {
      type: String,
      required: true,
      enum: ['Delhivery', 'Shiprocket', 'Fedex', 'DTDC', 'Ecom', 'BlueDart', 'Other'],
    },
    trackingNumber: {
      type: String,
      default: '',
    },
    trackingUrl: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['created', 'picked', 'shipped', 'delivered', 'cancelled'],
      default: 'created',
    },
    shippedAt: {
      type: Date,
      default: null,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: String,
      enum: ['system', 'admin'],
      default: 'system',
    },
    adminId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    meta: {
      notes: String,
      carrierCode: String,
      weight: Number,
      estimatedDelivery: Date,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Indexes for optimal performance
 */
ShipmentSchema.index({ orderId: 1 });
ShipmentSchema.index({ trackingNumber: 1 });
ShipmentSchema.index({ status: 1 });
ShipmentSchema.index({ createdAt: -1 });
ShipmentSchema.index({ orderId: 1, status: 1 });

export default mongoose.models.Shipment ||
  mongoose.model<IShipment>('Shipment', ShipmentSchema);
