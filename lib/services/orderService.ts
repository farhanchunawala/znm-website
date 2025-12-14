import Order, { IOrder, ITimelineEvent } from '@/models/OrderModel';
import { CreateOrderRequest, UpdateOrderStatusRequest, CancelOrderRequest, RefundRequest } from '@/lib/validations/orderValidation';
import { connectDB } from '@/lib/mongodb';

/**
 * ORDER SERVICE
 * Business logic for order management, payment integration, inventory coordination
 */

/**
 * Counter for order number generation
 * Incremented atomically to ensure unique order numbers
 */
let orderCounter = 0;

/**
 * Generate unique order number
 * Format: ORD-YYYY-NNNNN (e.g., ORD-2025-00001)
 */
export async function generateOrderNumber(): Promise<string> {
  await connectDB();
  const year = new Date().getFullYear();
  const count = await Order.countDocuments({ createdAt: { $gte: new Date(`${year}-01-01`) } });
  return `ORD-${year}-${String(count + 1).padStart(5, '0')}`;
}

/**
 * CREATE ORDER
 * Called from checkout - validates items, reserves stock, creates order record
 * 
 * Flow:
 * 1. Validate customer and items exist
 * 2. Reserve stock via inventory service (atomic)
 * 3. Create order with 'order.created' timeline event
 * 4. Return order summary
 * 
 * @param data Order creation request with items, address, totals
 * @returns Created order document
 */
export async function createOrder(data: CreateOrderRequest): Promise<IOrder> {
  await connectDB();

  try {
    // Validate customer exists (would integrate with user service)
    // TODO: Verify customer exists in User collection

    // Validate each item and check inventory
    // TODO: Call inventoryService.reserveStock() for each item
    // This is atomic and will fail if stock insufficient

    // Calculate shipping cost if not provided
    let shippingCost = data.totals.shipping || 0;
    if (!data.totals.shipping && data.address?.pincode) {
      try {
        const courierRateService = require('@/lib/services/courierRateService').default;
        const shippingResult = await courierRateService.calculateShippingCost({
          courierName: data.courierName || 'Delhivery', // Default to Delhivery
          pincode: data.address.pincode,
          weight: calculateOrderWeight(data.items),
          orderValue: data.totals.subtotal,
          paymentMethod: data.paymentMethod === 'cod' ? 'cod' : 'paid',
        });
        shippingCost = shippingResult.totalCost;
      } catch (error) {
        console.warn('Could not calculate shipping cost:', error);
        // Fall back to provided shipping cost or 0
      }
    }

    // Generate order number
    const orderNumber = await generateOrderNumber();

    // Create order document
    const order = new Order({
      orderNumber,
      customerId: data.customerId,
      items: data.items,
      totals: {
        ...data.totals,
        shipping: shippingCost,
        total: (data.totals.subtotal || 0) + shippingCost - (data.totals.discount || 0),
      },
      address: data.address,
      paymentMethod: data.paymentMethod,
      paymentStatus: data.paymentMethod === 'cod' ? 'pending' : 'pending', // COD pays on delivery
      orderStatus: data.paymentMethod === 'cod' ? 'confirmed' : 'pending', // COD auto-confirms
      notes: data.notes,
      tags: data.tags || [],
    });

    // Add initial timeline event
    order.addTimelineEvent('order.created', 'system', {
      paymentMethod: data.paymentMethod,
      totalItems: data.items.length,
      shippingCost: shippingCost,
    });

    // Save order
    await order.save();

    // If COD, auto-add payment.success event
    if (data.paymentMethod === 'cod') {
      order.addTimelineEvent('order.confirmed', 'system', {
        autoConfirmed: true,
        reason: 'COD order auto-confirmed',
      });
      await order.save();
    }

    return order;
  } catch (error: any) {
    throw {
      error: error.message || 'Failed to create order',
      code: 'INTERNAL_ERROR',
      statusCode: 500,
    };
  }
}

/**
 * GET ORDER BY ID
 * Retrieve full order details with timeline
 */
export async function getOrderById(orderId: string): Promise<IOrder | null> {
  await connectDB();
  return Order.findById(orderId).populate('customerId').populate('items.productId');
}

/**
 * GET ORDER BY ORDER NUMBER
 * Customer tracking - search by orderNumber (no auth needed for basic info)
 */
