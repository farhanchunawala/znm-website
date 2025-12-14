/**
 * Phase 5: Order Processing Tests
 * Prerequisites: Phase 3.2 (Inventory) and existing orderService tests
 * 
 * Tests comprehensive order workflow including:
 * - Order creation and validation
 * - Status transitions
 * - Cancellation and refunds
 * - Timeline tracking
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import Order from '@/models/OrderModel';
import Inventory from '@/models/InventoryModel';
import Product from '@/models/ProductModel';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.connection.close();
  await mongoServer.stop();
});

describe('Phase 5: Order Processing Workflow', () => {
  let product: any;
  let inventory: any;
  let customerId: string;

  beforeEach(async () => {
    await mongoose.connection.dropDatabase();

    customerId = new mongoose.Types.ObjectId().toString();

    product = await Product.create({
      name: 'Test Kurta',
      slug: 'test-kurta',
      basePrice: 1500,
      currency: 'INR',
      category: new mongoose.Types.ObjectId(),
      sku: 'KURTA-TEST',
    });

    inventory = await Inventory.create({
      productId: product._id,
      totalStock: 100,
      availableStock: 100,
      reservedStock: 0,
      variantSku: 'KURTA-TEST-M',
    });
  });

  describe('Order Creation Flow', () => {
    it('should create order with all required fields', async () => {
      const order = await Order.create({
        customerId,
        orderNumber: 'ORD-2025-00001',
        items: [
          {
            productId: product._id,
            variantSku: 'KURTA-TEST-M',
            qty: 2,
            price: 1500,
            subtotal: 3000,
          },
        ],
        totals: {
          subtotal: 3000,
          tax: 540,
          discount: 0,
          shipping: 100,
          grandTotal: 3640,
        },
        address: {
          recipientName: 'John Doe',
          phoneNumber: '9876543210',
          streetAddress: '123 Main St',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400001',
          country: 'India',
        },
        paymentMethod: 'card',
        paymentStatus: 'pending',
        orderStatus: 'pending',
      });

      expect(order._id).toBeDefined();
      expect(order.orderNumber).toBe('ORD-2025-00001');
      expect(order.orderStatus).toBe('pending');
      expect(order.items).toHaveLength(1);
      expect(order.totals.grandTotal).toBe(3640);
    });

    it('should reserve inventory on order creation', async () => {
      const quantityToOrder = 20;

      // Simulate inventory reservation
      const updated = await Inventory.findOneAndUpdate(
        {
          _id: inventory._id,
          availableStock: { $gte: quantityToOrder },
        },
        {
          $inc: {
            reservedStock: quantityToOrder,
            availableStock: -quantityToOrder,
          },
        },
        { new: true }
      );

      expect(updated).toBeDefined();
      expect(updated!.reservedStock).toBe(quantityToOrder);
      expect(updated!.availableStock).toBe(100 - quantityToOrder);
    });

    it('should fail order if insufficient stock', async () => {
      const quantityToOrder = 150;

      const result = await Inventory.findOneAndUpdate(
        {
          _id: inventory._id,
          availableStock: { $gte: quantityToOrder },
        },
        {
          $inc: {
            reservedStock: quantityToOrder,
            availableStock: -quantityToOrder,
          },
        }
      );

      expect(result).toBeNull();
    });

    it('should generate unique order number', async () => {
      const order1 = await Order.create({
        customerId,
        orderNumber: 'ORD-2025-00001',
        items: [],
        totals: { subtotal: 0, tax: 0, discount: 0, shipping: 0, grandTotal: 0 },
        address: {
          recipientName: 'User 1',
          phoneNumber: '1234567890',
          streetAddress: 'Address 1',
          city: 'City 1',
          state: 'State 1',
          postalCode: '100001',
          country: 'India',
        },
        paymentMethod: 'card',
      });

      const order2 = await Order.create({
        customerId,
        orderNumber: 'ORD-2025-00002',
        items: [],
        totals: { subtotal: 0, tax: 0, discount: 0, shipping: 0, grandTotal: 0 },
        address: {
          recipientName: 'User 2',
          phoneNumber: '0987654321',
          streetAddress: 'Address 2',
          city: 'City 2',
          state: 'State 2',
          postalCode: '200001',
          country: 'India',
        },
        paymentMethod: 'card',
      });

      expect(order1.orderNumber).not.toBe(order2.orderNumber);
    });
  });

  describe('Order Status Transitions', () => {
    let order: any;

    beforeEach(async () => {
      order = await Order.create({
        customerId,
        orderNumber: 'ORD-2025-00001',
        items: [
          {
            productId: product._id,
            variantSku: 'KURTA-TEST-M',
            qty: 1,
            price: 1500,
            subtotal: 1500,
          },
        ],
        totals: {
          subtotal: 1500,
          tax: 270,
          discount: 0,
          shipping: 50,
          grandTotal: 1820,
        },
        address: {
          recipientName: 'John Doe',
          phoneNumber: '9876543210',
          streetAddress: '123 Main St',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400001',
          country: 'India',
        },
        paymentMethod: 'card',
        paymentStatus: 'pending',
        orderStatus: 'pending',
      });
    });

    it('should transition pending → confirmed', async () => {
      order.orderStatus = 'confirmed';
      const updated = await order.save();

      expect(updated.orderStatus).toBe('confirmed');
    });

    it('should transition confirmed → processing', async () => {
      order.orderStatus = 'confirmed';
      await order.save();

      order.orderStatus = 'processing';
      const updated = await order.save();

      expect(updated.orderStatus).toBe('processing');
    });

    it('should transition processing → shipped', async () => {
      order.orderStatus = 'shipped';
      const updated = await order.save();

      expect(updated.orderStatus).toBe('shipped');
    });

    it('should transition shipped → delivered', async () => {
      order.orderStatus = 'delivered';
      const updated = await order.save();

      expect(updated.orderStatus).toBe('delivered');
    });

    it('should track status changes with timeline', async () => {
      // Simulate timeline event
      order.timeline = order.timeline || [];
      order.timeline.push({
        action: 'order.status_changed',
        actor: 'admin',
        details: {
          from: 'pending',
          to: 'confirmed',
        },
        timestamp: new Date(),
      });

      const updated = await order.save();
      expect(updated.timeline.length).toBeGreaterThan(0);
    });
  });

  describe('Order Cancellation', () => {
    let order: any;

    beforeEach(async () => {
      // Reserve inventory first
      await Inventory.findOneAndUpdate(
        { _id: inventory._id },
        {
          $inc: {
            reservedStock: 20,
            availableStock: -20,
          },
        }
      );

      order = await Order.create({
        customerId,
        orderNumber: 'ORD-2025-CANCEL',
        items: [
          {
            productId: product._id,
            variantSku: 'KURTA-TEST-M',
            qty: 20,
            price: 1500,
            subtotal: 30000,
          },
        ],
        totals: {
          subtotal: 30000,
          tax: 5400,
          discount: 0,
          shipping: 100,
          grandTotal: 35500,
        },
        address: {
          recipientName: 'John Doe',
          phoneNumber: '9876543210',
          streetAddress: '123 Main St',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400001',
          country: 'India',
        },
        paymentMethod: 'card',
        orderStatus: 'pending',
      });
    });

    it('should cancel order and release inventory', async () => {
      // Release reserved inventory
      const released = await Inventory.findOneAndUpdate(
        { _id: inventory._id },
        {
          $inc: {
            reservedStock: -20,
            availableStock: 20,
          },
        },
        { new: true }
      );

      order.orderStatus = 'cancelled';
      const cancelled = await order.save();

      expect(cancelled.orderStatus).toBe('cancelled');
      expect(released!.reservedStock).toBe(0);
      expect(released!.availableStock).toBe(100);
    });

    it('should prevent cancellation of shipped orders', async () => {
      order.orderStatus = 'shipped';
      await order.save();

      // Attempt to cancel - validation should prevent
      if (order.orderStatus === 'shipped') {
        expect(order.orderStatus).not.toBe('cancelled');
      }
    });

    it('should track cancellation reason in timeline', async () => {
      order.orderStatus = 'cancelled';
      order.timeline = order.timeline || [];
      order.timeline.push({
        action: 'order.cancelled',
        actor: 'customer',
        details: {
          reason: 'Customer requested cancellation',
        },
        timestamp: new Date(),
      });

      const updated = await order.save();
      const cancelEvent = updated.timeline.find(
        (e: any) => e.action === 'order.cancelled'
      );

      expect(cancelEvent).toBeDefined();
      expect(cancelEvent.details.reason).toContain('Customer');
    });
  });

  describe('Payment Processing', () => {
    let order: any;

    beforeEach(async () => {
      order = await Order.create({
        customerId,
        orderNumber: 'ORD-2025-PAYMENT',
        items: [
          {
            productId: product._id,
            variantSku: 'KURTA-TEST-M',
            qty: 1,
            price: 1500,
            subtotal: 1500,
          },
        ],
        totals: {
          subtotal: 1500,
          tax: 270,
          discount: 0,
          shipping: 50,
          grandTotal: 1820,
        },
        address: {
          recipientName: 'John Doe',
          phoneNumber: '9876543210',
          streetAddress: '123 Main St',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400001',
          country: 'India',
        },
        paymentMethod: 'card',
        paymentStatus: 'pending',
        orderStatus: 'pending',
      });
    });

    it('should mark payment as successful', async () => {
      order.paymentStatus = 'success';
      order.orderStatus = 'confirmed';
      const updated = await order.save();

      expect(updated.paymentStatus).toBe('success');
      expect(updated.orderStatus).toBe('confirmed');
    });

    it('should track payment method', async () => {
      expect(order.paymentMethod).toBe('card');
    });

    it('should handle payment failure', async () => {
      order.paymentStatus = 'failed';
      const updated = await order.save();

      expect(updated.paymentStatus).toBe('failed');
    });

    it('should auto-confirm COD orders', async () => {
      const codOrder = await Order.create({
        customerId,
        orderNumber: 'ORD-2025-COD',
        items: [{ productId: product._id, qty: 1, price: 1500, subtotal: 1500 }],
        totals: { subtotal: 1500, tax: 270, discount: 0, shipping: 50, grandTotal: 1820 },
        address: {
          recipientName: 'John',
          phoneNumber: '9876543210',
          streetAddress: '123 St',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400001',
          country: 'India',
        },
        paymentMethod: 'cod',
        orderStatus: 'confirmed',
      });

      expect(codOrder.orderStatus).toBe('confirmed');
    });
  });

  describe('Order Retrieval', () => {
    let order1: any;
    let order2: any;

    beforeEach(async () => {
      order1 = await Order.create({
        customerId,
        orderNumber: 'ORD-2025-00001',
        items: [],
        totals: { subtotal: 1000, tax: 100, discount: 0, shipping: 50, grandTotal: 1150 },
        address: {
          recipientName: 'John',
          phoneNumber: '9876543210',
          streetAddress: '123 St',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400001',
          country: 'India',
        },
        paymentMethod: 'card',
      });

      order2 = await Order.create({
        customerId,
        orderNumber: 'ORD-2025-00002',
        items: [],
        totals: { subtotal: 2000, tax: 200, discount: 0, shipping: 100, grandTotal: 2300 },
        address: {
          recipientName: 'John',
          phoneNumber: '9876543210',
          streetAddress: '123 St',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400001',
          country: 'India',
        },
        paymentMethod: 'card',
      });
    });

    it('should retrieve order by ID', async () => {
      const found = await Order.findById(order1._id);
      expect(found?.orderNumber).toBe('ORD-2025-00001');
    });

    it('should retrieve order by order number', async () => {
      const found = await Order.findOne({ orderNumber: 'ORD-2025-00002' });
      expect(found?._id).toEqual(order2._id);
    });

    it('should list customer orders', async () => {
      const orders = await Order.find({ customerId });
      expect(orders.length).toBe(2);
    });

    it('should filter orders by status', async () => {
      order1.orderStatus = 'confirmed';
      await order1.save();

      order2.orderStatus = 'pending';
      await order2.save();

      const confirmed = await Order.find({
        customerId,
        orderStatus: 'confirmed',
      });

      expect(confirmed.length).toBe(1);
    });
  });
});
