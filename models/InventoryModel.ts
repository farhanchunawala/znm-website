import mongoose, { Schema, Document } from 'mongoose';

/**
 * INVENTORY MODULE
 * 
 * A reliable, atomic inventory engine handling stock-on-hand, reserved stock,
 * batches, and safe updates tied to orders.
 * 
 * Core Formula:
 *   available = stockOnHand - reserved
 * 
 * Key Features:
 *   • Atomic operations prevent overselling
 *   • Batch/lot tracking with FIFO picking
 *   • Full audit trail for compliance
 *   • Multi-location support (optional)
 */

// ============================================================================
// AUDIT LOG INTERFACE
// ============================================================================

interface AuditEntry {
  action: 'reserve' | 'release' | 'commit' | 'adjust' | 'batch-add' | 'batch-remove';
  qty: number;
  actor: string; // user ID or 'system'
  timestamp: Date;
  metadata?: {
    batchId?: string;
    orderId?: string;
    reason?: string;
    beforeStock?: number;
    afterStock?: number;
  };
}

// ============================================================================
// BATCH INTERFACE
// ============================================================================

interface Batch {
  batchId: string; // unique lot/batch identifier
  qty: number; // quantity in this batch
  receivedAt: Date; // when batch was received
  expiry?: Date; // optional expiration date
  location?: string; // warehouse/shelf location
  supplier?: string; // optional supplier reference
}

// ============================================================================
// INVENTORY DOCUMENT INTERFACE
// ============================================================================

interface IInventory extends Document {
  productId: mongoose.Types.ObjectId;
  variantSku: string; // unique SKU for this variant
  stockOnHand: number; // total physical stock
  reserved: number; // stock reserved by orders
  batches: Batch[]; // lot/batch details (FIFO order)
  lowStockThreshold: number; // alert threshold
  locationId?: string; // optional: warehouse/multi-location tracking
  audit: AuditEntry[]; // complete transaction history
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// SCHEMA DEFINITION
// ============================================================================

const InventorySchema = new Schema<IInventory>(
  {
    // Product Reference
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
      description: 'Reference to parent product'
    },

    // SKU Tracking
    variantSku: {
      type: String,
      required: true,
      unique: true,
      sparse: true,
      trim: true,
      description: 'Unique stock keeping unit identifier'
    },

    // Stock Levels
    stockOnHand: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      description: 'Total physical stock quantity (all batches combined)'
    },

    reserved: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      description: 'Stock reserved by active orders (not yet committed)'
    },

    // Batch/Lot Management (FIFO order preserved)
    batches: [
      {
        batchId: {
          type: String,
          required: true,
          trim: true,
          description: 'Unique lot/batch identifier from supplier'
        },
        qty: {
          type: Number,
          required: true,
          min: 0,
          description: 'Quantity in this batch'
        },
        receivedAt: {
          type: Date,
          required: true,
          description: 'When this batch was received'
        },
        expiry: {
          type: Date,
          default: null,
          description: 'Optional expiration date for perishables'
        },
        location: {
          type: String,
          default: null,
          description: 'Warehouse shelf/bin location'
        },
        supplier: {
          type: String,
          default: null,
          description: 'Supplier or manufacturer reference'
        },
        _id: false // prevent auto-generated _id
      }
    ],

    // Thresholds & Alerts
    lowStockThreshold: {
      type: Number,
      required: true,
      default: 10,
      min: 0,
      description: 'Quantity below which low-stock alerts trigger'
    },

    // Multi-Location Support
    locationId: {
      type: String,
      default: null,
      index: true,
      description: 'Optional warehouse/location identifier'
    },

    // Audit Trail (immutable log)
    audit: [
      {
        action: {
          type: String,
          enum: ['reserve', 'release', 'commit', 'adjust', 'batch-add', 'batch-remove'],
          required: true,
          description: 'Type of inventory transaction'
        },
        qty: {
          type: Number,
          required: true,
          description: 'Quantity affected'
        },
        actor: {
          type: String,
          required: true,
          description: 'User ID or "system" identifier'
        },
        timestamp: {
          type: Date,
          required: true,
          default: Date.now,
          description: 'When action occurred'
        },
        metadata: {
          batchId: String,
          orderId: String,
          reason: String,
          beforeStock: Number,
          afterStock: Number
        },
        _id: false // prevent auto-generated _id
      }
    ]
  },
  {
    timestamps: true,
    collection: 'inventories',
    strict: true
  }
);

// ============================================================================
// VIRTUAL FIELDS
// ============================================================================

InventorySchema.virtual('available').get(function (this: IInventory) {
  return Math.max(0, this.stockOnHand - this.reserved);
});

InventorySchema.virtual('isLowStock').get(function (this: IInventory) {
  return this.available <= this.lowStockThreshold;
});

InventorySchema.virtual('totalBatchQty').get(function (this: IInventory) {
  return this.batches.reduce((sum, batch) => sum + batch.qty, 0);
});

// ============================================================================
// INDEXES
// ============================================================================

// Unique variant SKU for fast lookup
InventorySchema.index({ variantSku: 1 }, { unique: true, sparse: true });

// Product reference for batch queries
InventorySchema.index({ productId: 1 });

// Location-based queries (multi-warehouse)
InventorySchema.index({ productId: 1, locationId: 1 });

// Low stock monitoring
InventorySchema.index({ available: 1, lowStockThreshold: 1 });

// Batch expiry monitoring
InventorySchema.index({ 'batches.expiry': 1 });

// Audit trail queries (for compliance)
InventorySchema.index({ 'audit.timestamp': -1 });

// Search: product + location + status
InventorySchema.index({
  productId: 1,
  locationId: 1,
  available: 1,
  updatedAt: -1
});

// ============================================================================
// METHODS
// ============================================================================

/**
 * Calculate quantity available for sale
 * Used in reservations and API responses
 */
InventorySchema.methods.getAvailable = function (): number {
  return Math.max(0, this.stockOnHand - this.reserved);
};

/**
 * Check if stock is critically low
 */
InventorySchema.methods.checkLowStock = function (): boolean {
  return this.getAvailable() <= this.lowStockThreshold;
};

/**
 * Batch capacity validation
 */
InventorySchema.methods.getTotalBatchQty = function (): number {
  return this.batches.reduce((sum: number, batch: Batch) => sum + batch.qty, 0);
};

/**
 * Find oldest (FIFO) batch
 */
InventorySchema.methods.getOldestBatch = function (): Batch | null {
  if (!this.batches || this.batches.length === 0) return null;
  return this.batches.reduce((oldest: Batch, current: Batch) => {
    return current.receivedAt < oldest.receivedAt ? current : oldest;
  });
};

/**
 * Log audit entry
 */
InventorySchema.methods.addAuditEntry = function (entry: Omit<AuditEntry, 'timestamp'>): void {
  this.audit.push({
    ...entry,
    timestamp: new Date()
  });
};

// ============================================================================
// STATICS
// ============================================================================

/**
 * Get inventory with key information
 */
InventorySchema.statics.findByVariantSku = async function (variantSku: string) {
  return this.findOne({ variantSku }).exec();
};

// ============================================================================
// MODEL EXPORT
// ============================================================================

const InventoryModel = mongoose.models.Inventory || mongoose.model<IInventory>('Inventory', InventorySchema);

export { IInventory, AuditEntry, Batch };
export default InventoryModel;