export async function getOrderByOrderNumber(orderNumber: string): Promise<IOrder | null> {
  await connectDB();
  return Order.findOne({ orderNumber }).populate('customerId').populate('items.productId');
}

/**
 * LIST ORDERS (Admin)
 * Paginated list with filters
 * Filters: status, paymentStatus, customerId, date range, search
 */
export async function listOrders(filters: {
  page: number;
  limit: number;
  orderStatus?: string;
  paymentStatus?: string;
  customerId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  searchOrderNumber?: string;
  tags?: string[];
  isOverdue?: boolean;
}): Promise<{ orders: IOrder[]; total: number; pages: number }> {
  await connectDB();

  const query: any = {};

  if (filters.orderStatus) query.orderStatus = filters.orderStatus;
  if (filters.paymentStatus) query.paymentStatus = filters.paymentStatus;
  if (filters.customerId) query.customerId = filters.customerId;
  if (filters.searchOrderNumber) query.orderNumber = new RegExp(filters.searchOrderNumber, 'i');
  if (filters.tags && filters.tags.length > 0) query.tags = { $in: filters.tags };

  if (filters.dateFrom || filters.dateTo) {
    query.createdAt = {};
    if (filters.dateFrom) query.createdAt.$gte = filters.dateFrom;
    if (filters.dateTo) query.createdAt.$lte = filters.dateTo;
  }

  // Handle overdue filter (7+ days not shipped)
  if (filters.isOverdue) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    query.$and = [
      { createdAt: { $lte: sevenDaysAgo } },
      { orderStatus: { $nin: ['shipped', 'delivered', 'cancelled'] } },
    ];
  }

  const total = await Order.countDocuments(query);
  const skip = (filters.page - 1) * filters.limit;

  const orders = await Order.find(query)
    .populate('customerId', 'email name')
    .populate('items.productId', 'title')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(filters.limit);

  return {
    orders,
    total,
    pages: Math.ceil(total / filters.limit),
  };
}

/**
 * UPDATE ORDER STATUS
 * Validates status progression: pending → confirmed → packed → shipped → delivered
 * Cannot move backwards (exception: cancel before shipped)
 */
export async function updateOrderStatus(
  orderId: string,
  data: UpdateOrderStatusRequest
): Promise<IOrder> {
  await connectDB();

  const order = await Order.findById(orderId);
  if (!order) {
    throw {
      error: 'Order not found',
      code: 'ORDER_NOT_FOUND',
      statusCode: 404,
    };
  }

  const statuses = ['pending', 'confirmed', 'packed', 'shipped', 'delivered'];
  const currentIndex = statuses.indexOf(order.orderStatus as any);
  const newIndex = statuses.indexOf(data.orderStatus as any);

  // Validate status progression
  if (data.orderStatus !== 'cancelled') {
    if (newIndex < currentIndex) {
      throw {
        error: 'Cannot update order status backwards',
        code: 'STATUS_PROGRESSION_ERROR',
        statusCode: 400,
      };
    }
  }

  // Prevent cancellation after shipping
  if (data.orderStatus === 'cancelled' && (order.orderStatus === 'shipped' || order.orderStatus === 'delivered')) {
    throw {
      error: 'Cannot cancel order that is already shipped or delivered',
      code: 'CANNOT_CANCEL_SHIPPED',
      statusCode: 400,
    };
  }

  order.orderStatus = data.orderStatus as any;
  order.addTimelineEvent(
    `order.${data.orderStatus}` as any,
    'admin',
    { previousStatus: order.orderStatus },
    data.reason
  );

  await order.save();
  return order;
}

/**
 * CANCEL ORDER
 * Only allowed before shipped
 * Releases reserved stock back to inventory
 */
export async function cancelOrder(orderId: string, data: CancelOrderRequest): Promise<IOrder> {
  await connectDB();

  const order = await Order.findById(orderId);
  if (!order) {
    throw {
      error: 'Order not found',
      code: 'ORDER_NOT_FOUND',
      statusCode: 404,
    };
  }

  // Check if cancellable
  if (order.orderStatus === 'shipped' || order.orderStatus === 'delivered') {
    throw {
      error: 'Cannot cancel order that is already shipped or delivered',
      code: 'CANNOT_CANCEL_SHIPPED',
      statusCode: 400,
    };
  }

  // TODO: Call inventoryService.releaseReservedStock() for each item to free up stock

  order.orderStatus = 'cancelled';
  order.addTimelineEvent('order.cancelled', 'admin', {}, data.reason);

  if (data.refundInitiated) {
    order.paymentStatus = 'refunded';
    order.addTimelineEvent('refund.issued', 'system', { autoInitiated: true });
  }

  await order.save();
  return order;
}

