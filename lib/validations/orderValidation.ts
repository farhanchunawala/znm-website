import { z } from 'zod';

/**
 * Order Item Validation Schema
 * Validates product items in order
 */
export const OrderItemSchema = z.object({
  productId: z.string().regex(/^[0-9a-f]{24}$/, 'Invalid product ID'),
  variantSku: z.string().min(1).max(50, 'SKU too long'),
  qty: z.number().int().min(1).max(1000, 'Invalid quantity'),
  price: z.number().min(0).max(1000000, 'Invalid price'),
  subtotal: z.number().min(0),
  batchId: z.string().optional(),
});

/**
 * Order Totals Validation Schema
 */
export const OrderTotalsSchema = z.object({
  subtotal: z.number().min(0),
  tax: z.number().min(0).default(0),
  discount: z.number().min(0).default(0),
  shipping: z.number().min(0).default(0),
  grandTotal: z.number().min(0),
});

/**
 * Address Snapshot Schema
 */
export const AddressSnapshotSchema = z.object({
  recipientName: z.string().min(2).max(100),
  phoneNumber: z.string().regex(/^[0-9]{10}$/, 'Invalid phone number'),
  streetAddress: z.string().min(5).max(200),
  city: z.string().min(2).max(50),
  state: z.string().min(2).max(50),
  postalCode: z.string().regex(/^[0-9]{6}$/, 'Invalid postal code (6 digits)'),
  country: z.string().default('India'),
  isDefault: z.boolean().optional(),
});

/**
 * Timeline Event Schema
 */
export const TimelineEventSchema = z.object({
  actor: z.enum(['system', 'admin', 'customer']),
  action: z.enum([
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
    'order.note',
  ]),
  timestamp: z.date().default(() => new Date()),
  meta: z.record(z.any()).optional(),
  note: z.string().optional(),
});

/**
 * CREATE ORDER Request Schema
 * Called from checkout - validates cart items and address
 */
export const CreateOrderSchema = z.object({
  customerId: z.string().regex(/^[0-9a-f]{24}$/, 'Invalid customer ID'),
  items: z.array(OrderItemSchema).min(1, 'Order must have at least 1 item'),
  totals: OrderTotalsSchema,
  address: AddressSnapshotSchema,
  paymentMethod: z.enum(['cod', 'card', 'upi', 'wallet']),
  notes: z.string().max(500).optional(),
  tags: z.array(z.string()).optional(),
});

/**
 * UPDATE ORDER STATUS Schema
 * Admin updates order status (pending → confirmed → packed → shipped → delivered)
 */
export const UpdateOrderStatusSchema = z.object({
  orderStatus: z.enum(['pending', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled']),
  reason: z.string().max(200).optional(),
});

/**
 * CANCEL ORDER Schema
 * Releases reserved stock
 */
export const CancelOrderSchema = z.object({
  reason: z.string().min(5).max(300),
  refundInitiated: z.boolean().default(false),
});

/**
 * ATTACH SHIPMENT Schema
 * Links shipmentId and tracking number
 */
export const AttachShipmentSchema = z.object({
  shipmentId: z.string().regex(/^[0-9a-f]{24}$/, 'Invalid shipment ID'),
  trackingNumber: z.string().min(5).max(50),
});

/**
 * PAYMENT SUCCESS Schema
 * Called when payment gateway confirms payment
 */
export const PaymentSuccessSchema = z.object({
  orderId: z.string().regex(/^[0-9a-f]{24}$/, 'Invalid order ID'),
  paymentGatewayRef: z.string().min(5).max(100),
  amount: z.number().min(0),
});

/**
 * ADD TIMELINE NOTE Schema
 */
export const AddTimelineNoteSchema = z.object({
  note: z.string().min(1).max(500),
  actor: z.enum(['admin', 'customer']).default('admin'),
});

/**
 * REFUND REQUEST Schema
 */
export const RefundRequestSchema = z.object({
  reason: z.enum(['customer_request', 'defective_product', 'lost_in_transit', 'wrong_item', 'other']),
  amount: z.number().min(0),
  description: z.string().max(300).optional(),
});

/**
 * ORDER LIST QUERY Schema
 * Filters for admin list page
 */
export const OrderListQuerySchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(10).max(100).default(20),
  orderStatus: z.enum(['pending', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled']).optional(),
  paymentStatus: z.enum(['pending', 'paid', 'failed', 'refunded']).optional(),
  customerId: z.string().regex(/^[0-9a-f]{24}$/).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  searchOrderNumber: z.string().min(1).max(50).optional(),
  tags: z.array(z.string()).optional(),
  isOverdue: z.boolean().optional(),
});

/**
 * ORDER TRACKING Schema
 * Public endpoint - access by orderNumber (no auth required but can filter by email)
 */
export const OrderTrackingQuerySchema = z.object({
  orderNumber: z.string().min(5).max(50),
  email: z.string().email().optional(), // For additional verification
});

/**
 * Order Response Schema
 * Complete order with all details
 */
export const OrderResponseSchema = z.object({
  _id: z.string(),
  orderNumber: z.string(),
  customerId: z.string(),
  items: z.array(OrderItemSchema),
  totals: OrderTotalsSchema,
  paymentStatus: z.enum(['pending', 'paid', 'failed', 'refunded']),
  orderStatus: z.enum(['pending', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled']),
  paymentMethod: z.enum(['cod', 'card', 'upi', 'wallet']).optional(),
  paymentGatewayRef: z.string().optional(),
  address: AddressSnapshotSchema,
  shipmentId: z.string().optional(),
  trackingNumber: z.string().optional(),
  timeline: z.array(TimelineEventSchema),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  totalItems: z.number().optional(),
  daysToShip: z.number().optional(),
  isOverdue: z.boolean().optional(),
});

/**
 * Error Response Schema
 */
export const OrderErrorSchema = z.object({
  error: z.string(),
  code: z.enum([
    'ORDER_NOT_FOUND',
    'INVALID_CUSTOMER',
    'INSUFFICIENT_STOCK',
    'INVALID_PAYMENT_METHOD',
    'PAYMENT_MISMATCH',
    'CANNOT_CANCEL_SHIPPED',
    'STATUS_PROGRESSION_ERROR',
    'DUPLICATE_ORDER_NUMBER',
    'VALIDATION_ERROR',
    'INTERNAL_ERROR',
  ]),
  statusCode: z.number().int(),
  details: z.any().optional(),
});

/**
 * Export types
 */
export type CreateOrderRequest = z.infer<typeof CreateOrderSchema>;
export type UpdateOrderStatusRequest = z.infer<typeof UpdateOrderStatusSchema>;
export type CancelOrderRequest = z.infer<typeof CancelOrderSchema>;
export type AttachShipmentRequest = z.infer<typeof AttachShipmentSchema>;
export type PaymentSuccessRequest = z.infer<typeof PaymentSuccessSchema>;
export type AddTimelineNoteRequest = z.infer<typeof AddTimelineNoteSchema>;
export type RefundRequest = z.infer<typeof RefundRequestSchema>;
export type OrderListQuery = z.infer<typeof OrderListQuerySchema>;
export type OrderTrackingQuery = z.infer<typeof OrderTrackingQuerySchema>;
export type OrderResponse = z.infer<typeof OrderResponseSchema>;
export type OrderError = z.infer<typeof OrderErrorSchema>;
