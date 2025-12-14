import { z } from 'zod';
import { Types } from 'mongoose';

/**
 * INVENTORY VALIDATION SCHEMAS
 * 
 * Zod schemas for type-safe validation of all inventory operations.
 * Each schema is tuned for atomicity and overflow prevention.
 */

// ============================================================================
// SHARED SCHEMAS
// ============================================================================

const ObjectIdSchema = z.custom<Types.ObjectId>((val) => {
  return val instanceof Types.ObjectId || (typeof val === 'string' && Types.ObjectId.isValid(val));
}, { message: 'Invalid ObjectId' });

const SkuSchema = z
  .string()
  .min(3, 'SKU must be at least 3 characters')
  .max(50, 'SKU cannot exceed 50 characters')
  .regex(/^[A-Z0-9-]+$/, 'SKU must be uppercase alphanumeric with hyphens only')
  .transform((val) => val.toUpperCase());

const QuantitySchema = z
  .number()
  .int('Quantity must be an integer')
  .nonnegative('Quantity cannot be negative');

const BatchIdSchema = z
  .string()
  .min(3, 'Batch ID must be at least 3 characters')
  .max(50, 'Batch ID cannot exceed 50 characters')
  .trim();

// ============================================================================
// BATCH SCHEMA
// ============================================================================

export const BatchCreateSchema = z.object({
  batchId: BatchIdSchema,
  qty: QuantitySchema.positive('Batch quantity must be positive'),
  receivedAt: z.date().or(z.string().datetime()).transform((val) => new Date(val)),
  expiry: z
    .date()
    .or(z.string().datetime())
    .transform((val) => new Date(val))
    .optional(),
  location: z.string().max(100).optional().nullable(),
  supplier: z.string().max(100).optional().nullable()
});

export type BatchCreate = z.infer<typeof BatchCreateSchema>;

// ============================================================================
// INVENTORY CREATION SCHEMA
// ============================================================================

export const InventoryCreateSchema = z.object({
  productId: ObjectIdSchema,
  variantSku: SkuSchema,
  stockOnHand: QuantitySchema.default(0),
  lowStockThreshold: QuantitySchema.default(10),
  locationId: z.string().max(50).optional().nullable(),
  batches: z.array(BatchCreateSchema).default([])
});

export type InventoryCreate = z.infer<typeof InventoryCreateSchema>;

// ============================================================================
// INVENTORY UPDATE SCHEMA
// ============================================================================

export const InventoryUpdateSchema = z.object({
  lowStockThreshold: QuantitySchema.optional(),
  locationId: z.string().max(50).optional().nullable()
});

export type InventoryUpdate = z.infer<typeof InventoryUpdateSchema>;

// ============================================================================
// STOCK ADJUSTMENT SCHEMA
// ============================================================================

export const StockAdjustmentSchema = z.object({
  inventoryId: ObjectIdSchema,
  qty: z.number().int('Quantity must be an integer'),
  // qty can be negative (remove stock) or positive (add stock)
  reason: z
    .string()
    .min(5, 'Reason must be at least 5 characters')
    .max(200, 'Reason cannot exceed 200 characters'),
  actor: z.string().min(1, 'Actor ID is required')
});

export type StockAdjustment = z.infer<typeof StockAdjustmentSchema>;

// ============================================================================
// RESERVATION SCHEMA
// ============================================================================

export const ReservationRequestSchema = z.object({
  variantSku: SkuSchema,
  qty: QuantitySchema.positive('Reservation quantity must be positive'),
  orderId: z.string().min(1, 'Order ID is required'),
  actor: z.string().min(1, 'Actor ID is required').default('system')
});

export type ReservationRequest = z.infer<typeof ReservationRequestSchema>;

// ============================================================================
// RELEASE SCHEMA
// ============================================================================

export const ReleaseReservationSchema = z.object({
  inventoryId: ObjectIdSchema,
  qty: QuantitySchema.positive('Release quantity must be positive'),
  orderId: z.string().min(1, 'Order ID is required'),
  actor: z.string().min(1, 'Actor ID is required').default('system')
});

export type ReleaseReservation = z.infer<typeof ReleaseReservationSchema>;

// ============================================================================
// COMMIT SCHEMA (Payment Success)
// ============================================================================

export const CommitReservationSchema = z.object({
  inventoryId: ObjectIdSchema,
  qty: QuantitySchema.positive('Commit quantity must be positive'),
  orderId: z.string().min(1, 'Order ID is required'),
  actor: z.string().min(1, 'Actor ID is required').default('system')
});

export type CommitReservation = z.infer<typeof CommitReservationSchema>;

// ============================================================================
// BATCH OPERATION SCHEMAS
// ============================================================================

export const AddBatchSchema = z.object({
  inventoryId: ObjectIdSchema,
  batch: BatchCreateSchema,
  actor: z.string().min(1, 'Actor ID is required')
});

export type AddBatch = z.infer<typeof AddBatchSchema>;

export const RemoveBatchSchema = z.object({
  inventoryId: ObjectIdSchema,
  batchId: BatchIdSchema,
  qty: QuantitySchema.positive('Batch removal quantity must be positive'),
  actor: z.string().min(1, 'Actor ID is required')
});

export type RemoveBatch = z.infer<typeof RemoveBatchSchema>;

// ============================================================================
// QUERY SCHEMAS
// ============================================================================

export const InventoryFilterSchema = z.object({
  productId: ObjectIdSchema.optional(),
  locationId: z.string().optional(),
  lowStockOnly: z.boolean().default(false),
  skip: QuantitySchema.default(0),
  limit: z.number().int().min(1).max(100).default(20)
});

export type InventoryFilter = z.infer<typeof InventoryFilterSchema>;

export const LowStockReportSchema = z.object({
  skip: QuantitySchema.default(0),
  limit: z.number().int().min(1).max(100).default(50),
  locationId: z.string().optional()
});

export type LowStockReport = z.infer<typeof LowStockReportSchema>;

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

export const InventoryResponseSchema = z.object({
  _id: z.string(),
  productId: z.string(),
  variantSku: SkuSchema,
  stockOnHand: QuantitySchema,
  reserved: QuantitySchema,
  available: QuantitySchema,
  batches: z.array(
    z.object({
      batchId: z.string(),
      qty: QuantitySchema,
      receivedAt: z.date(),
      expiry: z.date().optional(),
      location: z.string().optional(),
      supplier: z.string().optional()
    })
  ),
  lowStockThreshold: QuantitySchema,
  isLowStock: z.boolean(),
  locationId: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export type InventoryResponse = z.infer<typeof InventoryResponseSchema>;

// ============================================================================
// ERROR RESPONSE SCHEMA
// ============================================================================

export const InventoryErrorSchema = z.object({
  code: z.enum([
    'INSUFFICIENT_STOCK',
    'INVALID_QUANTITY',
    'BATCH_NOT_FOUND',
    'INVENTORY_NOT_FOUND',
    'SKU_DUPLICATE',
    'VALIDATION_ERROR',
    'DATABASE_ERROR'
  ]),
  message: z.string(),
  details: z.record(z.any()).optional()
});

export type InventoryError = z.infer<typeof InventoryErrorSchema>;

// ============================================================================
// BULK OPERATION SCHEMAS
// ============================================================================

export const BulkReservationSchema = z.array(
  ReservationRequestSchema.extend({
    variantSku: SkuSchema
  })
);

export type BulkReservation = z.infer<typeof BulkReservationSchema>;

export const BulkReleaseSchema = z.array(ReleaseReservationSchema);

export type BulkRelease = z.infer<typeof BulkReleaseSchema>;
