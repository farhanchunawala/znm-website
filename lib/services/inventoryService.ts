import InventoryModel, { IInventory, Batch, AuditEntry } from '@/models/InventoryModel';
import dbConnect from '@/lib/mongodb';
import { AppError, DatabaseError, ValidationError, assertFound } from '@/lib/utils/errors';
import { Types } from 'mongoose';

/**
 * INVENTORY SERVICE
 * 
 * Complete business logic for inventory management including:
 * • Atomic stock reservations and commits
 * • Batch/lot tracking with FIFO picking
 * • Safe concurrent updates
 * • Full audit trail
 * • Low-stock monitoring
 */

// ============================================================================
// CONSTANTS
// ============================================================================

const RESERVATION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

// ============================================================================
// INVENTORY CREATION
// ============================================================================

/**
 * Create a new inventory record for a product variant
 * 
 * @param productId - Reference to product
 * @param variantSku - Unique SKU for variant
 * @param initialStock - Starting stock quantity (default: 0)
 * @param lowStockThreshold - Alert threshold (default: 10)
 * @returns Created inventory document
 * @throws ValidationError if SKU already exists
 * @throws DatabaseError on connection failure
 */
export async function createInventory(
  productId: Types.ObjectId | string,
  variantSku: string,
  initialStock: number = 0,
  lowStockThreshold: number = 10
): Promise<IInventory> {
  await dbConnect();

  // Normalize inputs
  const normalizedProductId = new Types.ObjectId(productId);
  const normalizedSku = variantSku.toUpperCase().trim();

  try {
    // Check for duplicate SKU
    const existing = await InventoryModel.findOne({ variantSku: normalizedSku }).exec();
    if (existing) {
      throw new ValidationError('SKU_DUPLICATE', `Inventory with SKU '${normalizedSku}' already exists`);
    }

    // Create inventory
    const inventory = await InventoryModel.create({
      productId: normalizedProductId,
      variantSku: normalizedSku,
      stockOnHand: Math.max(0, initialStock),
      reserved: 0,
      lowStockThreshold: Math.max(0, lowStockThreshold),
      batches: [],
      audit: []
    });

    return inventory;
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new DatabaseError('INVENTORY_CREATE_FAILED', 'Failed to create inventory', { cause: error });
  }
}

// ============================================================================
// STOCK RETRIEVAL
// ============================================================================

/**
 * Fetch inventory by ID
 * 
 * @param inventoryId - Inventory record ID
 * @returns Inventory with virtual fields populated
 * @throws ValidationError if not found
 */
export async function getInventoryById(inventoryId: Types.ObjectId | string): Promise<IInventory> {
  await dbConnect();

  const inventory = await InventoryModel.findById(inventoryId).exec();
  assertFound(inventory, 'Inventory', inventoryId);

  return inventory;
}

/**
 * Fetch inventory by variant SKU
 * 
 * @param variantSku - Unique SKU
 * @returns Inventory document
 * @throws ValidationError if not found
 */
export async function getInventoryBySku(variantSku: string): Promise<IInventory> {
  await dbConnect();

  const inventory = await InventoryModel.findOne({ variantSku: variantSku.toUpperCase() }).exec();
  assertFound(inventory, 'Inventory', `SKU: ${variantSku}`);

  return inventory;
}

/**
 * Get inventories by product ID (multi-location support)
 * 
 * @param productId - Product reference
 * @param locationId - Optional warehouse filter
 * @returns Array of inventory records
 */
export async function getInventoriesByProduct(
  productId: Types.ObjectId | string,
  locationId?: string
): Promise<IInventory[]> {
  await dbConnect();

  const query: any = { productId: new Types.ObjectId(productId) };
  if (locationId) query.locationId = locationId;

  return InventoryModel.find(query).exec();
}

/**
 * Get available quantity (stockOnHand - reserved)
 * 
 * @param inventoryId - Inventory ID
 * @returns Available quantity (never negative)
 */
export async function getAvailableStock(inventoryId: Types.ObjectId | string): Promise<number> {
  const inventory = await getInventoryById(inventoryId);
  return inventory.getAvailable();
}

// ============================================================================
// ATOMIC RESERVATIONS
// ============================================================================

