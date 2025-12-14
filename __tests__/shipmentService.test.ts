import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import ShipmentService from '@/lib/services/shipmentService';
import Shipment from '@/models/ShipmentModel';
import Order from '@/models/OrderModel';
import Customer from '@/models/CustomerModel';
import User from '@/models/UserModel';

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
  await Shipment.deleteMany({});
  await Order.deleteMany({});
  await Customer.deleteMany({});
  await User.deleteMany({});
});

describe('ShipmentService', () => {
  // ✅ TEST 1: Auto shipment creation
  it('should auto-create shipment when order is confirmed', async () => {
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
          price: 500,
          subtotal: 500,
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
        subtotal: 500,
        tax: 90,
        discount: 0,
        shipping: 0,
        grandTotal: 590,
      },
      paymentMethod: 'cod',
      status: 'confirmed',
    });

    const shipment = await ShipmentService.autoCreateShipment(order._id.toString());

    expect(shipment).toBeDefined();
    expect(shipment.orderId).toEqual(order._id);
    expect(shipment.status).toBe('created');
    expect(shipment.createdBy).toBe('system');
  });

  // ✅ TEST 2: Prevent duplicate shipment auto-creation
  it('should prevent duplicate auto-shipment creation', async () => {
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
          price: 500,
          subtotal: 500,
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
        subtotal: 500,
        tax: 90,
        discount: 0,
        shipping: 0,
        grandTotal: 590,
      },
      paymentMethod: 'cod',
      status: 'confirmed',
    });

    const shipment1 = await ShipmentService.autoCreateShipment(order._id.toString());
    const shipment2 = await ShipmentService.autoCreateShipment(order._id.toString());

    expect(shipment1._id).toEqual(shipment2._id);
  });

  // ✅ TEST 3: Manual shipment creation
  it('should create shipment manually with admin override', async () => {
    const customer = await Customer.create({
      email: 'test@example.com',
      name: 'Test Customer',
      phone: '9876543210',
    });

    const admin = await User.create({
      email: 'admin@example.com',
      name: 'Admin User',
      passwordHash: 'hashed_password',
      roles: ['admin'],
      isActive: true,
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
          price: 500,
          subtotal: 500,
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
        subtotal: 500,
        tax: 90,
        discount: 0,
        shipping: 0,
        grandTotal: 590,
      },
      paymentMethod: 'cod',
      status: 'confirmed',
    });

    const shipment = await ShipmentService.createShipment({
      orderId: order._id.toString(),
      courierName: 'Delhivery',
      trackingNumber: 'DLV123456789',
      trackingUrl: 'https://delhivery.com/track/DLV123456789',
      createdBy: 'admin',
      adminId: admin._id.toString(),
      meta: {
        notes: 'Fragile item',
        weight: 0.5,
      },
    });

    expect(shipment).toBeDefined();
    expect(shipment.courierName).toBe('Delhivery');
    expect(shipment.trackingNumber).toBe('DLV123456789');
    expect(shipment.createdBy).toBe('admin');
  });

  // ✅ TEST 4: Update shipment status
  it('should update shipment status through workflow', async () => {
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
          price: 500,
          subtotal: 500,
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
        subtotal: 500,
        tax: 90,
        discount: 0,
        shipping: 0,
        grandTotal: 590,
      },
      paymentMethod: 'cod',
      status: 'confirmed',
    });

    const shipment = await ShipmentService.createShipment({
      orderId: order._id.toString(),
      courierName: 'Delhivery',
      trackingNumber: 'DLV123456789',
    });

    let updated = await ShipmentService.updateShipment(shipment._id.toString(), {
      status: 'picked',
    });
    expect(updated?.status).toBe('picked');

    updated = await ShipmentService.updateShipment(shipment._id.toString(), {
      status: 'shipped',
    });
    expect(updated?.status).toBe('shipped');
    expect(updated?.shippedAt).toBeDefined();

    updated = await ShipmentService.updateShipment(shipment._id.toString(), {
      status: 'delivered',
    });
    expect(updated?.status).toBe('delivered');
    expect(updated?.deliveredAt).toBeDefined();
  });

  // ✅ TEST 5: Cancel shipment
  it('should cancel shipment', async () => {
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
          price: 500,
          subtotal: 500,
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
        subtotal: 500,
        tax: 90,
        discount: 0,
        shipping: 0,
        grandTotal: 590,
      },
      paymentMethod: 'cod',
      status: 'confirmed',
    });

    const shipment = await ShipmentService.createShipment({
      orderId: order._id.toString(),
      courierName: 'Delhivery',
    });

    const cancelled = await ShipmentService.cancelShipment(shipment._id.toString());

    expect(cancelled?.status).toBe('cancelled');
  });

  // ✅ TEST 6: Get tracking info (customer)
  it('should retrieve tracking info for customer', async () => {
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
          price: 500,
          subtotal: 500,
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
        subtotal: 500,
        tax: 90,
        discount: 0,
        shipping: 0,
        grandTotal: 590,
      },
      paymentMethod: 'cod',
      status: 'confirmed',
    });

    const shipment = await ShipmentService.createShipment({
      orderId: order._id.toString(),
      courierName: 'Delhivery',
      trackingNumber: 'DLV123456789',
      trackingUrl: 'https://delhivery.com/track/DLV123456789',
    });

    await ShipmentService.updateShipment(shipment._id.toString(), {
      status: 'shipped',
    });

    const tracking = await ShipmentService.getTrackingInfo(order._id.toString());

    expect(tracking).toBeDefined();
    expect(tracking?.status).toBe('shipped');
    expect(tracking?.trackingNumber).toBe('DLV123456789');
    expect(tracking?.courierName).toBe('Delhivery');
  });

  // ✅ TEST 7: List shipments with filters
  it('should list shipments with filters', async () => {
    const customer = await Customer.create({
      email: 'test@example.com',
      name: 'Test Customer',
      phone: '9876543210',
    });

    const order1 = await Order.create({
      orderId: `ORD-${Date.now()}`,
      orderNumber: `ORD-${Math.random().toString(36).substring(7)}`,
      customerId: customer._id,
      items: [
        {
          productId: new mongoose.Types.ObjectId(),
          productName: 'Test Product',
          variantSku: 'TEST-001-M',
          qty: 1,
          price: 500,
          subtotal: 500,
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
        subtotal: 500,
        tax: 90,
        discount: 0,
        shipping: 0,
        grandTotal: 590,
      },
      paymentMethod: 'cod',
      status: 'confirmed',
    });

    const order2 = await Order.create({
      orderId: `ORD-${Date.now() + 1}`,
      orderNumber: `ORD-${Math.random().toString(36).substring(7)}`,
      customerId: customer._id,
      items: [
        {
          productId: new mongoose.Types.ObjectId(),
          productName: 'Test Product',
          variantSku: 'TEST-001-M',
          qty: 1,
          price: 500,
          subtotal: 500,
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
        subtotal: 500,
        tax: 90,
        discount: 0,
        shipping: 0,
        grandTotal: 590,
      },
      paymentMethod: 'cod',
      status: 'confirmed',
    });

    await ShipmentService.createShipment({
      orderId: order1._id.toString(),
      courierName: 'Delhivery',
      trackingNumber: 'DLV123456789',
    });

    await ShipmentService.createShipment({
      orderId: order2._id.toString(),
      courierName: 'Fedex',
      trackingNumber: 'FDX987654321',
    });

    const delhiveryShipments = await ShipmentService.listShipments({
      courierName: 'Delhivery',
    });

    expect(delhiveryShipments.length).toBe(1);
    expect(delhiveryShipments[0].courierName).toBe('Delhivery');
  });

  // ✅ TEST 8: Delete shipment (only before shipped)
  it('should delete shipment only if not shipped', async () => {
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
          price: 500,
          subtotal: 500,
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
        subtotal: 500,
        tax: 90,
        discount: 0,
        shipping: 0,
        grandTotal: 590,
      },
      paymentMethod: 'cod',
      status: 'confirmed',
    });

    const shipment = await ShipmentService.createShipment({
      orderId: order._id.toString(),
      courierName: 'Delhivery',
    });

    await ShipmentService.deleteShipment(shipment._id.toString());

    const deleted = await ShipmentService.getShipment(shipment._id.toString());
    expect(deleted).toBeNull();
  });
});
