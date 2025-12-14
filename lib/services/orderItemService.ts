import Order, { IOrder, IOrderItem } from '@/models/OrderModel';
import { connectDB } from '@/lib/mongodb';
import { 
  AddOrderItemRequest, 
  UpdateOrderItemRequest, 
  DeleteOrderItemRequest,
  OrderItemErrorCode,
  OrderTotalsRecalc,
} from '@/lib/validations/orderItemValidation';
import mongoose from 'mongoose';

/**
 * ORDER ITEM SERVICE
 * Business logic for managing order items: add, update, delete with inventory sync and totals recalc
 */

interface ItemServiceError extends Error {
  code: OrderItemErrorCode;
  statusCode: number;
  details?: Record<string, any>;
}

function createError(
  code: OrderItemErrorCode,
  message: string,
  statusCode: number = 400,
  details?: Record<string, any>
): ItemServiceError {
  const error = new Error(message) as ItemServiceError;
  error.code = code;
  error.statusCode = statusCode;
  error.details = details;
  return error;
}

/**
 * Fetch variant details from Product collection
 * Returns: { sku, price, options, images, inventoryId, weight }
 */
export async function getVariantDetails(productId: string, variantSku: string) {
  await connectDB();
  
  try {
    const Product = require('@/models/ProductModel').default;
    const product = await Product.findById(productId).lean();
    
    if (!product) {
      throw createError(
        OrderItemErrorCode.PRODUCT_NOT_FOUND,
        `Product ${productId} not found`,
        404
      );
    }

    const variant = product.variants?.find((v: any) => v.sku === variantSku);
    if (!variant || !variant.isActive) {
      throw createError(
        OrderItemErrorCode.VARIANT_NOT_FOUND,
        `Variant ${variantSku} not found or inactive`,
        404
      );
    }

    return {
      sku: variant.sku,
      price: variant.price,
      comparePrice: variant.comparePrice,
      options: variant.options || [],
      images: variant.images || [],
      inventoryId: variant.inventoryId,
      title: product.title,
      weight: product.weight || { value: 0, unit: 'kg' },
    };
  } catch (error: any) {
    if (error.code) throw error;
    throw createError(
      OrderItemErrorCode.PRODUCT_NOT_FOUND,
      'Error fetching product/variant',
      500,
      { originalError: error.message }
    );
  }
}

/**
 * Reserve inventory for an item
 */
export async function reserveInventory(
  variantSku: string,
  qty: number,
  orderId: string
): Promise<string> {
  await connectDB();
  
  try {
    const Inventory = require('@/models/InventoryModel').default;
    const inventory = await Inventory.findOneAndUpdate(
      { variantSku, $expr: { $gte: [{ $subtract: ['$stockOnHand', '$reserved'] }, qty] } },
      {
        $inc: { reserved: qty },
        $push: {
          audit: {
            action: 'reserve',
            qty,
            actor: 'system',
            timestamp: new Date(),
            metadata: { orderId, variantSku },
          },
        },
      },
      { new: true, lean: true }
    );

    if (!inventory) {
      throw createError(
        OrderItemErrorCode.INSUFFICIENT_STOCK,
        `Insufficient stock for variant ${variantSku}. Requested: ${qty}`,
        400
      );
    }

    return inventory._id.toString();
  } catch (error: any) {
    if (error.code) throw error;
    throw createError(
      OrderItemErrorCode.INVENTORY_SYNC_ERROR,
      'Error reserving inventory',
      500,
      { variantSku, qty, originalError: error.message }
    );
  }
}

/**
 * Release inventory reservation (on delete or qty decrease)
 */
export async function releaseInventory(
  variantSku: string,
  qty: number,
  orderId: string
): Promise<void> {
  await connectDB();
  
  try {
    const Inventory = require('@/models/InventoryModel').default;
    await Inventory.findOneAndUpdate(
      { variantSku },
      {
        $inc: { reserved: -qty },
        $push: {
          audit: {
            action: 'release',
            qty,
            actor: 'system',
            timestamp: new Date(),
            metadata: { orderId, variantSku },
          },
        },
      }
    );
  } catch (error: any) {
    console.error('Error releasing inventory:', error);
    throw createError(
      OrderItemErrorCode.INVENTORY_SYNC_ERROR,
      'Error releasing inventory',
      500,
      { variantSku, qty }
    );
  }
}

/**
 * Adjust inventory reservation (when qty changes)
 */