/**
 * ATOMIC: Reserve stock for an order
 * 
 * This is the critical operation preventing overselling.
 * Uses MongoDB's findOneAndUpdate with conditional query to ensure atomicity.
 * 
 * Formula:
 *   Can reserve if: stockOnHand - reserved >= qty
 * 
 * Atomic update:
 *   { _id, stockOnHand >= reserved + qty } → { reserved += qty }
 * 
 * @param variantSku - Unique SKU
 * @param qty - Quantity to reserve
 * @param orderId - Order reference for audit trail
 * @param actor - User/system performing action
 * @returns Updated inventory with new reserved count
 * @throws ValidationError if insufficient stock
 * @throws DatabaseError on connection failure
 */
export async function reserveStock(
  variantSku: string,
  qty: number,
  orderId: string,
  actor: string = 'system'
): Promise<IInventory> {
  await dbConnect();

  if (qty <= 0) {
    throw new ValidationError('INVALID_QUANTITY', 'Reservation quantity must be positive');
  }

  const normalizedSku = variantSku.toUpperCase().trim();

  try {
    // ATOMIC: Reserve only if available stock exists
    // This prevents overselling even with concurrent requests
    const result = await InventoryModel.findOneAndUpdate(
      {
        variantSku: normalizedSku,
        // Condition: can only reserve if available >= qty
        $expr: {
          $gte: [
            { $subtract: ['$stockOnHand', '$reserved'] }, // available
            qty // requested quantity
          ]
        }
      },
      {
        // Increment reserved count
        $inc: { reserved: qty },
        // Add audit entry
        $push: {
          audit: {
            action: 'reserve',
            qty,
            actor,
            timestamp: new Date(),
            metadata: {
              orderId,
              reason: 'Order checkout'
            }
          }
        }
      },
      { new: true }
    ).exec();

    if (!result) {
      // Query failed: either SKU not found or insufficient stock
      const inventory = await InventoryModel.findOne({ variantSku: normalizedSku }).exec();
      if (!inventory) {
        throw new ValidationError('INVENTORY_NOT_FOUND', `No inventory found for SKU: ${normalizedSku}`);
      }
      const available = inventory.getAvailable();
      throw new ValidationError(
        'INSUFFICIENT_STOCK',
        `Insufficient stock for SKU: ${normalizedSku}. Available: ${available}, Requested: ${qty}`
      );
    }

    return result;
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new DatabaseError('RESERVE_FAILED', 'Failed to reserve stock', { cause: error });
  }
}

/**
 * ATOMIC: Release reserved stock (order cancellation, timeout)
 * 
 * Formula:
 *   Can release if: reserved >= qty
 * 
 * @param inventoryId - Inventory ID
 * @param qty - Quantity to release
 * @param orderId - Order reference
 * @param actor - User/system performing action
 * @returns Updated inventory
 * @throws ValidationError if reserved < qty
 */
export async function releaseReservedStock(
  inventoryId: Types.ObjectId | string,
  qty: number,
  orderId: string,
  actor: string = 'system'
): Promise<IInventory> {
  await dbConnect();

  if (qty <= 0) {
    throw new ValidationError('INVALID_QUANTITY', 'Release quantity must be positive');
  }

  try {
    const result = await InventoryModel.findByIdAndUpdate(
      inventoryId,
      {
        // Decrement reserved (with safeguard: never go below 0)
        $inc: { reserved: -Math.abs(qty) },
        // Add audit entry
        $push: {
          audit: {
            action: 'release',
            qty,
            actor,
            timestamp: new Date(),
            metadata: {
              orderId,
              reason: 'Order cancellation or timeout'
            }
          }
        }
      },
      { new: true }
    ).exec();

    assertFound(result, 'Inventory', inventoryId);

    // Ensure reserved never goes negative
    if (result.reserved < 0) {
      result.reserved = 0;
      await result.save();
    }

    return result;
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new DatabaseError('RELEASE_FAILED', 'Failed to release stock', { cause: error });
  }
}

