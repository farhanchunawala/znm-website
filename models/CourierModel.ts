import mongoose, { Schema, Document } from 'mongoose';

export interface ICourierRate extends Document {
  _id: Schema.Types.ObjectId;
  courierId: string; // Unique identifier (e.g., "delhivery", "shiprocket")
  carrierName: string; // Display name (e.g., "Delhivery", "Shiprocket")
  basePrice: number; // Base fare amount
  
  // Weight slab pricing (INR per kg)
  weightSlab: {
    upTo1kg: number;
    upTo5kg: number;
    upTo10kg: number;
    upTo20kg: number;
    additionalPerKg: number; // For weight > 20kg
  };
  
  // Regional multipliers (applied to base price)
  regional: {
    sameState: number; // Multiplier for same state
    otherState: number; // Multiplier for different state
    northeast: number; // Special zone multiplier
  };
  
  // Service type
  serviceType: 'express' | 'standard' | 'economy';
  
  // Coverage
  availablePin: {
    include: string[]; // Specific PIN codes
    exclude: string[]; // Excluded PIN codes
  };
  
  // Status & metadata
  isActive: boolean;
  estimatedDays: {
    min: number;
    max: number;
  };
  
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  lastUpdatedBy?: string;
}

const CourierRateSchema = new mongoose.Schema(
  {
    courierId: {
      type: String,
      unique: true,
      required: true,
      lowercase: true,
      trim: true,
    },
    carrierName: {
      type: String,
      required: true,
    },
    basePrice: {
      type: Number,
      required: true,
      min: 0,
    },
    weightSlab: {
      upTo1kg: {
        type: Number,
        required: true,
        default: 0,
      },
      upTo5kg: {
        type: Number,
        required: true,
        default: 0,
      },
      upTo10kg: {
        type: Number,
        required: true,
        default: 0,
      },
      upTo20kg: {
        type: Number,
        required: true,
        default: 0,
      },
      additionalPerKg: {
        type: Number,
        required: true,
        default: 0,
      },
    },
    regional: {
      sameState: {
        type: Number,
        default: 1.0,
        min: 0.5,
        max: 2.0,
      },
      otherState: {
        type: Number,
        default: 1.2,
        min: 0.8,
        max: 2.5,
      },
      northeast: {
        type: Number,
        default: 1.5,
        min: 1.0,
        max: 3.0,
      },
    },
    serviceType: {
      type: String,
      enum: ['express', 'standard', 'economy'],
      default: 'standard',
    },
    availablePin: {
      include: [{ type: String }],
      exclude: [{ type: String }],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    estimatedDays: {
      min: {
        type: Number,
        default: 1,
      },
      max: {
        type: Number,
        default: 7,
      },
    },
    createdBy: {
      type: String,
    },
    lastUpdatedBy: {
      type: String,
    },
  },
  { timestamps: true }
);

// Indexes for fast lookup
CourierRateSchema.index({ courierId: 1 });
CourierRateSchema.index({ carrierName: 1 });
CourierRateSchema.index({ serviceType: 1 });
CourierRateSchema.index({ isActive: 1 });
CourierRateSchema.index({ 'availablePin.include': 1 });

export default mongoose.models.CourierRate ||
  mongoose.model<ICourierRate>('CourierRate', CourierRateSchema);
