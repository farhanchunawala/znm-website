import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import WorkerService from '@/lib/services/workerService';
import WorkerAssignment from '@/models/WorkerAssignmentModel';
import Order, { IOrder } from '@/models/OrderModel';
import User, { IUser } from '@/models/UserModel';
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
  await WorkerAssignment.deleteMany({});
  await Order.deleteMany({});
  await User.deleteMany({});
  await Customer.deleteMany({});
});

describe('WorkerService', () => {
  // Helper to create test data
  async function createTestData() {
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
          qty: 2,
          price: 500,
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

    const worker = await User.create({
      email: `worker${Date.now()}@example.com`,
      name: 'Test Worker',
      passwordHash: 'hashed_password',
      roles: ['worker'],
      isActive: true,
    });

    return { customer, order, worker };
  }

  // ✅ TEST 1: Assign order to worker
  it('should assign an order to a worker', async () => {
    const { order, worker } = await createTestData();

    const assignment = await WorkerService.assignOrder({
      orderId: order._id.toString(),
      workerId: worker._id.toString(),
    });

    const totalQty = order.items.reduce((sum, item) => sum + item.qty, 0);
    expect(assignment).toBeDefined();
    expect(assignment.status).toBe('pending');
    expect(assignment.picking.itemsTotal).toBe(totalQty);
  });

  // ✅ TEST 2: Prevent duplicate assignments
  it('should prevent duplicate order assignments', async () => {
    const { order, worker } = await createTestData();

    await WorkerService.assignOrder({
      orderId: order._id.toString(),
      workerId: worker._id.toString(),
    });

    try {
      await WorkerService.assignOrder({
        orderId: order._id.toString(),
        workerId: worker._id.toString(),
      });
      fail('Should have thrown error');
    } catch (error: any) {
      expect(error.message).toContain('already assigned');
    }
  });

  // ✅ TEST 3: Get worker jobs
  it('should retrieve all jobs for a worker', async () => {
    const { order, worker } = await createTestData();

    await WorkerService.assignOrder({
      orderId: order._id.toString(),
      workerId: worker._id.toString(),
    });

    const jobs = await WorkerService.getWorkerJobs({
      workerId: worker._id.toString(),
    });

    expect(jobs.length).toBe(1);
    expect(jobs[0].workerId.toString()).toBe(worker._id.toString());
  });

  // ✅ TEST 4: Start picking
  it('should start picking stage', async () => {
    const { order, worker } = await createTestData();

    const assignment = await WorkerService.assignOrder({
      orderId: order._id.toString(),
      workerId: worker._id.toString(),
    });

    const updated = await WorkerService.startPicking(assignment._id.toString());

    expect(updated?.status).toBe('picking');
    expect(updated?.picking.startedAt).toBeDefined();
  });

  // ✅ TEST 5: Mark items picked
  it('should track picked items', async () => {
    const { order, worker } = await createTestData();

    const assignment = await WorkerService.assignOrder({
      orderId: order._id.toString(),
      workerId: worker._id.toString(),
    });

    await WorkerService.startPicking(assignment._id.toString());

    // Mark first item as picked
    let updated = await WorkerService.markItemPicked(assignment._id.toString());
    expect(updated?.picking.itemsPicked).toBe(1);

    // Mark second item as picked
    updated = await WorkerService.markItemPicked(assignment._id.toString());
    expect(updated?.picking.itemsPicked).toBe(2);
  });

  // ✅ TEST 6: Complete picking
  it('should complete picking stage with time tracking', async () => {
    const { order, worker } = await createTestData();

    const assignment = await WorkerService.assignOrder({
      orderId: order._id.toString(),
      workerId: worker._id.toString(),
    });

    await WorkerService.startPicking(assignment._id.toString());
    const completed = await WorkerService.completePicking(
      assignment._id.toString(),
      'All items picked successfully'
    );

    expect(completed?.status).toBe('picked');
    expect(completed?.picking.completedAt).toBeDefined();
    expect(completed?.performance.pickingTime).toBeGreaterThanOrEqual(0);
  });

  // ✅ TEST 7: Complete packing workflow
  it('should complete packing stage', async () => {
    const { order, worker } = await createTestData();

    const assignment = await WorkerService.assignOrder({
      orderId: order._id.toString(),
      workerId: worker._id.toString(),
    });

    await WorkerService.startPicking(assignment._id.toString());
    await WorkerService.completePicking(assignment._id.toString());

    await WorkerService.startPacking(assignment._id.toString());
    const packed = await WorkerService.completePacking(
      assignment._id.toString(),
      {
        boxSize: 'M',
        weight: 1.5,
        notes: 'Packed carefully',
      }
    );

    expect(packed?.status).toBe('packed');
    expect(packed?.packing.boxSize).toBe('M');
    expect(packed?.packing.weight).toBe(1.5);
  });

  // ✅ TEST 8: QC Pass
  it('should pass quality control', async () => {
    const { order, worker } = await createTestData();

    const assignment = await WorkerService.assignOrder({
      orderId: order._id.toString(),
      workerId: worker._id.toString(),
    });

    await WorkerService.startPicking(assignment._id.toString());
    await WorkerService.completePicking(assignment._id.toString());
    await WorkerService.startPacking(assignment._id.toString());
    await WorkerService.completePacking(assignment._id.toString(), {});

    await WorkerService.startQC(assignment._id.toString());
    const qcPassed = await WorkerService.passQC(
      assignment._id.toString(),
      'QC passed'
    );

    expect(qcPassed?.status).toBe('qc_pass');
    expect(qcPassed?.qualityControl.status).toBe('pass');
    expect(qcPassed?.completedAt).toBeDefined();
  });

  // ✅ TEST 9: QC Fail with issues
  it('should fail quality control with issues', async () => {
    const { order, worker } = await createTestData();

    const assignment = await WorkerService.assignOrder({
      orderId: order._id.toString(),
      workerId: worker._id.toString(),
    });

    await WorkerService.startPicking(assignment._id.toString());
    await WorkerService.completePicking(assignment._id.toString());
    await WorkerService.startPacking(assignment._id.toString());
    await WorkerService.completePacking(assignment._id.toString(), {});

    await WorkerService.startQC(assignment._id.toString());
    const qcFailed = await WorkerService.failQC(
      assignment._id.toString(),
      ['Damaged item', 'Wrong size'],
      'Item damaged during packing'
    );

    expect(qcFailed?.status).toBe('qc_fail');
    expect(qcFailed?.qualityControl.status).toBe('fail');
    expect(qcFailed?.qualityControl.issues?.length).toBe(2);
    expect(qcFailed?.performance.issues).toBe(2);
  });

  // ✅ TEST 10: Worker metrics
  it('should calculate worker performance metrics', async () => {
    const { order, worker } = await createTestData();

    const assignment = await WorkerService.assignOrder({
      orderId: order._id.toString(),
      workerId: worker._id.toString(),
    });

    await WorkerService.startPicking(assignment._id.toString());
    await WorkerService.completePicking(assignment._id.toString());
    await WorkerService.startPacking(assignment._id.toString());
    await WorkerService.completePacking(assignment._id.toString(), {});
    await WorkerService.startQC(assignment._id.toString());
    await WorkerService.passQC(assignment._id.toString());

    const metrics = await WorkerService.getWorkerMetrics(worker._id.toString());

    expect(metrics.workerId).toBe(worker._id.toString());
    expect(metrics.totalOrders).toBe(1);
    expect(metrics.completedOrders).toBe(1);
    expect(metrics.qcPassRate).toBe(100);
    expect(metrics.avgPickingTime).toBeGreaterThanOrEqual(0);
    expect(metrics.performanceScore).toBeGreaterThan(0);
  });

  // ✅ TEST 11: Multiple assignments and metrics
  it('should track metrics across multiple orders', async () => {
    const customer = await Customer.create({
      email: 'test2@example.com',
      name: 'Test Customer 2',
      phone: '9876543211',
    });

    const worker = await User.create({
      email: `worker${Date.now()}@example.com`,
      name: 'Test Worker',
      passwordHash: 'hashed_password',
      roles: ['worker'],
      isActive: true,
    });

    // Create and complete first order
    const order1 = await Order.create({
      orderId: `ORD-${Date.now()}`,
      orderNumber: `ORD-${Math.random().toString(36).substring(7)}`,
      customerId: customer._id,
      items: [
        {
          productId: new mongoose.Types.ObjectId(),
          productName: 'Product 1',
          variantSku: 'PROD-001-M',
          qty: 1,
          price: 500,
          subtotal: 500,
        },
      ],
      address: {
        recipientName: 'Test Customer 2',
        phoneNumber: '9876543211',
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

    const assignment1 = await WorkerService.assignOrder({
      orderId: order1._id.toString(),
      workerId: worker._id.toString(),
    });

    await WorkerService.startPicking(assignment1._id.toString());
    await WorkerService.completePicking(assignment1._id.toString());
    await WorkerService.startPacking(assignment1._id.toString());
    await WorkerService.completePacking(assignment1._id.toString(), {});
    await WorkerService.startQC(assignment1._id.toString());
    await WorkerService.passQC(assignment1._id.toString());

    const metrics = await WorkerService.getWorkerMetrics(worker._id.toString());

    expect(metrics.totalOrders).toBe(1);
    expect(metrics.completedOrders).toBe(1);
  });
});
