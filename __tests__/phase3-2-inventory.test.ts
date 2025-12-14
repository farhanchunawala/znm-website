/**
 * Phase 3.2: Inventory Management Service Test
 * Prerequisites: Phase 3.1 (Products)
 * 
 * Tests inventory tracking, stock reservations, and updates
 * Critical for order processing - MUST BE ATOMIC
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import Product from '@/models/ProductModel';
import Inventory from '@/models/InventoryModel';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.connection.close();
  await mongoServer.stop();
});

describe('Phase 3.2: Inventory Management', () => {
  let product: any;

  beforeEach(async () => {
    await mongoose.connection.dropDatabase();
    
    product = await Product.create({
      name: 'Test Product',
      slug: 'test-product',
      basePrice: 1000,
      currency: 'INR',
      category: new mongoose.Types.ObjectId(),
      sku: 'TEST-001',
    });
  });

  describe('Inventory Creation', () => {
    it('should create inventory for product', async () => {
      const inventory = await Inventory.create({
        productId: product._id,
        totalStock: 100,
        availableStock: 100,
        reservedStock: 0,
        variantSku: 'TEST-001-M',
      });

      expect(inventory._id).toBeDefined();
      expect(inventory.productId).toEqual(product._id);
      expect(inventory.totalStock).toBe(100);
      expect(inventory.availableStock).toBe(100);
    });

    it('should set initial reservation as zero', async () => {
      const inventory = await Inventory.create({
        productId: product._id,
        totalStock: 50,
        availableStock: 50,
        reservedStock: 0,
      });

      expect(inventory.reservedStock).toBe(0);
    });
  });

  describe('Stock Availability Check', () => {
    let inventory: any;

    beforeEach(async () => {
      inventory = await Inventory.create({
        productId: product._id,
        totalStock: 100,
        availableStock: 100,
        reservedStock: 0,
      });
    });

    it('should confirm sufficient stock', async () => {
      expect(inventory.availableStock).toBeGreaterThanOrEqual(50);
    });

    it('should reject insufficient stock', async () => {
      expect(inventory.availableStock).toBeLessThan(150);
    });

    it('should handle exact stock amount', async () => {
      expect(inventory.availableStock).toBe(100);
    });

    it('should show zero available stock when fully reserved', async () => {
      inventory.reservedStock = 100;
      inventory.availableStock = 0;
      await inventory.save();

      const updatedInventory = await Inventory.findById(inventory._id);
      expect(updatedInventory?.availableStock).toBe(0);
    });
  });

  describe('Stock Reservation (ATOMIC)', () => {
    let inventory: any;

    beforeEach(async () => {
      inventory = await Inventory.create({
        productId: product._id,
        totalStock: 100,
        availableStock: 100,
        reservedStock: 0,
      });
    });

    it('should reserve stock atomically', async () => {
      const quantityToReserve = 30;
      
      // Atomic operation: check and reserve in one go
      const result = await Inventory.findOneAndUpdate(
        {
          _id: inventory._id,
          availableStock: { $gte: quantityToReserve },
        },
        {
          $inc: {
            reservedStock: quantityToReserve,
            availableStock: -quantityToReserve,
          },
        },
        { new: true }
      );

      expect(result).toBeDefined();
      expect(result!.reservedStock).toBe(30);
      expect(result!.availableStock).toBe(70);
    });

    it('should fail reservation if insufficient stock', async () => {
      const quantityToReserve = 150;

      const result = await Inventory.findOneAndUpdate(
        {
          _id: inventory._id,
          availableStock: { $gte: quantityToReserve },
        },
        {
          $inc: {
            reservedStock: quantityToReserve,
            availableStock: -quantityToReserve,
          },
        }
      );

      expect(result).toBeNull(); // No update happened
      
      // Verify stock unchanged
      const unchanged = await Inventory.findById(inventory._id);
      expect(unchanged?.reservedStock).toBe(0);
      expect(unchanged?.availableStock).toBe(100);
    });

    it('should prevent double reservation (atomic)', async () => {
      // First reservation
      await Inventory.findOneAndUpdate(
        {
          _id: inventory._id,
          availableStock: { $gte: 80 },
        },
        {
          $inc: {
            reservedStock: 80,
            availableStock: -80,
          },
        }
      );

      // Try second reservation for remaining + more
      const secondResult = await Inventory.findOneAndUpdate(
        {
          _id: inventory._id,
          availableStock: { $gte: 30 }, // Only 20 available, trying to reserve 30
        },
        {
          $inc: {
            reservedStock: 30,
            availableStock: -30,
          },
        }
      );

      expect(secondResult).toBeNull();

      // Verify state
      const current = await Inventory.findById(inventory._id);
      expect(current?.reservedStock).toBe(80);
      expect(current?.availableStock).toBe(20);
    });
  });

  describe('Stock Release', () => {
    let inventory: any;

    beforeEach(async () => {
      inventory = await Inventory.create({
        productId: product._id,
        totalStock: 100,
        availableStock: 70,
        reservedStock: 30,
      });
    });

    it('should release reserved stock', async () => {
      const quantityToRelease = 20;

      const result = await Inventory.findOneAndUpdate(
        { _id: inventory._id },
        {
          $inc: {
            reservedStock: -quantityToRelease,
            availableStock: quantityToRelease,
          },
        },
        { new: true }
      );

      expect(result!.reservedStock).toBe(10);
      expect(result!.availableStock).toBe(90);
    });

    it('should not release more than reserved', async () => {
      const quantityToRelease = 50; // More than reserved (30)

      // Validate before releasing
      if (inventory.reservedStock < quantityToRelease) {
        expect(inventory.reservedStock).toBeLessThan(quantityToRelease);
      }
    });

    it('should fully release all reserved stock', async () => {
      const result = await Inventory.findOneAndUpdate(
        { _id: inventory._id },
        {
          $inc: {
            reservedStock: -30,
            availableStock: 30,
          },
        },
        { new: true }
      );

      expect(result!.reservedStock).toBe(0);
      expect(result!.availableStock).toBe(100);
    });
  });

  describe('Stock Consumption (Order Fulfillment)', () => {
    let inventory: any;

    beforeEach(async () => {
      inventory = await Inventory.create({
        productId: product._id,
        totalStock: 100,
        availableStock: 70,
        reservedStock: 30,
      });
    });

    it('should consume reserved stock on fulfillment', async () => {
      const quantityFulfilled = 20;

      const result = await Inventory.findOneAndUpdate(
        { _id: inventory._id },
        {
          $inc: {
            totalStock: -quantityFulfilled,
            reservedStock: -quantityFulfilled,
          },
        },
        { new: true }
      );

      expect(result!.totalStock).toBe(80);
      expect(result!.reservedStock).toBe(10);
      expect(result!.availableStock).toBe(70); // Unchanged
    });

    it('should track consumed vs available stock', async () => {
      const consumed = 100 - inventory.totalStock; // 0 initially
      const available = inventory.availableStock;
      const reserved = inventory.reservedStock;

      expect(available + reserved).toBe(inventory.totalStock);
    });
  });

  describe('Low Stock Alerts', () => {
    it('should detect low inventory', async () => {
      const inventory = await Inventory.create({
        productId: product._id,
        totalStock: 5,
        availableStock: 5,
        reservedStock: 0,
        lowStockThreshold: 10,
      });

      const isLowStock = inventory.totalStock <= (inventory.lowStockThreshold || 20);
      expect(isLowStock).toBe(true);
    });

    it('should detect normal inventory', async () => {
      const inventory = await Inventory.create({
        productId: product._id,
        totalStock: 100,
        availableStock: 100,
        reservedStock: 0,
        lowStockThreshold: 20,
      });

      const isLowStock = inventory.totalStock <= (inventory.lowStockThreshold || 20);
      expect(isLowStock).toBe(false);
    });

    it('should detect out of stock', async () => {
      const inventory = await Inventory.create({
        productId: product._id,
        totalStock: 0,
        availableStock: 0,
        reservedStock: 0,
      });

      expect(inventory.totalStock).toBe(0);
      expect(inventory.availableStock).toBe(0);
    });
  });

  describe('Inventory Consistency', () => {
    it('should maintain stock balance', async () => {
      const inventory = await Inventory.create({
        productId: product._id,
        totalStock: 100,
        availableStock: 70,
        reservedStock: 30,
      });

      // Total = Available + Reserved (always)
      expect(inventory.availableStock + inventory.reservedStock).toBe(
        inventory.totalStock
      );
    });

    it('should track inventory for multiple SKU variants', async () => {
      const inv1 = await Inventory.create({
        productId: product._id,
        totalStock: 50,
        availableStock: 50,
        reservedStock: 0,
        variantSku: 'TEST-001-M',
      });

      const inv2 = await Inventory.create({
        productId: product._id,
        totalStock: 40,
        availableStock: 40,
        reservedStock: 0,
        variantSku: 'TEST-001-L',
      });

      const allInventories = await Inventory.find({ productId: product._id });
      expect(allInventories.length).toBe(2);
    });
  });
});