export async function adjustInventory(
  variantSku: string,
  oldQty: number,
  newQty: number,
  orderId: string
): Promise<void> {
  await connectDB();
  
  const delta = newQty - oldQty;
  
  if (delta === 0) return; // No change

  try {
    const Inventory = require('@/models/InventoryModel').default;
    
    if (delta > 0) {
      // Need to reserve more stock
      const inventory = await Inventory.findOne({ variantSku }).lean();
      const available = (inventory?.stockOnHand || 0) - (inventory?.reserved || 0);
      
      if (available < delta) {
        throw createError(
          OrderItemErrorCode.INSUFFICIENT_STOCK,
          `Cannot reserve ${delta} more units. Available: ${available}`,
          400
        );
      }

      await Inventory.findOneAndUpdate(
        { variantSku },
        {
          $inc: { reserved: delta },
          $push: {
            audit: {
              action: 'reserve',
              qty: delta,
              actor: 'system',
              timestamp: new Date(),
              metadata: { orderId, variantSku, reason: 'qty-increase' },
            },
          },
        }
      );
    } else {
      // Release some stock
      await Inventory.findOneAndUpdate(
        { variantSku },
        {
          $inc: { reserved: delta },
          $push: {
            audit: {
              action: 'release',
              qty: -delta,
              actor: 'system',
              timestamp: new Date(),
              metadata: { orderId, variantSku, reason: 'qty-decrease' },
            },
          },
        }
      );
    }
  } catch (error: any) {
    if (error.code) throw error;
    throw createError(
      OrderItemErrorCode.INVENTORY_SYNC_ERROR,
      'Error adjusting inventory',
      500,
      { variantSku, delta }
    );
  }
}

/**
 * Calculate item totals (subtotal, tax, discount)
 */
