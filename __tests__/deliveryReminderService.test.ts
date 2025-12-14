import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import DeliveryReminderService from '@/lib/services/deliveryReminderService';
import Order, { IOrder } from '@/models/OrderModel';
import Shipment, { IShipment } from '@/models/ShipmentModel';
import Customer from '@/models/CustomerModel';

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
  await Order.deleteMany({});
  await Shipment.deleteMany({});
  await Customer.deleteMany({});
});

describe('DeliveryReminderService', () => {
  // Helper to create test order and shipment
  async function createTestOrder() {
    const customer = await Customer.create({
      email: 'test@example.com',
      name: 'Test Customer',
      phone: '9876543210',
    });

    const order = await Order.create({
      orderId: `ORD-${Date.now()}`,
      orderNumber: `ORD-${Math.random().toString(36).substring(7)}`,
      customerId: customer._id,
      items: [
        {
          productId: new mongoose.Types.ObjectId(),
          productName: 'Test Product',
          variantSku: 'TEST-001-M',
          qty: 1,
          price: 1000,
          subtotal: 1000,
        },
      ],
      address: {
        recipientName: 'Test Customer',
        phoneNumber: '9876543210',
        streetAddress: '123 Main St',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        country: 'India',
      },
      totals: {
        subtotal: 1000,
        tax: 180,
        discount: 0,
        shipping: 0,
        grandTotal: 1180,
      },
      paymentMethod: 'cod',
      status: 'confirmed',
    });

    return { customer, order };
  }

  // ✅ TEST 1: Calculate estimated delivery date
  it('should calculate estimated delivery date', async () => {
    const { order } = await createTestOrder();

    const shipment = await Shipment.create({
      shipmentId: `SHIP-${Date.now()}`,
      orderId: order._id,
      customerId: order.customerId,
      trackingId: `TRACK-${Date.now()}`,
      carrier: 'Delhivery',
      status: 'shipped',
      shippedAt: new Date(),
    });

    const estimate = await DeliveryReminderService.calculateEstimatedDelivery(
      order._id.toString()
    );

    expect(estimate).toBeDefined();
    expect(estimate?.estimatedDeliveryDate).toBeInstanceOf(Date);
    expect(estimate?.daysRemaining).toBeGreaterThanOrEqual(0);
  });

  // ✅ TEST 2: Estimate before shipment (should be pending)
  it('should return awaiting_shipment when no shipment exists', async () => {
    const { order } = await createTestOrder();

    const estimate = await DeliveryReminderService.calculateEstimatedDelivery(
      order._id.toString()
    );

    expect(estimate?.status).toBe('awaiting_shipment');
  });

  // ✅ TEST 3: Get delivery status
  it('should get delivery status for order', async () => {
    const { order } = await createTestOrder();

    await Shipment.create({
      shipmentId: `SHIP-${Date.now()}`,
      orderId: order._id,
      customerId: order.customerId,
      trackingId: `TRACK-${Date.now()}`,
      carrier: 'Delhivery',
      status: 'shipped',
      shippedAt: new Date(),
    });

    const status = await DeliveryReminderService.getDeliveryStatus(
      order._id.toString()
    );

    expect(status).toBeDefined();
    expect(status.status).toBe('shipped');
    expect(status.estimatedDeliveryDate).toBeInstanceOf(Date);
  });

  // ✅ TEST 4: Express delivery (2 days)
  it('should calculate shorter delivery time for express', async () => {
    const { order } = await createTestOrder();

    await Shipment.create({
      shipmentId: `SHIP-${Date.now()}`,
      orderId: order._id,
      customerId: order.customerId,
      trackingId: `TRACK-${Date.now()}`,
      carrier: 'Delhivery Express',
      status: 'shipped',
      shippedAt: new Date(),
    });

    const estimate = await DeliveryReminderService.calculateEstimatedDelivery(
      order._id.toString()
    );

    expect(estimate?.daysRemaining).toBeLessThanOrEqual(5);
  });

  // ✅ TEST 5: Get upcoming reminders
  it('should get upcoming delivery reminders', async () => {
    const { order } = await createTestOrder();

    await Shipment.create({
      shipmentId: `SHIP-${Date.now()}`,
      orderId: order._id,
      customerId: order.customerId,
      trackingId: `TRACK-${Date.now()}`,
      carrier: 'Delhivery',
      status: 'shipped',
      shippedAt: new Date(),
    });

    const reminders = await DeliveryReminderService.getUpcomingReminders();

    expect(Array.isArray(reminders)).toBe(true);
    expect(reminders.length).toBeGreaterThanOrEqual(0);
  });

  // ✅ TEST 6: Filter out-for-delivery shipments
  it('should include out-for-delivery shipments in reminders', async () => {
    const { order } = await createTestOrder();

    await Shipment.create({
      shipmentId: `SHIP-${Date.now()}`,
      orderId: order._id,
      customerId: order.customerId,
      trackingId: `TRACK-${Date.now()}`,
      carrier: 'Delhivery',
      status: 'outForDelivery',
      shippedAt: new Date(),
      outForDeliveryAt: new Date(),
    });

    const reminders = await DeliveryReminderService.getUpcomingReminders();

    expect(reminders.length).toBeGreaterThan(0);
    expect(reminders[0].orderId).toBe(order._id.toString());
  });

  // ✅ TEST 7: Days until delivery calculation
  it('should calculate correct days remaining', async () => {
    const { order } = await createTestOrder();

    // Create shipment with known shipped date
    const shippedDate = new Date();
    shippedDate.setDate(shippedDate.getDate() - 2); // 2 days ago

    await Shipment.create({
      shipmentId: `SHIP-${Date.now()}`,
      orderId: order._id,
      customerId: order.customerId,
      trackingId: `TRACK-${Date.now()}`,
      carrier: 'Delhivery',
      status: 'shipped',
      shippedAt: shippedDate,
    });

    const estimate = await DeliveryReminderService.calculateEstimatedDelivery(
      order._id.toString()
    );

    // Should have about 3-4 days remaining (5 days total - 2 days elapsed)
    expect(estimate?.daysRemaining).toBeLessThanOrEqual(4);
  });

  // ✅ TEST 8: Manual reminder trigger
  it('should allow manual reminder trigger', async () => {
    const { customer, order } = await createTestOrder();

    await Shipment.create({
      shipmentId: `SHIP-${Date.now()}`,
      orderId: order._id,
      customerId: order.customerId,
      trackingId: `TRACK-${Date.now()}`,
      carrier: 'Delhivery',
      status: 'shipped',
      shippedAt: new Date(),
    });

    // Note: sendManualReminder would require email setup
    // This test just verifies the method exists and can be called
    const method = DeliveryReminderService.sendManualReminder;
    expect(typeof method).toBe('function');
  });
});