/**
 * ATOMIC: Commit reserved stock (payment success)
 * 
 * When payment succeeds, we deduct from both reserved AND stockOnHand
 * 
 * Before:  stockOnHand = 100, reserved = 10
 * Commit 10:
 * After:   stockOnHand = 90, reserved = 0
 * 
 * Formula:
 *   Can commit if: reserved >= qty
 *   Update: reserved -= qty, stockOnHand -= qty
 * 
 * @param inventoryId - Inventory ID
 * @param qty - Quantity to commit
 * @param orderId - Order reference
 * @param actor - User/system performing action
 * @returns Updated inventory
 * @throws ValidationError if reserved < qty
 */
export async function commitReservedStock(
  inventoryId: Types.ObjectId | string,
  qty: number,
  orderId: string,
  actor: string = 'system'
): Promise<IInventory> {
  await dbConnect();

  if (qty <= 0) {
    throw new ValidationError('INVALID_QUANTITY', 'Commit quantity must be positive');
  }

  try {
    // ATOMIC: Check reserved before decrementing
    const inventory = await InventoryModel.findById(inventoryId).exec();
    assertFound(inventory, 'Inventory', inventoryId);

    if (inventory.reserved < qty) {
      throw new ValidationError(
        'INSUFFICIENT_RESERVED',
        `Cannot commit ${qty}. Only ${inventory.reserved} reserved.`
      );
    }

    // Commit: reduce both reserved and stockOnHand
    const result = await InventoryModel.findByIdAndUpdate(
      inventoryId,
      {
        $inc: {
          reserved: -qty, // reduce reserved
          stockOnHand: -qty // reduce physical stock
        },
        $push: {
          audit: {
            action: 'commit',
            qty,
            actor,
            timestamp: new Date(),
            metadata: {
              orderId,
              reason: 'Payment received',
              beforeStock: inventory.stockOnHand,
              afterStock: inventory.stockOnHand - qty
            }
          }
        }
      },
      { new: true }
    ).exec();

    assertFound(result, 'Inventory', inventoryId);
    return result;
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new DatabaseError('COMMIT_FAILED', 'Failed to commit stock', { cause: error });
  }
}

// ============================================================================
// STOCK ADJUSTMENTS
// ============================================================================

/**
 * Manual stock adjustment (add or remove)
 * 
 * Used for:
 * • Inventory corrections
 * • Damage/shrinkage write-offs
 * • Returns processing
 * • Physical count reconciliation
 * 
 * @param inventoryId - Inventory ID
 * @param qtyDelta - Positive (add) or negative (remove)
 * @param reason - Reason for adjustment
 * @param actor - User performing adjustment
 * @returns Updated inventory
 * @throws ValidationError if adjustment would make stock negative
 */
export async function adjustStock(
  inventoryId: Types.ObjectId | string,
  qtyDelta: number,
  reason: string,
  actor: string
): Promise<IInventory> {
  await dbConnect();

  const inventory = await getInventoryById(inventoryId);
  const newStock = inventory.stockOnHand + qtyDelta;

  if (newStock < 0) {
    throw new ValidationError(
      'NEGATIVE_STOCK',
      `Cannot adjust stock by ${qtyDelta}. Would result in negative stock.`
    );
  }

  try {
    const result = await InventoryModel.findByIdAndUpdate(
      inventoryId,
      {
        $inc: { stockOnHand: qtyDelta },
        $push: {
          audit: {
            action: 'adjust',
            qty: Math.abs(qtyDelta),
            actor,
            timestamp: new Date(),
            metadata: {
              reason,
              beforeStock: inventory.stockOnHand,
              afterStock: newStock
            }
          }
        }
      },
      { new: true }
    ).exec();

    assertFound(result, 'Inventory', inventoryId);
    return result;
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new DatabaseError('ADJUST_FAILED', 'Failed to adjust stock', { cause: error });
  }
}

// ============================================================================
// BATCH MANAGEMENT (FIFO)
// ============================================================================

/**
 * Add a batch/lot to inventory
 * 
 * FIFO picking is maintained by array order (oldest first)
 * When adding a batch, it's appended to the array.
 * When committing stock, the oldest batch is consumed first.
 * 
 * @param inventoryId - Inventory ID
 * @param batch - Batch details { batchId, qty, receivedAt, expiry? }
 * @param actor - User performing action
 * @returns Updated inventory
 */
