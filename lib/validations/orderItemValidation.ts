import { z } from 'zod';

/**
 * ORDER ITEM VALIDATION SCHEMAS
 * Comprehensive validation for all order item operations
 */

/**
 * Item snapshot at order time - all fields immutable after creation
 */
export const OrderItemSnapshotSchema = z.object({
  productId: z.string().min(1, 'Product ID required'),
  variantSku: z.string().min(1, 'Variant SKU required'),
  titleSnapshot: z.string().min(1, 'Product title required'),
  variantSnapshot: z.object({
    options: z.array(
      z.object({
        name: z.string().min(1),
        value: z.string().min(1),
      })
    ),
    sku: z.string(),
    price: z.number().positive('Price must be positive'),
    images: z.array(z.string()).optional(),
  }),
  qty: z.number().int('Quantity must be integer').min(1, 'Quantity must be at least 1'),
  price: z.number().positive('Unit price must be positive'),
  tax: z.number().min(0, 'Tax cannot be negative'),
  discount: z.number().min(0, 'Discount cannot be negative'),
  weightSnapshot: z.object({
    value: z.number().positive('Weight must be positive').optional(),
    unit: z.enum(['kg', 'g', 'lb', 'oz']).optional(),
  }).optional(),
  inventoryId: z.string().optional(),
  batchId: z.string().optional(),
});

/**
 * Add item to order - validates variant exists and stock available
 */
export const AddOrderItemSchema = z.object({
  productId: z.string().min(1, 'Product ID required'),
  variantSku: z.string().min(1, 'Variant SKU required'),
  qty: z.number().int('Quantity must be integer').min(1, 'Quantity must be at least 1').max(100, 'Max 100 per item'),
  priceOverride: z.number().positive('Override price must be positive').optional(),
  discountOverride: z.number().min(0, 'Discount cannot be negative').optional(),
  note: z.string().max(500, 'Note max 500 characters').optional(),
});

/**
 * Update existing order item - qty, price, or variant
 */
export const UpdateOrderItemSchema = z.object({
  qty: z.number().int('Quantity must be integer').min(1, 'Quantity must be at least 1').max(100, 'Max 100 per item').optional(),
  priceOverride: z.number().positive('Override price must be positive').optional(),
  variantSku: z.string().min(1, 'Variant SKU required').optional(),
  discountOverride: z.number().min(0, 'Discount cannot be negative').optional(),
  note: z.string().max(500, 'Note max 500 characters').optional(),
});

/**
 * Delete order item - with optional reason
 */
export const DeleteOrderItemSchema = z.object({
  reason: z.enum([
    'customer-request',
    'out-of-stock',
    'price-adjustment',
    'mistake',
    'other'
  ]).optional(),
  note: z.string().max(500, 'Note max 500 characters').optional(),
});

/**
 * List order items query
 */
export const ListOrderItemsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'productId', 'qty', 'price']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * Bulk add items (from cart)
 */
export const BulkAddItemsSchema = z.array(AddOrderItemSchema).min(1, 'At least one item required').max(50, 'Max 50 items');

/**
 * Item recalculation response
 */
export const ItemCalculationSchema = z.object({
  qty: z.number().positive(),
  unitPrice: z.number().positive(),
  subtotal: z.number().positive(),
  tax: z.number().min(0),
  discount: z.number().min(0),
  total: z.number().positive(),
});

/**
 * Order totals recalculation
 */
export const OrderTotalsRecalcSchema = z.object({
  subtotal: z.number().min(0),
  tax: z.number().min(0),
  discount: z.number().min(0),
  shipping: z.number().min(0),
  grandTotal: z.number().min(0),
  itemCount: z.number().int().positive(),
});

// TYPE EXPORTS
export type AddOrderItemRequest = z.infer<typeof AddOrderItemSchema>;
export type UpdateOrderItemRequest = z.infer<typeof UpdateOrderItemSchema>;
export type DeleteOrderItemRequest = z.infer<typeof DeleteOrderItemSchema>;
export type BulkAddItemsRequest = z.infer<typeof BulkAddItemsSchema>;
export type OrderItemSnapshot = z.infer<typeof OrderItemSnapshotSchema>;
export type ItemCalculation = z.infer<typeof ItemCalculationSchema>;
export type OrderTotalsRecalc = z.infer<typeof OrderTotalsRecalcSchema>;

/**
 * ERROR CODES
 */
export enum OrderItemErrorCode {
  ITEM_NOT_FOUND = 'ITEM_NOT_FOUND',
  ORDER_NOT_FOUND = 'ORDER_NOT_FOUND',
  PRODUCT_NOT_FOUND = 'PRODUCT_NOT_FOUND',
  VARIANT_NOT_FOUND = 'VARIANT_NOT_FOUND',
  INSUFFICIENT_STOCK = 'INSUFFICIENT_STOCK',
  INVALID_QTY = 'INVALID_QTY',
  CANNOT_MODIFY_SHIPPED = 'CANNOT_MODIFY_SHIPPED',
  VARIANT_INACTIVE = 'VARIANT_INACTIVE',
  PRICE_OVERRIDE_DENIED = 'PRICE_OVERRIDE_DENIED',
  INVENTORY_SYNC_ERROR = 'INVENTORY_SYNC_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
}
