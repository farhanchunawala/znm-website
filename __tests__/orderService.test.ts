import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import Order, { IOrder } from '@/models/OrderModel';
import {
  createOrder,
  getOrderById,
  getOrderByOrderNumber,
  listOrders,
  updateOrderStatus,
  cancelOrder,
  markPaymentSuccess,
  attachShipment,
  addTimelineNote,
  getOrderTimeline,
  issueRefund,
  getOrdersByCustomer,
  getOverdueOrders,
  getUnpaidOrders,
  autoCancelUnpaidOrders,
  getOrderStatistics,
} from '@/lib/services/orderService';
import { connectDB } from '@/lib/mongodb';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.connection.close();
  await mongoServer.stop();
});

describe('Order Service', () => {
  describe('createOrder', () => {
    it('should create order with valid data', async () => {
      const orderData = {
        customerId: new mongoose.Types.ObjectId().toString(),
        items: [
          {
            productId: new mongoose.Types.ObjectId(),
            variantSku: 'KURTA-001-M',
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
        paymentMethod: 'card' as const,
      };

      const order = await createOrder(orderData);

      expect(order).toBeDefined();
      expect(order.orderNumber).toMatch(/^ORD-\d{4}-\d{5}$/);
      expect(order.orderStatus).toBe('pending');
      expect(order.paymentStatus).toBe('pending');
      expect(order.items).toHaveLength(1);
      expect(order.totals.grandTotal).toBe(3640);
    });

    it('should auto-confirm COD orders', async () => {
      const orderData = {
        customerId: new mongoose.Types.ObjectId().toString(),
        items: [
          {
            productId: new mongoose.Types.ObjectId(),
            variantSku: 'SHERWANI-001-L',
            qty: 1,
            price: 5000,
            subtotal: 5000,
          },
        ],
        totals: {
          subtotal: 5000,
          tax: 900,
          discount: 0,
          shipping: 0,
          grandTotal: 5900,
        },
        address: {
          recipientName: 'Jane Doe',
          phoneNumber: '8765432109',
          streetAddress: '456 Oak Ave',
          city: 'Delhi',
          state: 'Delhi',
          postalCode: '110001',
          country: 'India',
        },
        paymentMethod: 'cod' as const,
      };

      const order = await createOrder(orderData);

      expect(order.orderStatus).toBe('confirmed');
      expect(order.hasEventAction('order.confirmed')).toBe(true);
    });

    it('should add order.created timeline event', async () => {
      const orderData = {
        customerId: new mongoose.Types.ObjectId().toString(),
        items: [
          {
            productId: new mongoose.Types.ObjectId(),
            variantSku: 'THOBE-001-XL',
            qty: 1,
            price: 2500,
            subtotal: 2500,
          },
        ],
        totals: {
          subtotal: 2500,
          tax: 450,
          discount: 0,
          shipping: 50,
          grandTotal: 3000,
        },
        address: {
          recipientName: 'Ahmed Khan',
          phoneNumber: '9123456789',
          streetAddress: '789 Park Rd',
          city: 'Bangalore',
          state: 'Karnataka',
          postalCode: '560001',
          country: 'India',
        },
        paymentMethod: 'upi' as const,
      };

      const order = await createOrder(orderData);

      expect(order.timeline).toHaveLength(1);
      expect(order.timeline[0].action).toBe('order.created');
      expect(order.timeline[0].actor).toBe('system');
    });
  });

  describe('getOrder', () => {
    it('should fetch order by ID', async () => {
      const orderData = {
        customerId: new mongoose.Types.ObjectId().toString(),
        items: [
          {
            productId: new mongoose.Types.ObjectId(),
            variantSku: 'SUIT-001-M',
            qty: 1,
            price: 8000,
            subtotal: 8000,
          },
        ],
        totals: {
          subtotal: 8000,
          tax: 1440,
          discount: 0,
          shipping: 0,
          grandTotal: 9440,
        },
        address: {
          recipientName: 'Raj Kumar',
          phoneNumber: '9999999999',
          streetAddress: 'Apt 101',
          city: 'Chennai',
          state: 'Tamil Nadu',
          postalCode: '600001',
          country: 'India',
        },
        paymentMethod: 'card' as const,
      };

      const created = await createOrder(orderData);
      const fetched = await getOrderById(created._id.toString());

      expect(fetched).toBeDefined();
      expect(fetched!._id.toString()).toBe(created._id.toString());
      expect(fetched!.orderNumber).toBe(created.orderNumber);
    });

    it('should fetch order by orderNumber', async () => {
      const orderData = {
        customerId: new mongoose.Types.ObjectId().toString(),
        items: [
          {
            productId: new mongoose.Types.ObjectId(),
            variantSku: 'KURTA-002-S',
            qty: 3,
            price: 1200,
            subtotal: 3600,
          },
        ],
        totals: {
          subtotal: 3600,
          tax: 648,
          discount: 0,
          shipping: 150,
          grandTotal: 4398,
        },
        address: {
          recipientName: 'Priya Singh',
          phoneNumber: '9111111111',
          streetAddress: 'House 42',
          city: 'Hyderabad',
          state: 'Telangana',
          postalCode: '500001',
          country: 'India',
        },
        paymentMethod: 'wallet' as const,
      };

      const created = await createOrder(orderData);
      const fetched = await getOrderByOrderNumber(created.orderNumber);

      expect(fetched).toBeDefined();
      expect(fetched!.orderNumber).toBe(created.orderNumber);
    });
  });

  describe('listOrders', () => {
    it('should list orders with pagination', async () => {
      // Create multiple orders
      for (let i = 0; i < 5; i++) {
        await createOrder({
          customerId: new mongoose.Types.ObjectId().toString(),
          items: [
            {
              productId: new mongoose.Types.ObjectId(),
              variantSku: `SKU-${i}`,
              qty: 1,
              price: 1000 + i * 100,
              subtotal: 1000 + i * 100,
            },
          ],
          totals: {
            subtotal: 1000 + i * 100,
            tax: 180,
            discount: 0,
            shipping: 50,
            grandTotal: 1230 + i * 100,
          },
          address: {
            recipientName: `Customer ${i}`,
            phoneNumber: '9000000000',
            streetAddress: `Street ${i}`,
            city: 'City',
            state: 'State',
            postalCode: '000001',
            country: 'India',
          },
          paymentMethod: 'card' as const,
        });
      }

      const result = await listOrders({ page: 1, limit: 3 });

      expect(result.orders).toHaveLength(3);
      expect(result.total).toBeGreaterThanOrEqual(5);
      expect(result.pages).toBeGreaterThanOrEqual(2);
    });

    it('should filter orders by status', async () => {
      const order1 = await createOrder({
        customerId: new mongoose.Types.ObjectId().toString(),
        items: [
          {
            productId: new mongoose.Types.ObjectId(),
            variantSku: 'TEST-001',
            qty: 1,
            price: 1000,
            subtotal: 1000,
          },
        ],
        totals: {
          subtotal: 1000,
          tax: 180,
          discount: 0,
          shipping: 50,
          grandTotal: 1230,
        },
        address: {
          recipientName: 'Test Customer',
          phoneNumber: '9000000001',
          streetAddress: 'Test St',
          city: 'Test City',
          state: 'TS',
          postalCode: '000001',
          country: 'India',
        },
        paymentMethod: 'card' as const,
      });

      const result = await listOrders({ page: 1, limit: 20, orderStatus: 'pending' });

      expect(result.orders.some((o) => o._id.toString() === order1._id.toString())).toBe(true);
    });
  });

  describe('updateOrderStatus', () => {
    it('should update order status in progression', async () => {
      const order = await createOrder({
        customerId: new mongoose.Types.ObjectId().toString(),
        items: [
          {
            productId: new mongoose.Types.ObjectId(),
            variantSku: 'STATUS-TEST-001',
            qty: 1,
            price: 1000,
            subtotal: 1000,
          },
        ],
        totals: {
          subtotal: 1000,
          tax: 180,
          discount: 0,
          shipping: 50,
          grandTotal: 1230,
        },
        address: {
          recipientName: 'Status Test',
          phoneNumber: '9000000002',
          streetAddress: 'Test',
          city: 'Test',
          state: 'TS',
          postalCode: '000001',
          country: 'India',
        },
        paymentMethod: 'card' as const,
      });

      const updated = await updateOrderStatus(order._id.toString(), {
        orderStatus: 'confirmed',
      });

      expect(updated.orderStatus).toBe('confirmed');
      expect(updated.hasEventAction('order.confirmed')).toBe(true);
    });

    it('should prevent backward status progression', async () => {
      const order = await createOrder({
        customerId: new mongoose.Types.ObjectId().toString(),
        items: [
          {
            productId: new mongoose.Types.ObjectId(),
            variantSku: 'BACKWARD-TEST',
            qty: 1,
            price: 1000,
            subtotal: 1000,
          },
        ],
        totals: {
          subtotal: 1000,
          tax: 180,
          discount: 0,
          shipping: 50,
          grandTotal: 1230,
        },
        address: {
          recipientName: 'Backward Test',
          phoneNumber: '9000000003',
          streetAddress: 'Test',
          city: 'Test',
          state: 'TS',
          postalCode: '000001',
          country: 'India',
        },
        paymentMethod: 'card' as const,
      });

      await updateOrderStatus(order._id.toString(), { orderStatus: 'packed' });

      expect(async () => {
        await updateOrderStatus(order._id.toString(), { orderStatus: 'pending' });
      }).rejects.toThrow();
    });
  });

  describe('cancelOrder', () => {
    it('should cancel pending order', async () => {
      const order = await createOrder({
        customerId: new mongoose.Types.ObjectId().toString(),
        items: [
          {
            productId: new mongoose.Types.ObjectId(),
            variantSku: 'CANCEL-TEST-001',
            qty: 1,
            price: 1000,
            subtotal: 1000,
          },
        ],
        totals: {
          subtotal: 1000,
          tax: 180,
          discount: 0,
          shipping: 50,
          grandTotal: 1230,
        },
        address: {
          recipientName: 'Cancel Test',
          phoneNumber: '9000000004',
          streetAddress: 'Test',
          city: 'Test',
          state: 'TS',
          postalCode: '000001',
          country: 'India',
        },
        paymentMethod: 'card' as const,
      });

      const cancelled = await cancelOrder(order._id.toString(), {
        reason: 'Customer requested cancellation',
        refundInitiated: true,
      });

      expect(cancelled.orderStatus).toBe('cancelled');
      expect(cancelled.paymentStatus).toBe('refunded');
      expect(cancelled.hasEventAction('order.cancelled')).toBe(true);
    });

    it('should prevent cancellation of shipped order', async () => {
      const order = await createOrder({
        customerId: new mongoose.Types.ObjectId().toString(),
        items: [
          {
            productId: new mongoose.Types.ObjectId(),
            variantSku: 'SHIPPED-CANCEL-TEST',
            qty: 1,
            price: 1000,
            subtotal: 1000,
          },
        ],
        totals: {
          subtotal: 1000,
          tax: 180,
          discount: 0,
          shipping: 50,
          grandTotal: 1230,
        },
        address: {
          recipientName: 'Shipped Cancel Test',
          phoneNumber: '9000000005',
          streetAddress: 'Test',
          city: 'Test',
          state: 'TS',
          postalCode: '000001',
          country: 'India',
        },
        paymentMethod: 'card' as const,
      });

      await updateOrderStatus(order._id.toString(), { orderStatus: 'shipped' });

      expect(async () => {
        await cancelOrder(order._id.toString(), {
          reason: 'Cannot cancel',
          refundInitiated: false,
        });
      }).rejects.toThrow();
    });
  });

  describe('markPaymentSuccess', () => {
    it('should mark payment success and confirm order', async () => {
      const order = await createOrder({
        customerId: new mongoose.Types.ObjectId().toString(),
        items: [
          {
            productId: new mongoose.Types.ObjectId(),
            variantSku: 'PAYMENT-TEST',
            qty: 1,
            price: 1000,
            subtotal: 1000,
          },
        ],
        totals: {
          subtotal: 1000,
          tax: 180,
          discount: 0,
          shipping: 50,
          grandTotal: 1230,
        },
        address: {
          recipientName: 'Payment Test',
          phoneNumber: '9000000006',
          streetAddress: 'Test',
          city: 'Test',
          state: 'TS',
          postalCode: '000001',
          country: 'India',
        },
        paymentMethod: 'card' as const,
      });

      const updated = await markPaymentSuccess(order._id.toString(), 'TXN-123456', 1230);

      expect(updated.paymentStatus).toBe('paid');
      expect(updated.orderStatus).toBe('confirmed');
      expect(updated.hasEventAction('payment.success')).toBe(true);
    });
  });

  describe('Timeline operations', () => {
    it('should add timeline note', async () => {
      const order = await createOrder({
        customerId: new mongoose.Types.ObjectId().toString(),
        items: [
          {
            productId: new mongoose.Types.ObjectId(),
            variantSku: 'TIMELINE-TEST',
            qty: 1,
            price: 1000,
            subtotal: 1000,
          },
        ],
        totals: {
          subtotal: 1000,
          tax: 180,
          discount: 0,
          shipping: 50,
          grandTotal: 1230,
        },
        address: {
          recipientName: 'Timeline Test',
          phoneNumber: '9000000007',
          streetAddress: 'Test',
          city: 'Test',
          state: 'TS',
          postalCode: '000001',
          country: 'India',
        },
        paymentMethod: 'card' as const,
      });

      await addTimelineNote(order._id.toString(), 'Order is being processed', 'admin');

      const timeline = await getOrderTimeline(order._id.toString());

      expect(timeline.some((e) => e.action === 'order.note')).toBe(true);
    });
  });

  describe('getOverdueOrders', () => {
    it('should identify orders not shipped within 7 days', async () => {
      const old = new Date();
      old.setDate(old.getDate() - 10);

      const order = new Order({
        orderNumber: 'TEST-OVERDUE-001',
        customerId: new mongoose.Types.ObjectId(),
        items: [],
        totals: { subtotal: 0, tax: 0, discount: 0, shipping: 0, grandTotal: 0 },
        address: {
          recipientName: 'Test',
          phoneNumber: '9000000000',
          streetAddress: 'Test',
          city: 'Test',
          state: 'TS',
          postalCode: '000001',
        },
        orderStatus: 'pending',
        paymentStatus: 'pending',
        timeline: [],
        createdAt: old,
      });

      await order.save();

      const overdue = await getOverdueOrders();

      expect(overdue.some((o) => o._id.toString() === order._id.toString())).toBe(true);
    });
  });
});