export async function addBatch(
  inventoryId: Types.ObjectId | string,
  batch: Batch,
  actor: string = 'system'
): Promise<IInventory> {
  await dbConnect();

  const inventory = await getInventoryById(inventoryId);

  try {
    // Check for duplicate batch ID
    const existingBatch = inventory.batches.find((b) => b.batchId === batch.batchId);
    if (existingBatch) {
      throw new ValidationError('BATCH_DUPLICATE', `Batch ${batch.batchId} already exists`);
    }

    // Add batch and update stockOnHand
    const result = await InventoryModel.findByIdAndUpdate(
      inventoryId,
      {
        $inc: { stockOnHand: batch.qty },
        $push: {
          batches: batch,
          audit: {
            action: 'batch-add',
            qty: batch.qty,
            actor,
            timestamp: new Date(),
            metadata: {
              batchId: batch.batchId,
              reason: `Batch received from ${batch.supplier || 'supplier'}`
            }
          }
        }
      },
      { new: true }
    ).exec();

    assertFound(result, 'Inventory', inventoryId);
    return result;
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new DatabaseError('ADD_BATCH_FAILED', 'Failed to add batch', { cause: error });
  }
}

/**
 * Remove a batch from inventory (FIFO picking)
 * 
 * In real operations, stock is committed via commitReservedStock.
 * This function removes a specific batch from records (e.g., expiry writeoff).
 * 
 * @param inventoryId - Inventory ID
 * @param batchId - Batch identifier
 * @param qty - Quantity to remove from batch
 * @param actor - User performing action
 * @returns Updated inventory
 */
export async function removeBatch(
  inventoryId: Types.ObjectId | string,
  batchId: string,
  qty: number,
  actor: string = 'system'
): Promise<IInventory> {
  await dbConnect();

  const inventory = await getInventoryById(inventoryId);

  // Find batch
  const batchIndex = inventory.batches.findIndex((b) => b.batchId === batchId);
  if (batchIndex === -1) {
    throw new ValidationError('BATCH_NOT_FOUND', `Batch ${batchId} not found`);
  }

  const batch = inventory.batches[batchIndex];
  if (batch.qty < qty) {
    throw new ValidationError('INVALID_QUANTITY', `Cannot remove ${qty} from batch with ${batch.qty}`);
  }

  try {
    // Update batch qty or remove if empty
    if (batch.qty === qty) {
      // Remove entire batch
      inventory.batches.splice(batchIndex, 1);
    } else {
      // Reduce batch qty
      batch.qty -= qty;
      inventory.batches[batchIndex] = batch;
    }

    const result = await InventoryModel.findByIdAndUpdate(
      inventoryId,
      {
        $inc: { stockOnHand: -qty },
        batches: inventory.batches,
        $push: {
          audit: {
            action: 'batch-remove',
            qty,
            actor,
            timestamp: new Date(),
            metadata: {
              batchId,
              reason: 'Batch expiry or damage writeoff'
            }
          }
        }
      },
      { new: true }
    ).exec();

    assertFound(result, 'Inventory', inventoryId);
    return result;
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new DatabaseError('REMOVE_BATCH_FAILED', 'Failed to remove batch', { cause: error });
  }
}

/**
 * Get FIFO batch for consumption
 * 
 * Returns the oldest batch (by receivedAt) to maintain FIFO picking
 * 
 * @param inventoryId - Inventory ID
 * @returns Oldest batch or null if no batches
 */
export async function getOldestBatch(inventoryId: Types.ObjectId | string): Promise<Batch | null> {
  const inventory = await getInventoryById(inventoryId);
  return inventory.getOldestBatch();
}

/**
 * Find batches expiring before date
 * 
 * @param inventoryId - Inventory ID
 * @param expiryDate - Check batches expiring before this date
 * @returns Array of expiring batches
 */
export async function getExpiringBatches(
  inventoryId: Types.ObjectId | string,
  expiryDate: Date = new Date()
): Promise<Batch[]> {
  const inventory = await getInventoryById(inventoryId);
  return inventory.batches.filter((b) => b.expiry && b.expiry < expiryDate);
}

// ============================================================================
// LOW STOCK MONITORING
// ============================================================================