export function calculateItemTotals(
  qty: number,
  unitPrice: number,
  taxRate: number = 0.18, // Default 18% CGST+SGST for India
  discountAmount: number = 0
) {
  const subtotal = qty * unitPrice;
  const tax = Math.round((subtotal * taxRate) * 100) / 100;
  const total = subtotal + tax - discountAmount;

  return {
    qty,
    unitPrice,
    subtotal: Math.round(subtotal * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    discount: Math.round(discountAmount * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}

/**
 * Recalculate order totals
 */
export async function recalculateOrderTotals(orderId: string): Promise<OrderTotalsRecalc> {
  await connectDB();
  
  try {
    const order = await Order.findById(orderId).lean();
    if (!order) {
      throw createError(
        OrderItemErrorCode.ORDER_NOT_FOUND,
        `Order ${orderId} not found`,
        404
      );
    }

    let subtotal = 0;
    let tax = 0;
    let discount = 0;
    let itemCount = 0;

    for (const item of order.items) {
      const itemSubtotal = (item as any).subtotal || item.qty * item.price;
      const itemTax = (item as any).tax || 0;
      const itemDiscount = (item as any).discount || 0;

      subtotal += itemSubtotal;
      tax += itemTax;
      discount += itemDiscount;
      itemCount += item.qty;
    }

    const shipping = order.totals?.shipping || 0;
    const grandTotal = subtotal + tax - discount + shipping;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      discount: Math.round(discount * 100) / 100,
      shipping,
      grandTotal: Math.round(grandTotal * 100) / 100,
      itemCount,
    };
  } catch (error: any) {
    if (error.code) throw error;
    throw createError(
      OrderItemErrorCode.ORDER_NOT_FOUND,
      'Error recalculating totals',
      500,
      { orderId }
    );
  }
}

/**
 * ADD ITEM TO ORDER
 * Validates variant, reserves stock, adds item snapshot, updates totals, creates timeline event
 */
export async function addOrderItem(
  orderId: string,
  data: AddOrderItemRequest,
  actorId?: string
): Promise<IOrderItem> {
  await connectDB();

  try {
    // Validate order exists and can be modified
    const order = await Order.findById(orderId);
    if (!order) {
      throw createError(
        OrderItemErrorCode.ORDER_NOT_FOUND,
        `Order ${orderId} not found`,
        404
      );
    }

    if (['shipped', 'delivered', 'cancelled'].includes(order.orderStatus)) {
      throw createError(
        OrderItemErrorCode.CANNOT_MODIFY_SHIPPED,
        `Cannot add items to ${order.orderStatus} order`,
        400
      );
    }

    // Fetch variant details
    const variant = await getVariantDetails(data.productId, data.variantSku);

    // Reserve inventory
    const inventoryId = await reserveInventory(
      data.variantSku,
      data.qty,
      orderId
    );

    // Calculate totals
    const unitPrice = data.priceOverride || variant.price;
    const totals = calculateItemTotals(data.qty, unitPrice, 0.18, data.discountOverride || 0);

    // Create item snapshot
    const newItem: IOrderItem = {
      productId: new mongoose.Types.ObjectId(data.productId),
      variantSku: data.variantSku,
      qty: data.qty,
      price: unitPrice,
      subtotal: totals.subtotal,
      batchId: `batch-${Date.now()}`,
    };

    // Add to order
    order.items.push(newItem);

    // Update totals
    const newTotals = await recalculateOrderTotals(orderId);
    order.totals = {
      subtotal: newTotals.subtotal,
      tax: newTotals.tax,
      discount: newTotals.discount,
      shipping: order.totals?.shipping || 0,
      grandTotal: newTotals.grandTotal,
    };

    // Add timeline event
    const timelineEvent = {
      actor: actorId ? 'admin' : 'system' as const,
      action: 'item.added' as const,
      timestamp: new Date(),
      meta: {
        itemId: newItem._id,
        productId: data.productId,
        variantSku: data.variantSku,
        qty: data.qty,
        price: unitPrice,
        note: data.note,
      },
    };
    order.timeline.push(timelineEvent);

    await order.save();
    return newItem;
  } catch (error: any) {
    if (error.code) throw error;
    throw createError(
      OrderItemErrorCode.VALIDATION_ERROR,
      error.message || 'Error adding item',
      500
    );
  }
}

/**
 * UPDATE ORDER ITEM
 * Change qty (adjusts inventory), price override, or variant (if qty available)
 */
export async function updateOrderItem(
  orderId: string,
  itemId: string,
  data: UpdateOrderItemRequest,
  actorId?: string
): Promise<IOrderItem> {
  await connectDB();

  try {
    const order = await Order.findById(orderId);
    if (!order) {
      throw createError(
        OrderItemErrorCode.ORDER_NOT_FOUND,
        `Order ${orderId} not found`,
        404
      );
    }

    if (['shipped', 'delivered', 'cancelled'].includes(order.orderStatus)) {
      throw createError(
        OrderItemErrorCode.CANNOT_MODIFY_SHIPPED,
        `Cannot modify items in ${order.orderStatus} order`,
        400
      );
    }

    const item = order.items.find((i: any) => i._id?.toString() === itemId);
    if (!item) {
      throw createError(
        OrderItemErrorCode.ITEM_NOT_FOUND,
        `Item ${itemId} not found`,
        404
      );
    }

    const changes: Record<string, any> = {};

    // Handle qty change
    if (data.qty !== undefined && data.qty !== item.qty) {
      await adjustInventory(item.variantSku, item.qty, data.qty, orderId);
      item.qty = data.qty;
      changes.qtyFrom = item.qty;
      changes.qtyTo = data.qty;
    }

    // Handle price override
    if (data.priceOverride !== undefined && data.priceOverride !== item.price) {
      changes.priceFrom = item.price;
      changes.priceTo = data.priceOverride;
      item.price = data.priceOverride;
    }

    // Handle variant change
    if (data.variantSku && data.variantSku !== item.variantSku) {
      const newVariant = await getVariantDetails(item.productId.toString(), data.variantSku);
      
      // Release old, reserve new
      await releaseInventory(item.variantSku, item.qty, orderId);
      await reserveInventory(data.variantSku, item.qty, orderId);

      changes.variantFrom = item.variantSku;
      changes.variantTo = data.variantSku;
      item.variantSku = data.variantSku;
      item.price = data.priceOverride || newVariant.price;
    }

    // Recalculate totals
    const newTotals = await recalculateOrderTotals(orderId);
    order.totals = {
      subtotal: newTotals.subtotal,
      tax: newTotals.tax,
      discount: newTotals.discount,
      shipping: order.totals?.shipping || 0,
      grandTotal: newTotals.grandTotal,
    };

    // Add timeline event
    order.timeline.push({
      actor: actorId ? 'admin' : 'system' as const,
      action: 'item.updated' as const,
      timestamp: new Date(),
      meta: {
        itemId,
        changes,
        note: data.note,
      },
    });

    await order.save();
    return item;
  } catch (error: any) {
    if (error.code) throw error;
    throw createError(
      OrderItemErrorCode.VALIDATION_ERROR,
      error.message || 'Error updating item',
      500
    );
  }
}

/**
 * DELETE ORDER ITEM
 * Releases reserved inventory, removes item, recalculates totals
 */
export async function deleteOrderItem(
  orderId: string,
  itemId: string,
  data?: DeleteOrderItemRequest,
  actorId?: string
): Promise<{ success: boolean; itemId: string }> {
  await connectDB();

  try {
    const order = await Order.findById(orderId);
    if (!order) {
      throw createError(
        OrderItemErrorCode.ORDER_NOT_FOUND,
        `Order ${orderId} not found`,
        404
      );
    }

    if (['shipped', 'delivered', 'cancelled'].includes(order.orderStatus)) {
      throw createError(
        OrderItemErrorCode.CANNOT_MODIFY_SHIPPED,
        `Cannot delete items from ${order.orderStatus} order`,
        400
      );
    }

    const itemIndex = order.items.findIndex((i: any) => i._id?.toString() === itemId);
    if (itemIndex === -1) {
      throw createError(
        OrderItemErrorCode.ITEM_NOT_FOUND,
        `Item ${itemId} not found`,
        404
      );
    }

    const item = order.items[itemIndex];

    // Release inventory
    await releaseInventory(item.variantSku, item.qty, orderId);

    // Remove item
    order.items.splice(itemIndex, 1);

    // Recalculate totals
    const newTotals = await recalculateOrderTotals(orderId);
    order.totals = {
      subtotal: newTotals.subtotal,
      tax: newTotals.tax,
      discount: newTotals.discount,
      shipping: order.totals?.shipping || 0,
      grandTotal: newTotals.grandTotal,
    };

    // Add timeline event
    order.timeline.push({
      actor: actorId ? 'admin' : 'system' as const,
      action: 'item.deleted' as const,
      timestamp: new Date(),
      meta: {
        itemId,
        productId: item.productId,
        variantSku: item.variantSku,
        qty: item.qty,
        price: item.price,
        reason: data?.reason || 'not-specified',
        note: data?.note,
      },
    });

    await order.save();
    return { success: true, itemId };
  } catch (error: any) {
    if (error.code) throw error;
    throw createError(
      OrderItemErrorCode.VALIDATION_ERROR,
      error.message || 'Error deleting item',
      500
    );
  }
}

/**
 * LIST ORDER ITEMS
 */
export async function listOrderItems(orderId: string, page = 1, limit = 20) {
  await connectDB();

  try {
    const order = await Order.findById(orderId)
      .select('items totals orderStatus')
      .lean();

    if (!order) {
      throw createError(
        OrderItemErrorCode.ORDER_NOT_FOUND,
        `Order ${orderId} not found`,
        404
      );
    }

    const skip = (page - 1) * limit;
    const items = order.items.slice(skip, skip + limit);
    const total = order.items.length;

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      orderStatus: order.orderStatus,
      totals: order.totals,
    };
  } catch (error: any) {
    if (error.code) throw error;
    throw createError(
      OrderItemErrorCode.ORDER_NOT_FOUND,
      'Error listing items',
      500,
      { orderId }
    );
  }
}

/**
 * GET SINGLE ITEM
 */
export async function getOrderItem(orderId: string, itemId: string) {
  await connectDB();

  try {
    const order = await Order.findById(orderId).lean();
    if (!order) {
      throw createError(
        OrderItemErrorCode.ORDER_NOT_FOUND,
        `Order ${orderId} not found`,
        404
      );
    }

    const item = order.items.find((i: any) => i._id?.toString() === itemId);
    if (!item) {
      throw createError(
        OrderItemErrorCode.ITEM_NOT_FOUND,
        `Item ${itemId} not found`,
        404
      );
    }

    return item;
  } catch (error: any) {
    if (error.code) throw error;
    throw createError(
      OrderItemErrorCode.ITEM_NOT_FOUND,
      'Error fetching item',
      500
    );
  }
}

/**
 * COMMIT RESERVED INVENTORY (on payment success)
 * Called when order is paid - converts reservations to committed stock
 */
export async function commitOrderInventory(orderId: string): Promise<void> {
  await connectDB();

  try {
    const order = await Order.findById(orderId).lean();
    if (!order) {
      throw createError(
        OrderItemErrorCode.ORDER_NOT_FOUND,
        `Order ${orderId} not found`,
        404
      );
    }

    const Inventory = require('@/models/InventoryModel').default;

    // For each item, commit the reservation
    for (const item of order.items) {
      await Inventory.findOneAndUpdate(
        { variantSku: item.variantSku },
        {
          $push: {
            audit: {
              action: 'commit',
              qty: item.qty,
              actor: 'system',
              timestamp: new Date(),
              metadata: {
                orderId: orderId.toString(),
                variantSku: item.variantSku,
              },
            },
          },
        }
      );
    }
  } catch (error: any) {
    console.error('Error committing inventory:', error);
    // Non-blocking error - don't throw
  }
}