/**
 * MARK PAYMENT SUCCESS
 * Called by payment gateway webhook or manually
 * Commits reserved stock (converts reservation to actual usage)
 */
export async function markPaymentSuccess(
  orderId: string,
  paymentGatewayRef: string,
  amount: number
): Promise<IOrder> {
  await connectDB();

  const order = await Order.findById(orderId);
  if (!order) {
    throw {
      error: 'Order not found',
      code: 'ORDER_NOT_FOUND',
      statusCode: 404,
    };
  }

  // Validate payment amount matches order total
  if (Math.abs(amount - order.totals.grandTotal) > 0.01) {
    throw {
      error: `Payment amount (${amount}) does not match order total (${order.totals.grandTotal})`,
      code: 'PAYMENT_MISMATCH',
      statusCode: 400,
    };
  }

  // TODO: Call inventoryService.commitReservedStock() for each item

  order.paymentStatus = 'paid';
  order.paymentGatewayRef = paymentGatewayRef;

  // Auto-confirm order after payment
  if (order.orderStatus === 'pending') {
    order.orderStatus = 'confirmed';
  }

  order.addTimelineEvent('payment.success', 'system', {
    amount,
    gatewayRef: paymentGatewayRef,
  });

  await order.save();
  return order;
}

/**
 * ATTACH SHIPMENT
 * Link shipmentId and tracking number when order is packed and ready to ship
 */
export async function attachShipment(
  orderId: string,
  shipmentId: string,
  trackingNumber: string
): Promise<IOrder> {
  await connectDB();

  const order = await Order.findById(orderId);
  if (!order) {
    throw {
      error: 'Order not found',
      code: 'ORDER_NOT_FOUND',
      statusCode: 404,
    };
  }

  order.shipmentId = shipmentId as any;
  order.trackingNumber = trackingNumber;
  order.orderStatus = 'shipped';

  order.addTimelineEvent('shipment.created', 'admin', {
    shipmentId,
    trackingNumber,
  });
  order.addTimelineEvent('order.shipped', 'system', {
    automaticFromShipment: true,
  });

  await order.save();
  return order;
}

/**
 * ADD TIMELINE NOTE
 * Admin adds note for customer visibility
 */
export async function addTimelineNote(orderId: string, note: string, actor: 'admin' | 'customer' = 'admin'): Promise<IOrder> {
  await connectDB();

  const order = await Order.findById(orderId);
  if (!order) {
    throw {
      error: 'Order not found',
      code: 'ORDER_NOT_FOUND',
      statusCode: 404,
    };
  }

  order.addTimelineEvent('order.note', actor, {}, note);
  await order.save();
  return order;
}

/**
 * GET TIMELINE FOR ORDER
 * Retrieve timeline entries in reverse chronological order
 */