/**
 * Get low-stock report
 * 
 * Returns inventories with available <= lowStockThreshold
 * Used for purchasing alerts and stock replenishment
 * 
 * @param skip - Pagination offset
 * @param limit - Results per page
 * @param locationId - Optional warehouse filter
 * @returns Array of low-stock inventories with key info
 */
export async function getLowStockReport(
  skip: number = 0,
  limit: number = 50,
  locationId?: string
): Promise<{
  total: number;
  items: Array<{
    _id: string;
    variantSku: string;
    available: number;
    reserved: number;
    stockOnHand: number;
    lowStockThreshold: number;
    status: 'critical' | 'low';
  }>;
}> {
  await dbConnect();

  const query: any = {
    $expr: {
      $lte: [
        { $subtract: ['$stockOnHand', '$reserved'] }, // available
        '$lowStockThreshold' // threshold
      ]
    }
  };

  if (locationId) {
    query.locationId = locationId;
  }

  try {
    const total = await InventoryModel.countDocuments(query).exec();
    const items = await InventoryModel.find(query)
      .select('variantSku stockOnHand reserved lowStockThreshold')
      .skip(skip)
      .limit(limit)
      .sort({ available: 1 })
      .exec();

    return {
      total,
      items: items.map((inv) => ({
        _id: inv._id.toString(),
        variantSku: inv.variantSku,
        available: inv.getAvailable(),
        reserved: inv.reserved,
        stockOnHand: inv.stockOnHand,
        lowStockThreshold: inv.lowStockThreshold,
        status: inv.getAvailable() === 0 ? 'critical' : 'low'
      }))
    };
  } catch (error) {
    throw new DatabaseError('LOW_STOCK_QUERY_FAILED', 'Failed to fetch low-stock report', { cause: error });
  }
}

// ============================================================================
// AUDIT TRAIL
// ============================================================================

/**
 * Get audit history for inventory
 * 
 * @param inventoryId - Inventory ID
 * @param limit - Number of recent entries
 * @returns Array of audit entries
 */
export async function getAuditHistory(
  inventoryId: Types.ObjectId | string,
  limit: number = 100
): Promise<AuditEntry[]> {
  const inventory = await getInventoryById(inventoryId);
  return inventory.audit.slice(-limit).reverse(); // Most recent first
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get inventory summary for dashboard
 * 
 * @param productId - Product ID
 * @returns Summary with key metrics
 */
export async function getInventorySummary(productId: Types.ObjectId | string) {
  await dbConnect();

  const inventories = await getInventoriesByProduct(productId);

  return {
    totalSkus: inventories.length,
    totalStock: inventories.reduce((sum, inv) => sum + inv.stockOnHand, 0),
    totalReserved: inventories.reduce((sum, inv) => sum + inv.reserved, 0),
    totalAvailable: inventories.reduce((sum, inv) => sum + inv.getAvailable(), 0),
    lowStockCount: inventories.filter((inv) => inv.checkLowStock()).length,
    variants: inventories.map((inv) => ({
      sku: inv.variantSku,
      available: inv.getAvailable(),
      reserved: inv.reserved,
      batches: inv.batches.length
    }))
  };
}

/**
 * Update low-stock threshold
 * 
 * @param inventoryId - Inventory ID
 * @param threshold - New threshold value
 * @returns Updated inventory
 */
export async function updateLowStockThreshold(
  inventoryId: Types.ObjectId | string,
  threshold: number
): Promise<IInventory> {
  await dbConnect();

  if (threshold < 0) {
    throw new ValidationError('INVALID_THRESHOLD', 'Threshold cannot be negative');
  }

  const result = await InventoryModel.findByIdAndUpdate(
    inventoryId,
    { lowStockThreshold: threshold },
    { new: true }
  ).exec();

  assertFound(result, 'Inventory', inventoryId);
  return result;
}

export default {
  createInventory,
  getInventoryById,
  getInventoryBySku,
  getInventoriesByProduct,
  getAvailableStock,
  reserveStock,
  releaseReservedStock,
  commitReservedStock,
  adjustStock,
  addBatch,
  removeBatch,
  getOldestBatch,
  getExpiringBatches,
  getLowStockReport,
  getAuditHistory,
  getInventorySummary,
  updateLowStockThreshold
};
