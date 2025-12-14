import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import BillerService from '@/lib/services/billerService';
import { Order, IOrder } from '@/models/OrderModel';
import { Payment, IPayment } from '@/models/PaymentModel';
import { Customer } from '@/models/CustomerModel';
import Biller from '@/models/BillerModel';

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
  // Clear collections
  await Order.deleteMany({});
  await Payment.deleteMany({});
  await Customer.deleteMany({});
  await Biller.deleteMany({});
});

/**
 * Helper function to create test data
 */
async function createTestOrder(paymentMethod: 'COD' | 'card', paymentStatus: string) {
  // Create customer
  const customer = new Customer({
    name: 'Test Customer',
    email: 'test@example.com',
    phoneNumber: '9876543210',
  });
  await customer.save();

  // Create order
  const order = new Order({
    orderNumber: `ORD-${Date.now()}`,
    customerId: customer._id,
    items: [
      {
        productId: new mongoose.Types.ObjectId(),
        variantSku: 'TEST-SKU-001',
        qty: 2,
        price: 500,
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
    paymentStatus: 'pending',
    orderStatus: 'pending',
    paymentMethod,
    address: {
      recipientName: 'Test Recipient',
      phoneNumber: '9876543210',
      streetAddress: '123 Test St',
      city: 'Test City',
      state: 'Test State',
      postalCode: '12345',
      country: 'India',
    },
  });
  await order.save();

  // Create payment
  const payment = new Payment({
    orderId: order._id,
    customerId: customer._id,
    amount: 1230,
    currency: 'INR',
    method: paymentMethod === 'COD' ? 'COD' : 'ONLINE',
    status: paymentStatus as any,
    provider: paymentMethod === 'COD' ? null : 'razorpay',
  });
  await payment.save();

  return { order, payment, customer };
}

describe('BillerService - Auto Generation', () => {
  test('Auto-generate COD bill on order confirmation', async () => {
    const { order, payment } = await createTestOrder('COD', 'pending');
    order.orderStatus = 'confirmed';
    await order.save();

    const bill = await BillerService.autoGenerateBill(order._id.toString());

    expect(bill).not.toBeNull();
    expect(bill?.billType).toBe('COD');
    expect(bill?.amountToCollect).toBe(1230);
    expect(bill?.status).toBe('active');
    expect(bill?.createdBy).toBe('system');
  });

  test('Auto-generate PAID bill when payment succeeds', async () => {
    const { order, payment } = await createTestOrder('card', 'pending');
    payment.status = 'paid';
    await payment.save();

    const bill = await BillerService.autoGenerateBill(order._id.toString());

    expect(bill).not.toBeNull();
    expect(bill?.billType).toBe('PAID');
    expect(bill?.amountPaid).toBe(1230);
  });

  test('Prevent duplicate bill generation', async () => {
    const { order } = await createTestOrder('COD', 'pending');

    const bill1 = await BillerService.autoGenerateBill(order._id.toString());
    const bill2 = await BillerService.autoGenerateBill(order._id.toString());

    expect(bill1).not.toBeNull();
    expect(bill2).toBeNull(); // Should return null for duplicate
  });
});

describe('BillerService - Manual CRUD', () => {
  test('Create bill manually with admin override', async () => {
    const { order, payment } = await createTestOrder('COD', 'pending');

    const bill = await BillerService.createBiller({
      orderId: order._id.toString(),
      paymentId: payment._id.toString(),
      createdBy: 'admin',
      createdById: 'admin-user-id',
      notes: 'Manual creation for testing',
    });

    expect(bill).toBeDefined();
    expect(bill.createdBy).toBe('admin');
    expect(bill.notes).toBe('Manual creation for testing');
    expect(bill.auditLog.length).toBeGreaterThan(0);
  });

  test('Retrieve bill by ID', async () => {
    const { order, payment } = await createTestOrder('COD', 'pending');
    const createdBill = await BillerService.createBiller({
      orderId: order._id.toString(),
      paymentId: payment._id.toString(),
      createdBy: 'system',
    });

    const retrievedBill = await BillerService.getBiller(createdBill._id.toString());

    expect(retrievedBill).toBeDefined();
    expect(retrievedBill?._id).toEqual(createdBill._id);
  });

  test('List bills with filters', async () => {
    const { order: order1, payment: payment1 } = await createTestOrder('COD', 'pending');
    const { order: order2, payment: payment2 } = await createTestOrder('card', 'paid');

    await BillerService.createBiller({
      orderId: order1._id.toString(),
      paymentId: payment1._id.toString(),
      createdBy: 'system',
    });

    await BillerService.createBiller({
      orderId: order2._id.toString(),
      paymentId: payment2._id.toString(),
      createdBy: 'system',
    });

    // List COD bills
    const { bills, total } = await BillerService.listBillers({ billType: 'COD' });

    expect(total).toBeGreaterThanOrEqual(1);
    expect(bills.some((b) => b.billType === 'COD')).toBe(true);
  });

  test('Update bill amount and notes', async () => {
    const { order, payment } = await createTestOrder('COD', 'pending');
    const bill = await BillerService.createBiller({
      orderId: order._id.toString(),
      paymentId: payment._id.toString(),
      createdBy: 'system',
    });

    const updated = await BillerService.updateBiller(bill._id.toString(), {
      amountToCollect: 1500,
      notes: 'Updated amount',
      updatedBy: 'admin-id',
    });

    expect(updated.amountToCollect).toBe(1500);
    expect(updated.notes).toBe('Updated amount');
    expect(updated.auditLog.length).toBeGreaterThan(1);
    expect(updated.auditLog[updated.auditLog.length - 1].action).toBe('edited');
  });

  test('Cancel bill with reason', async () => {
    const { order, payment } = await createTestOrder('COD', 'pending');
    const bill = await BillerService.createBiller({
      orderId: order._id.toString(),
      paymentId: payment._id.toString(),
      createdBy: 'system',
    });

    const cancelled = await BillerService.cancelBiller(bill._id.toString(), 'Order cancelled by customer');

    expect(cancelled.status).toBe('cancelled');
    expect(cancelled.auditLog[cancelled.auditLog.length - 1].action).toBe('cancelled');
    expect(cancelled.auditLog[cancelled.auditLog.length - 1].reason).toBe(
      'Order cancelled by customer'
    );
  });

  test('Prevent editing cancelled bill', async () => {
    const { order, payment } = await createTestOrder('COD', 'pending');
    const bill = await BillerService.createBiller({
      orderId: order._id.toString(),
      paymentId: payment._id.toString(),
      createdBy: 'system',
    });

    await BillerService.cancelBiller(bill._id.toString(), 'Test cancellation');

    try {
      await BillerService.updateBiller(bill._id.toString(), { amountToCollect: 2000 });
      expect(true).toBe(false); // Should throw error
    } catch (error: any) {
      expect(error.message).toContain('Cannot edit a cancelled bill');
    }
  });

  test('Regenerate bill creates new and archives old', async () => {
    const { order, payment } = await createTestOrder('COD', 'pending');
    const oldBill = await BillerService.createBiller({
      orderId: order._id.toString(),
      paymentId: payment._id.toString(),
      createdBy: 'system',
    });

    const newBill = await BillerService.regenerateBiller(oldBill._id.toString(), 'admin-id');

    // Old bill should be cancelled
    const oldBillAfter = await BillerService.getBiller(oldBill._id.toString());
    expect(oldBillAfter?.status).toBe('cancelled');

    // New bill should be active
    expect(newBill.status).toBe('active');
    expect(newBill._id).not.toEqual(oldBill._id);
  });

  test('Delete bill only if not printed', async () => {
    const { order, payment } = await createTestOrder('COD', 'pending');
    const bill = await BillerService.createBiller({
      orderId: order._id.toString(),
      paymentId: payment._id.toString(),
      createdBy: 'system',
    });

    // Should be deletable before printing
    const deleted = await BillerService.deleteBiller(bill._id.toString());
    expect(deleted).toBe(true);

    // Verify deletion
    const fetched = await BillerService.getBiller(bill._id.toString());
    expect(fetched).toBeNull();
  });

  test('Prevent deletion of printed bill', async () => {
    const { order, payment } = await createTestOrder('COD', 'pending');
    const bill = await BillerService.createBiller({
      orderId: order._id.toString(),
      paymentId: payment._id.toString(),
      createdBy: 'system',
    });

    // Print bill first
    await BillerService.printBill(bill._id.toString());

    // Should fail to delete
    try {
      await BillerService.deleteBiller(bill._id.toString());
      expect(true).toBe(false); // Should throw error
    } catch (error: any) {
      expect(error.message).toContain('Cannot delete a bill that has been printed');
    }
  });
});

describe('BillerService - Print Operations', () => {
  test('Increment print count on each print', async () => {
    const { order, payment } = await createTestOrder('COD', 'pending');
    const bill = await BillerService.createBiller({
      orderId: order._id.toString(),
      paymentId: payment._id.toString(),
      createdBy: 'system',
    });

    expect(bill.printCount).toBe(0);

    const printed1 = await BillerService.printBill(bill._id.toString());
    expect(printed1.printCount).toBe(1);

    const printed2 = await BillerService.printBill(bill._id.toString());
    expect(printed2.printCount).toBe(2);
  });

  test('Track last printed timestamp', async () => {
    const { order, payment } = await createTestOrder('COD', 'pending');
    const bill = await BillerService.createBiller({
      orderId: order._id.toString(),
      paymentId: payment._id.toString(),
      createdBy: 'system',
    });

    expect(bill.lastPrintedAt).toBeUndefined();

    const printed = await BillerService.printBill(bill._id.toString());
    expect(printed.lastPrintedAt).toBeDefined();
  });

  test('Prevent printing cancelled bill', async () => {
    const { order, payment } = await createTestOrder('COD', 'pending');
    const bill = await BillerService.createBiller({
      orderId: order._id.toString(),
      paymentId: payment._id.toString(),
      createdBy: 'system',
    });

    await BillerService.cancelBiller(bill._id.toString(), 'Test');

    try {
      await BillerService.printBill(bill._id.toString());
      expect(true).toBe(false); // Should throw error
    } catch (error: any) {
      expect(error.message).toContain('Cannot print a cancelled bill');
    }
  });
});

describe('BillerService - Audit & Security', () => {
  test('Create audit log entry on each action', async () => {
    const { order, payment } = await createTestOrder('COD', 'pending');
    const bill = await BillerService.createBiller({
      orderId: order._id.toString(),
      paymentId: payment._id.toString(),
      createdBy: 'admin',
      createdById: 'user-123',
    });

    expect(bill.auditLog.length).toBe(1);
    expect(bill.auditLog[0].action).toBe('created');
    expect(bill.auditLog[0].actor).toBe('admin');
  });

  test('Track changes in audit log', async () => {
    const { order, payment } = await createTestOrder('COD', 'pending');
    const bill = await BillerService.createBiller({
      orderId: order._id.toString(),
      paymentId: payment._id.toString(),
      createdBy: 'system',
    });

    const updated = await BillerService.updateBiller(bill._id.toString(), {
      amountToCollect: 2000,
      updatedBy: 'admin-id',
    });

    const editLog = updated.auditLog.find((log) => log.action === 'edited');
    expect(editLog).toBeDefined();
    expect(editLog?.changes?.amountToCollect?.old).toBe(1230);
    expect(editLog?.changes?.amountToCollect?.new).toBe(2000);
  });

  test('Get audit log for bill', async () => {
    const { order, payment } = await createTestOrder('COD', 'pending');
    const bill = await BillerService.createBiller({
      orderId: order._id.toString(),
      paymentId: payment._id.toString(),
      createdBy: 'system',
    });

    await BillerService.printBill(bill._id.toString());
    await BillerService.updateBiller(bill._id.toString(), {
      amountToCollect: 1500,
      updatedBy: 'admin',
    });

    const auditLog = await BillerService.getAuditLog(bill._id.toString());

    expect(auditLog.length).toBe(3); // created, printed, edited
    expect(auditLog.map((log) => log.action)).toEqual(['created', 'printed', 'edited']);
  });

  test('Verify bill printability', async () => {
    const { order, payment } = await createTestOrder('COD', 'pending');
    const bill = await BillerService.createBiller({
      orderId: order._id.toString(),
      paymentId: payment._id.toString(),
      createdBy: 'system',
    });

    // Should be printable when active
    let printable = await BillerService.canPrintBill(bill._id.toString());
    expect(printable).toBe(true);

    // Should not be printable when cancelled
    await BillerService.cancelBiller(bill._id.toString(), 'Test');
    printable = await BillerService.canPrintBill(bill._id.toString());
    expect(printable).toBe(false);
  });

  test('Get bill for specific order', async () => {
    const { order: order1, payment: payment1 } = await createTestOrder('COD', 'pending');
    const { order: order2, payment: payment2 } = await createTestOrder('COD', 'pending');

    const bill1 = await BillerService.createBiller({
      orderId: order1._id.toString(),
      paymentId: payment1._id.toString(),
      createdBy: 'system',
    });

    const bill2 = await BillerService.createBiller({
      orderId: order2._id.toString(),
      paymentId: payment2._id.toString(),
      createdBy: 'system',
    });

    const retrieved1 = await BillerService.getBillForOrder(order1._id.toString());
    const retrieved2 = await BillerService.getBillForOrder(order2._id.toString());

    expect(retrieved1?._id).toEqual(bill1._id);
    expect(retrieved2?._id).toEqual(bill2._id);
    expect(retrieved1?._id).not.toEqual(retrieved2?._id);
  });
});

describe('BillerService - Data Integrity', () => {
  test('Snapshots are immutable', async () => {
    const { order, payment } = await createTestOrder('COD', 'pending');
    const bill = await BillerService.createBiller({
      orderId: order._id.toString(),
      paymentId: payment._id.toString(),
      createdBy: 'system',
    });

    const originalCustomerName = bill.customerSnapshot.name;
    const originalOrderNumber = bill.orderSnapshot.orderNumber;

    // Simulate customer name change (shouldn't affect bill)
    const customer = await Customer.findById(order.customerId);
    if (customer) {
      customer.name = 'Updated Name';
      await customer.save();
    }

    // Bill snapshot should remain unchanged
    const refetchedBill = await BillerService.getBiller(bill._id.toString());
    expect(refetchedBill?.customerSnapshot.name).toBe(originalCustomerName);
    expect(refetchedBill?.orderSnapshot.orderNumber).toBe(originalOrderNumber);
  });

  test('Amount validation', async () => {
    const { order, payment } = await createTestOrder('COD', 'pending');

    const bill = await BillerService.createBiller({
      orderId: order._id.toString(),
      paymentId: payment._id.toString(),
      createdBy: 'system',
    });

    // COD bill should have amountToCollect
    if (bill.billType === 'COD') {
      expect(bill.amountToCollect).toBe(order.totals.grandTotal);
      expect(bill.amountPaid).toBe(0);
    }
  });

  test('Order total matches bill amount', async () => {
    const { order, payment } = await createTestOrder('COD', 'pending');

    const bill = await BillerService.createBiller({
      orderId: order._id.toString(),
      paymentId: payment._id.toString(),
      createdBy: 'system',
    });

    const billAmount = bill.billType === 'COD' ? bill.amountToCollect : bill.amountPaid;
    expect(billAmount).toBe(order.totals.grandTotal);
  });
});
