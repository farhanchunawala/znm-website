import mongoose, { Schema, Document } from 'mongoose';

/**
 * Courier Zone Interface
 */
export interface IZone {
  name: string;
  pincodes: string[];
}

/**
 * Weight Slab Interface
 */
export interface IWeightSlab {
  minWeight: number; // in kg
  maxWeight: number;
  price: number;
}

/**
 * Courier Rate Document Interface
 */
export interface ICourierRate extends Document {
  courierName: string; // Delhivery, Shiprocket, Fedex, DTDC, etc.
  zones: IZone[];
  weightSlabs: IWeightSlab[];
  codExtraCharge: number; // percentage or fixed amount
  prepaidDiscount: number; // percentage
  minOrderValue: number; // minimum order value for free shipping
  status: 'active' | 'inactive' | 'archived';
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  archivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Courier Rate Schema
 * Stores pricing rules for different couriers
 */
const ZoneSchema = new Schema<IZone>(
  {
    name: {
      type: String,
      required: true,
      minlength: 1,
      maxlength: 50,
    },
    pincodes: {
      type: [String],
      required: true,
    },
  },
  { _id: false }
);

const WeightSlabSchema = new Schema<IWeightSlab>(
  {
    minWeight: {
      type: Number,
      required: true,
      min: 0,
    },
    maxWeight: {
      type: Number,
      required: true,
      min: 0.1,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const CourierRateSchema = new Schema<ICourierRate>(
  {
    courierName: {
      type: String,
      required: true,
      enum: ['Delhivery', 'Shiprocket', 'Fedex', 'DTDC', 'Ecom', 'BlueDart', 'Other'],
    },
    zones: {
      type: [ZoneSchema],
      required: true,
    },
    weightSlabs: {
      type: [WeightSlabSchema],
      required: true,
    },
    codExtraCharge: {
      type: Number,
      default: 0,
      min: 0,
    },
    prepaidDiscount: {
      type: Number,
      default: 0,
      min: 0,
    },
    minOrderValue: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'archived'],
      default: 'active',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    archivedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Indexes for optimal performance
 */
CourierRateSchema.index({ courierName: 1, status: 1 });
CourierRateSchema.index({ status: 1 });
CourierRateSchema.index({ createdAt: -1 });

export default mongoose.models.CourierRate ||
  mongoose.model<ICourierRate>('CourierRate', CourierRateSchema);
