import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import InventoryModel from '@/models/InventoryModel';
import inventoryService from '@/lib/services/inventoryService';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await InventoryModel.deleteMany({});
});

describe('inventoryService', () => {
  // ========================================================================
  // INVENTORY CREATION
  // ========================================================================

  describe('createInventory', () => {
    it('should create inventory with valid SKU', async () => {
      const productId = new mongoose.Types.ObjectId();
      const inventory = await inventoryService.createInventory(productId, 'SKU-001', 50, 10);

      expect(inventory.variantSku).toBe('SKU-001');
      expect(inventory.stockOnHand).toBe(50);
      expect(inventory.reserved).toBe(0);
      expect(inventory.lowStockThreshold).toBe(10);
    });

    it('should reject duplicate SKU', async () => {
      const productId = new mongoose.Types.ObjectId();
      await inventoryService.createInventory(productId, 'SKU-001');

      await expect(
        inventoryService.createInventory(productId, 'SKU-001')
      ).rejects.toThrow('already exists');
    });

    it('should default stockOnHand to 0', async () => {
      const productId = new mongoose.Types.ObjectId();
      const inventory = await inventoryService.createInventory(productId, 'SKU-002');

      expect(inventory.stockOnHand).toBe(0);
      expect(inventory.reserved).toBe(0);
    });

    it('should normalize SKU to uppercase', async () => {
      const productId = new mongoose.Types.ObjectId();
      const inventory = await inventoryService.createInventory(productId, 'sku-lowercase');

      expect(inventory.variantSku).toBe('SKU-LOWERCASE');
    });
  });

  // ========================================================================
  // STOCK RETRIEVAL
  // ========================================================================

  describe('getInventoryById', () => {
    it('should fetch inventory by ID', async () => {
      const productId = new mongoose.Types.ObjectId();
      const created = await inventoryService.createInventory(productId, 'SKU-001', 50);

      const fetched = await inventoryService.getInventoryById(created._id);
      expect(fetched.variantSku).toBe('SKU-001');
      expect(fetched.stockOnHand).toBe(50);
    });

    it('should throw on non-existent ID', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await expect(inventoryService.getInventoryById(fakeId)).rejects.toThrow();
    });
  });

  describe('getInventoryBySku', () => {
    it('should fetch inventory by SKU', async () => {
      const productId = new mongoose.Types.ObjectId();
      await inventoryService.createInventory(productId, 'SKU-001', 50);

      const fetched = await inventoryService.getInventoryBySku('SKU-001');
      expect(fetched.variantSku).toBe('SKU-001');
      expect(fetched.stockOnHand).toBe(50);
    });

    it('should be case-insensitive', async () => {
      const productId = new mongoose.Types.ObjectId();
      await inventoryService.createInventory(productId, 'SKU-001', 50);

      const fetched = await inventoryService.getInventoryBySku('sku-001');
      expect(fetched.variantSku).toBe('SKU-001');
    });
  });

  describe('getInventoriesByProduct', () => {
    it('should return all inventories for product', async () => {
      const productId = new mongoose.Types.ObjectId();
      await inventoryService.createInventory(productId, 'SKU-001', 50);
      await inventoryService.createInventory(productId, 'SKU-002', 30);

      const inventories = await inventoryService.getInventoriesByProduct(productId);
      expect(inventories).toHaveLength(2);
    });

    it('should filter by location', async () => {
      const productId = new mongoose.Types.ObjectId();
      const inv1 = await inventoryService.createInventory(productId, 'SKU-001', 50);
      inv1.locationId = 'warehouse-a';
      await inv1.save();

      const inv2 = await inventoryService.createInventory(productId, 'SKU-002', 30);
      inv2.locationId = 'warehouse-b';
      await inv2.save();

      const results = await inventoryService.getInventoriesByProduct(productId, 'warehouse-a');
      expect(results).toHaveLength(1);
      expect(results[0].variantSku).toBe('SKU-001');
    });
  });

  describe('getAvailableStock', () => {
    it('should return available = stockOnHand - reserved', async () => {
      const productId = new mongoose.Types.ObjectId();
      const inventory = await inventoryService.createInventory(productId, 'SKU-001', 100);
      inventory.reserved = 30;
      await inventory.save();

      const available = await inventoryService.getAvailableStock(inventory._id);
      expect(available).toBe(70);
    });

    it('should never return negative available', async () => {
      const productId = new mongoose.Types.ObjectId();
      const inventory = await inventoryService.createInventory(productId, 'SKU-001', 50);
      inventory.reserved = 100; // Manually set (shouldn't happen in production)
      await inventory.save();

      const available = await inventoryService.getAvailableStock(inventory._id);
      expect(available).toBe(0);
    });
  });

  // ========================================================================
  // ATOMIC RESERVATIONS
  // ========================================================================

  describe('reserveStock (ATOMIC)', () => {
    it('should reserve stock when available', async () => {
      const productId = new mongoose.Types.ObjectId();
      await inventoryService.createInventory(productId, 'SKU-001', 100);

      const result = await inventoryService.reserveStock('SKU-001', 30, 'order-123');

      expect(result.reserved).toBe(30);
      expect(result.stockOnHand).toBe(100); // stock unchanged
      expect(result.getAvailable()).toBe(70);
    });

    it('should fail if qty > available', async () => {
      const productId = new mongoose.Types.ObjectId();
      await inventoryService.createInventory(productId, 'SKU-001', 50);

      await expect(
        inventoryService.reserveStock('SKU-001', 60, 'order-123')
      ).rejects.toThrow('INSUFFICIENT_STOCK');
    });

    it('should fail if qty exceeds remaining available', async () => {
      const productId = new mongoose.Types.ObjectId();
      const inventory = await inventoryService.createInventory(productId, 'SKU-001', 100);
      await inventoryService.reserveStock('SKU-001', 70, 'order-1');

      await expect(
        inventoryService.reserveStock('SKU-001', 40, 'order-2')
      ).rejects.toThrow('INSUFFICIENT_STOCK');
    });

    it('should log audit entry on reserve', async () => {
      const productId = new mongoose.Types.ObjectId();
      await inventoryService.createInventory(productId, 'SKU-001', 100);

      const result = await inventoryService.reserveStock('SKU-001', 30, 'order-123', 'user-1');

      expect(result.audit).toHaveLength(1);
      expect(result.audit[0].action).toBe('reserve');
      expect(result.audit[0].qty).toBe(30);
      expect(result.audit[0].metadata?.orderId).toBe('order-123');
    });

    it('should handle exact available match', async () => {
      const productId = new mongoose.Types.ObjectId();
      await inventoryService.createInventory(productId, 'SKU-001', 50);

      const result = await inventoryService.reserveStock('SKU-001', 50, 'order-123');

      expect(result.getAvailable()).toBe(0);
      expect(result.reserved).toBe(50);
    });
  });

  // ========================================================================
  // RELEASE & COMMIT
  // ========================================================================

  describe('releaseReservedStock', () => {
    it('should release reserved stock', async () => {
      const productId = new mongoose.Types.ObjectId();
      const inv = await inventoryService.createInventory(productId, 'SKU-001', 100);
      await inventoryService.reserveStock('SKU-001', 30, 'order-123');

      const result = await inventoryService.releaseReservedStock(inv._id, 30, 'order-123');

      expect(result.reserved).toBe(0);
      expect(result.getAvailable()).toBe(100);
    });

    it('should log audit entry on release', async () => {
      const productId = new mongoose.Types.ObjectId();
      const inv = await inventoryService.createInventory(productId, 'SKU-001', 100);
      await inventoryService.reserveStock('SKU-001', 30, 'order-123');

      const result = await inventoryService.releaseReservedStock(inv._id, 30, 'order-123', 'user-1');

      const releaseEntry = result.audit.find((a) => a.action === 'release');
      expect(releaseEntry).toBeDefined();
      expect(releaseEntry?.qty).toBe(30);
    });

    it('should prevent negative reserved', async () => {
      const productId = new mongoose.Types.ObjectId();
      const inv = await inventoryService.createInventory(productId, 'SKU-001', 100);

      await inventoryService.releaseReservedStock(inv._id, 50, 'order-123');

      const updated = await inventoryService.getInventoryById(inv._id);
      expect(updated.reserved).toBeGreaterThanOrEqual(0);
    });
  });

  describe('commitReservedStock', () => {
    it('should commit reserved stock (reduce both reserved and stockOnHand)', async () => {
      const productId = new mongoose.Types.ObjectId();
      const inv = await inventoryService.createInventory(productId, 'SKU-001', 100);
      await inventoryService.reserveStock('SKU-001', 30, 'order-123');

      const result = await inventoryService.commitReservedStock(inv._id, 30, 'order-123');

      expect(result.reserved).toBe(0);
      expect(result.stockOnHand).toBe(70); // Reduced!
      expect(result.getAvailable()).toBe(70);
    });

    it('should fail if reserved < qty', async () => {
      const productId = new mongoose.Types.ObjectId();
      const inv = await inventoryService.createInventory(productId, 'SKU-001', 100);
      await inventoryService.reserveStock('SKU-001', 20, 'order-123');

      await expect(
        inventoryService.commitReservedStock(inv._id, 30, 'order-123')
      ).rejects.toThrow('Cannot commit');
    });

    it('should log audit entry with metadata', async () => {
      const productId = new mongoose.Types.ObjectId();
      const inv = await inventoryService.createInventory(productId, 'SKU-001', 100);
      await inventoryService.reserveStock('SKU-001', 30, 'order-123');

      const result = await inventoryService.commitReservedStock(inv._id, 30, 'order-123', 'user-1');

      const commitEntry = result.audit.find((a) => a.action === 'commit');
      expect(commitEntry).toBeDefined();
      expect(commitEntry?.metadata?.beforeStock).toBe(100);
      expect(commitEntry?.metadata?.afterStock).toBe(70);
    });
  });

  // ========================================================================
  // STOCK ADJUSTMENTS
  // ========================================================================

  describe('adjustStock', () => {
    it('should add stock (positive delta)', async () => {
      const productId = new mongoose.Types.ObjectId();
      const inv = await inventoryService.createInventory(productId, 'SKU-001', 50);

      const result = await inventoryService.adjustStock(inv._id, 30, 'Return received', 'user-1');

      expect(result.stockOnHand).toBe(80);
    });

    it('should remove stock (negative delta)', async () => {
      const productId = new mongoose.Types.ObjectId();
      const inv = await inventoryService.createInventory(productId, 'SKU-001', 100);

      const result = await inventoryService.adjustStock(inv._id, -20, 'Damage writeoff', 'user-1');

      expect(result.stockOnHand).toBe(80);
    });

    it('should prevent negative stock', async () => {
      const productId = new mongoose.Types.ObjectId();
      const inv = await inventoryService.createInventory(productId, 'SKU-001', 30);

      await expect(
        inventoryService.adjustStock(inv._id, -50, 'Invalid adjustment', 'user-1')
      ).rejects.toThrow('NEGATIVE_STOCK');
    });

    it('should log reason in audit', async () => {
      const productId = new mongoose.Types.ObjectId();
      const inv = await inventoryService.createInventory(productId, 'SKU-001', 50);

      const result = await inventoryService.adjustStock(inv._id, 20, 'Recount adjustment', 'user-1');

      expect(result.audit[0].action).toBe('adjust');
      expect(result.audit[0].metadata?.reason).toBe('Recount adjustment');
    });
  });

  // ========================================================================
  // BATCH MANAGEMENT
  // ========================================================================

  describe('addBatch', () => {
    it('should add batch and increase stock', async () => {
      const productId = new mongoose.Types.ObjectId();
      const inv = await inventoryService.createInventory(productId, 'SKU-001', 50);

      const result = await inventoryService.addBatch(inv._id, {
        batchId: 'BATCH-001',
        qty: 30,
        receivedAt: new Date(),
        supplier: 'Supplier A'
      });

      expect(result.stockOnHand).toBe(80);
      expect(result.batches).toHaveLength(1);
      expect(result.batches[0].batchId).toBe('BATCH-001');
    });

    it('should reject duplicate batch ID', async () => {
      const productId = new mongoose.Types.ObjectId();
      const inv = await inventoryService.createInventory(productId, 'SKU-001', 50);

      await inventoryService.addBatch(inv._id, {
        batchId: 'BATCH-001',
        qty: 30,
        receivedAt: new Date()
      });

      await expect(
        inventoryService.addBatch(inv._id, {
          batchId: 'BATCH-001',
          qty: 20,
          receivedAt: new Date()
        })
      ).rejects.toThrow('BATCH_DUPLICATE');
    });

    it('should preserve FIFO order', async () => {
      const productId = new mongoose.Types.ObjectId();
      const inv = await inventoryService.createInventory(productId, 'SKU-001', 0);

      const date1 = new Date('2025-01-01');
      const date2 = new Date('2025-01-02');

      await inventoryService.addBatch(inv._id, {
        batchId: 'BATCH-001',
        qty: 50,
        receivedAt: date1
      });

      await inventoryService.addBatch(inv._id, {
        batchId: 'BATCH-002',
        qty: 50,
        receivedAt: date2
      });

      const oldest = await inventoryService.getOldestBatch(inv._id);
      expect(oldest?.batchId).toBe('BATCH-001');
    });
  });

  describe('removeBatch', () => {
    it('should remove batch and decrease stock', async () => {
      const productId = new mongoose.Types.ObjectId();
      const inv = await inventoryService.createInventory(productId, 'SKU-001', 100);

      await inventoryService.addBatch(inv._id, {
        batchId: 'BATCH-001',
        qty: 50,
        receivedAt: new Date()
      });

      const result = await inventoryService.removeBatch(inv._id, 'BATCH-001', 30);

      expect(result.stockOnHand).toBe(120); // 100 + 50 - 30
      expect(result.batches[0].qty).toBe(20);
    });

    it('should delete batch if qty == 0', async () => {
      const productId = new mongoose.Types.ObjectId();
      const inv = await inventoryService.createInventory(productId, 'SKU-001', 100);

      await inventoryService.addBatch(inv._id, {
        batchId: 'BATCH-001',
        qty: 30,
        receivedAt: new Date()
      });

      const result = await inventoryService.removeBatch(inv._id, 'BATCH-001', 30);

      expect(result.batches).toHaveLength(0);
    });

    it('should fail if removing more than batch qty', async () => {
      const productId = new mongoose.Types.ObjectId();
      const inv = await inventoryService.createInventory(productId, 'SKU-001', 100);

      await inventoryService.addBatch(inv._id, {
        batchId: 'BATCH-001',
        qty: 20,
        receivedAt: new Date()
      });

      await expect(
        inventoryService.removeBatch(inv._id, 'BATCH-001', 30)
      ).rejects.toThrow('Cannot remove');
    });
  });

  describe('getExpiringBatches', () => {
    it('should return batches expiring before date', async () => {
      const productId = new mongoose.Types.ObjectId();
      const inv = await inventoryService.createInventory(productId, 'SKU-001', 0);

      const now = new Date();
      const future = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000); // 60 days

      await inventoryService.addBatch(inv._id, {
        batchId: 'BATCH-001',
        qty: 50,
        receivedAt: new Date(),
        expiry: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000) // 10 days
      });

      await inventoryService.addBatch(inv._id, {
        batchId: 'BATCH-002',
        qty: 50,
        receivedAt: new Date(),
        expiry: future // 60 days
      });

      const expiring = await inventoryService.getExpiringBatches(inv._id, new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)); // 30 days

      expect(expiring).toHaveLength(1);
      expect(expiring[0].batchId).toBe('BATCH-001');
    });
  });

  // ========================================================================
  // LOW STOCK MONITORING
  // ========================================================================

  describe('getLowStockReport', () => {
    it('should return items with available <= threshold', async () => {
      const productId = new mongoose.Types.ObjectId();

      await inventoryService.createInventory(productId, 'SKU-001', 100, 10); // Normal
      await inventoryService.createInventory(productId, 'SKU-002', 8, 10); // Low
      await inventoryService.createInventory(productId, 'SKU-003', 0, 10); // Critical

      const report = await inventoryService.getLowStockReport(0, 10);

      expect(report.total).toBe(2); // SKU-002 and SKU-003
      expect(report.items.map((i) => i.variantSku)).toContain('SKU-002');
      expect(report.items.map((i) => i.variantSku)).toContain('SKU-003');
    });

    it('should support pagination', async () => {
      const productId = new mongoose.Types.ObjectId();

      for (let i = 1; i <= 15; i++) {
        await inventoryService.createInventory(productId, `SKU-${i}`, 5, 10);
      }

      const page1 = await inventoryService.getLowStockReport(0, 10);
      const page2 = await inventoryService.getLowStockReport(10, 10);

      expect(page1.items).toHaveLength(10);
      expect(page2.items).toHaveLength(5);
    });

    it('should mark critical vs low status', async () => {
      const productId = new mongoose.Types.ObjectId();

      await inventoryService.createInventory(productId, 'SKU-001', 0, 10); // Critical
      await inventoryService.createInventory(productId, 'SKU-002', 5, 10); // Low

      const report = await inventoryService.getLowStockReport(0, 10);

      const critical = report.items.find((i) => i.variantSku === 'SKU-001');
      const low = report.items.find((i) => i.variantSku === 'SKU-002');

      expect(critical?.status).toBe('critical');
      expect(low?.status).toBe('low');
    });
  });

  // ========================================================================
  // AUDIT TRAIL
  // ========================================================================

  describe('getAuditHistory', () => {
    it('should return audit entries in reverse chronological order', async () => {
      const productId = new mongoose.Types.ObjectId();
      const inv = await inventoryService.createInventory(productId, 'SKU-001', 100);

      await inventoryService.reserveStock('SKU-001', 30, 'order-1');
      await inventoryService.adjustStock(inv._id, 20, 'Adjustment', 'user-1');

      const history = await inventoryService.getAuditHistory(inv._id);

      expect(history.length).toBeGreaterThan(0);
      expect(history[0].action).toBe('adjust'); // Most recent first
    });

    it('should support limit parameter', async () => {
      const productId = new mongoose.Types.ObjectId();
      const inv = await inventoryService.createInventory(productId, 'SKU-001', 100);

      for (let i = 0; i < 10; i++) {
        await inventoryService.adjustStock(inv._id, 1, 'Test', 'user-1');
      }

      const history = await inventoryService.getAuditHistory(inv._id, 5);

      expect(history.length).toBeLessThanOrEqual(5);
    });
  });

  // ========================================================================
  // INTEGRATION SCENARIOS
  // ========================================================================

  describe('Integration: Complete Order Flow', () => {
    it('should handle reserve → commit flow', async () => {
      const productId = new mongoose.Types.ObjectId();
      const inv = await inventoryService.createInventory(productId, 'SKU-001', 100);

      // Step 1: Customer adds to cart (reserve)
      const reserved = await inventoryService.reserveStock('SKU-001', 25, 'order-123');
      expect(reserved.getAvailable()).toBe(75);

      // Step 2: Payment succeeds (commit)
      const committed = await inventoryService.commitReservedStock(inv._id, 25, 'order-123');
      expect(committed.stockOnHand).toBe(75);
      expect(committed.reserved).toBe(0);

      // Step 3: Audit trail shows complete flow
      expect(committed.audit).toContainEqual(
        expect.objectContaining({ action: 'reserve' })
      );
      expect(committed.audit).toContainEqual(
        expect.objectContaining({ action: 'commit' })
      );
    });

    it('should handle reserve → release flow (cancellation)', async () => {
      const productId = new mongoose.Types.ObjectId();
      const inv = await inventoryService.createInventory(productId, 'SKU-001', 100);

      // Customer reserves
      await inventoryService.reserveStock('SKU-001', 25, 'order-123');

      // Order cancelled (release)
      const released = await inventoryService.releaseReservedStock(inv._id, 25, 'order-123');
      expect(released.getAvailable()).toBe(100);
      expect(released.reserved).toBe(0);
    });

    it('should handle multiple variants for same product', async () => {
      const productId = new mongoose.Types.ObjectId();

      const inv1 = await inventoryService.createInventory(productId, 'SKU-XL-RED', 50);
      const inv2 = await inventoryService.createInventory(productId, 'SKU-M-RED', 30);

      await inventoryService.reserveStock('SKU-XL-RED', 10, 'order-1');
      await inventoryService.reserveStock('SKU-M-RED', 10, 'order-1');

      const updated1 = await inventoryService.getInventoryById(inv1._id);
      const updated2 = await inventoryService.getInventoryById(inv2._id);

      expect(updated1.reserved).toBe(10);
      expect(updated2.reserved).toBe(10);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero-quantity inventory', async () => {
      const productId = new mongoose.Types.ObjectId();
      const inv = await inventoryService.createInventory(productId, 'SKU-001', 0);

      await expect(
        inventoryService.reserveStock('SKU-001', 1, 'order-1')
      ).rejects.toThrow('INSUFFICIENT_STOCK');
    });

    it('should handle concurrent-like rapid reservations', async () => {
      const productId = new mongoose.Types.ObjectId();
      await inventoryService.createInventory(productId, 'SKU-001', 100);

      const r1 = inventoryService.reserveStock('SKU-001', 60, 'order-1');
      const r2 = inventoryService.reserveStock('SKU-001', 50, 'order-2'); // Should fail

      await expect(r1).resolves.toBeDefined();
      await expect(r2).rejects.toThrow('INSUFFICIENT_STOCK');
    });

    it('should handle very large stock quantities', async () => {
      const productId = new mongoose.Types.ObjectId();
      const inv = await inventoryService.createInventory(productId, 'SKU-001', 1000000);

      const reserved = await inventoryService.reserveStock('SKU-001', 500000, 'order-1');

      expect(reserved.getAvailable()).toBe(500000);
    });
  });
});