export async function getOrderTimeline(orderId: string): Promise<ITimelineEvent[]> {
  await connectDB();

  const order = await Order.findById(orderId);
  if (!order) {
    throw {
      error: 'Order not found',
      code: 'ORDER_NOT_FOUND',
      statusCode: 404,
    };
  }

  return order.timeline.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

/**
 * ISSUE REFUND
 * Refund payment for order (partial or full)
 * Updates paymentStatus and adds timeline event
 */
export async function issueRefund(orderId: string, data: RefundRequest): Promise<IOrder> {
  await connectDB();

  const order = await Order.findById(orderId);
  if (!order) {
    throw {
      error: 'Order not found',
      code: 'ORDER_NOT_FOUND',
      statusCode: 404,
    };
  }

  // Validate refund amount doesn't exceed order total
  if (data.amount > order.totals.grandTotal) {
    throw {
      error: `Refund amount (${data.amount}) exceeds order total (${order.totals.grandTotal})`,
      code: 'VALIDATION_ERROR',
      statusCode: 400,
    };
  }

  // Partial refund: refundStatus remains paid; full refund: refundStatus becomes refunded
  if (Math.abs(data.amount - order.totals.grandTotal) < 0.01) {
    order.paymentStatus = 'refunded';
  }

  order.addTimelineEvent('refund.issued', 'admin', {
    reason: data.reason,
    amount: data.amount,
    isPartial: data.amount < order.totals.grandTotal,
  }, data.description);

  await order.save();
  return order;
}

/**
 * GET ORDERS BY CUSTOMER
 * Retrieve all orders for a customer with pagination
 */
export async function getOrdersByCustomer(
  customerId: string,
  page: number = 1,
  limit: number = 10
): Promise<{ orders: IOrder[]; total: number }> {
  await connectDB();

  const query = { customerId };
  const total = await Order.countDocuments(query);
  const skip = (page - 1) * limit;

  const orders = await Order.find(query)
    .populate('items.productId', 'title')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  return { orders, total };
}

/**
 * GET OVERDUE ORDERS
 * Orders not shipped within 7 days
 * Used for automated alerts and follow-ups
 */
export async function getOverdueOrders(): Promise<IOrder[]> {
  await connectDB();

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  return Order.find({
    createdAt: { $lte: sevenDaysAgo },
    orderStatus: { $nin: ['shipped', 'delivered', 'cancelled'] },
  })
    .populate('customerId', 'email name')
    .sort({ createdAt: 1 });
}

/**
 * GET UNPAID ORDERS
 * Orders with pending payment, useful for automated reminder workflows
 */
export async function getUnpaidOrders(minutesOld: number = 30): Promise<IOrder[]> {
  await connectDB();

  const timeThreshold = new Date();
  timeThreshold.setMinutes(timeThreshold.getMinutes() - minutesOld);

  return Order.find({
    paymentStatus: 'pending',
    createdAt: { $lte: timeThreshold },
  })
    .populate('customerId', 'email name')
    .sort({ createdAt: 1 });
}

/**
 * AUTO-CANCEL UNPAID ORDERS
 * Background worker task - cancel orders with pending payment after X minutes
 * Releases reserved stock
 */
export async function autoCancelUnpaidOrders(minutesThreshold: number = 1440): Promise<number> {
  await connectDB();

  const unpaidOrders = await getUnpaidOrders(minutesThreshold);
  let cancelledCount = 0;

  for (const order of unpaidOrders) {
    try {
      await cancelOrder(order._id.toString(), {
        reason: `Auto-cancelled: Payment not received within ${minutesThreshold} minutes`,
        refundInitiated: false,
      });
      cancelledCount++;
    } catch (error) {
      console.error(`Failed to auto-cancel order ${order.orderNumber}:`, error);
    }
  }

  return cancelledCount;
}

/**
 * GET ORDER STATISTICS
 * Dashboard metrics: total orders, revenue, average order value, etc.
 */
export async function getOrderStatistics(dateFrom?: Date, dateTo?: Date): Promise<{
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  ordersShipped: number;
  pendingOrders: number;
  cancelledOrders: number;
}> {
  await connectDB();

  const query: any = {};
  if (dateFrom || dateTo) {
    query.createdAt = {};
    if (dateFrom) query.createdAt.$gte = dateFrom;
    if (dateTo) query.createdAt.$lte = dateTo;
  }

  const orders = await Order.find(query);

  const totalRevenue = orders.reduce((sum, order) => sum + order.totals.grandTotal, 0);
  const ordersShipped = orders.filter((o) => o.orderStatus === 'shipped' || o.orderStatus === 'delivered').length;
  const pendingOrders = orders.filter((o) => o.orderStatus === 'pending').length;
  const cancelledOrders = orders.filter((o) => o.orderStatus === 'cancelled').length;

  return {
    totalOrders: orders.length,
    totalRevenue,
    averageOrderValue: orders.length > 0 ? totalRevenue / orders.length : 0,
    ordersShipped,
    pendingOrders,
    cancelledOrders,
  };
}

/**
 * HELPER: Calculate total weight of order items
 * Used for shipping cost calculation
 */
function calculateOrderWeight(items: any[]): number {
  if (!items || items.length === 0) return 0.5; // Default minimum weight

  return items.reduce((total, item) => {
    const itemWeight = item.weight || 0.5; // Default item weight
    const quantity = item.qty || 1;
    return total + itemWeight * quantity;
  }, 0);
}
