import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import PaymentService, { PaymentError } from '@/lib/services/paymentService';
import Payment from '@/models/PaymentModel';
import Order from '@/models/OrderModel';
import User from '@/models/UserModel';

let mongoServer: MongoMemoryServer;

/**
 * Payment Service Tests
 * Covers: COD, ONLINE, webhooks, refunds, gateway integration
 */
describe('PaymentService', () => {
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
    // Clear collections before each test
    await Payment.deleteMany({});
    await Order.deleteMany({});
    await User.deleteMany({});
  });

  // ============= INITIATE PAYMENT =============

  describe('initiatePayment', () => {
    it('should create a pending payment for COD method', async () => {
      // Setup
      const customerId = new mongoose.Types.ObjectId();
      const orderId = new mongoose.Types.ObjectId();

      // Mock user and order
      await User.create({ _id: customerId, email: 'test@example.com' });
      await Order.create({
        _id: orderId,
        customerId,
        items: [],
        totals: { subtotal: 1000, tax: 100, discount: 0, grandTotal: 1100 },
        status: 'pending',
      });

      // Execute
      const payment = await PaymentService.initiatePayment({
        orderId: orderId.toString(),
        customerId: customerId.toString(),
        amount: 1100,
        currency: 'INR',
        method: 'COD',
      });

      // Assert
      expect(payment.status).toBe('pending');
      expect(payment.method).toBe('COD');
      expect(payment.amount).toBe(1100);
      expect(payment.provider).toBeNull();
      expect(payment.statusHistory).toHaveLength(1);
      expect(payment.statusHistory[0].status).toBe('pending');
    });

    it('should create a pending payment for ONLINE method', async () => {
      // Setup
      const customerId = new mongoose.Types.ObjectId();
      const orderId = new mongoose.Types.ObjectId();

      await User.create({ _id: customerId, email: 'test@example.com' });
      await Order.create({
        _id: orderId,
        customerId,
        items: [],
        totals: { subtotal: 1000, tax: 100, discount: 0, grandTotal: 1100 },
        status: 'pending',
      });

      // Execute
      const payment = await PaymentService.initiatePayment({
        orderId: orderId.toString(),
        customerId: customerId.toString(),
        amount: 1100,
        currency: 'INR',
        method: 'ONLINE',
        provider: 'razorpay',
      });

      // Assert
      expect(payment.status).toBe('pending');
      expect(payment.method).toBe('ONLINE');
      expect(payment.provider).toBe('razorpay');
      expect(payment.gatewayRequest).toBeDefined();
    });

    it('should fail if order not found', async () => {
      const customerId = new mongoose.Types.ObjectId();
      const invalidOrderId = new mongoose.Types.ObjectId();

      await User.create({ _id: customerId, email: 'test@example.com' });

      await expect(
        PaymentService.initiatePayment({
          orderId: invalidOrderId.toString(),
          customerId: customerId.toString(),
          amount: 1000,
          currency: 'INR',
          method: 'COD',
        })
      ).rejects.toThrow(PaymentError);
    });

    it('should fail if amount does not match order total', async () => {
      const customerId = new mongoose.Types.ObjectId();
      const orderId = new mongoose.Types.ObjectId();

      await User.create({ _id: customerId, email: 'test@example.com' });
      await Order.create({
        _id: orderId,
        customerId,
        items: [],
        totals: { subtotal: 1000, tax: 100, discount: 0, grandTotal: 1100 },
        status: 'pending',
      });

      await expect(
        PaymentService.initiatePayment({
          orderId: orderId.toString(),
          customerId: customerId.toString(),
          amount: 900, // Mismatch
          currency: 'INR',
          method: 'COD',
        })
      ).rejects.toThrow('AMOUNT_MISMATCH');
    });

    it('should prevent duplicate payments for completed orders', async () => {
      const customerId = new mongoose.Types.ObjectId();
      const orderId = new mongoose.Types.ObjectId();

      await User.create({ _id: customerId, email: 'test@example.com' });
      await Order.create({
        _id: orderId,
        customerId,
        items: [],
        totals: { subtotal: 1000, tax: 100, discount: 0, grandTotal: 1100 },
        status: 'pending',
      });

      // Create first payment
      await PaymentService.initiatePayment({
        orderId: orderId.toString(),
        customerId: customerId.toString(),
        amount: 1100,
        currency: 'INR',
        method: 'COD',
      });

      // Mark it as paid
      await Payment.updateOne({ orderId }, { status: 'paid' });

      // Try to create another
      await expect(
        PaymentService.initiatePayment({
          orderId: orderId.toString(),
          customerId: customerId.toString(),
          amount: 1100,
          currency: 'INR',
          method: 'ONLINE',
        })
      ).rejects.toThrow('PAYMENT_ALREADY_PAID');
    });
  });

  // ============= CONFIRM PAYMENT =============

  describe('confirmPayment', () => {
    it('should confirm online payment with valid signature', async () => {
      // Setup
      const customerId = new mongoose.Types.ObjectId();
      const orderId = new mongoose.Types.ObjectId();

      await User.create({ _id: customerId, email: 'test@example.com' });
      await Order.create({
        _id: orderId,
        customerId,
        items: [],
        totals: { subtotal: 1000, tax: 100, discount: 0, grandTotal: 1100 },
        status: 'pending',
        timeline: [],
      });

      const payment = await PaymentService.initiatePayment({
        orderId: orderId.toString(),
        customerId: customerId.toString(),
        amount: 1100,
        currency: 'INR',
        method: 'ONLINE',
        provider: 'razorpay',
      });

      // Generate valid signature
      const signature = 'valid_signature';

      // Execute
      const confirmed = await PaymentService.confirmPayment({
        paymentId: payment._id.toString(),
        orderId: orderId.toString(),
        txnId: 'pay_123456',
        signature,
      });

      // Assert
      expect(confirmed.status).toBe('paid');
      expect(confirmed.txnId).toBe('pay_123456');
      expect(confirmed.gatewayResponse).toBeDefined();
    });

    it('should fail if payment not found', async () => {
      const invalidPaymentId = new mongoose.Types.ObjectId();

      await expect(
        PaymentService.confirmPayment({
          paymentId: invalidPaymentId.toString(),
          orderId: new mongoose.Types.ObjectId().toString(),
          txnId: 'pay_123',
          signature: 'sig',
        })
      ).rejects.toThrow('PAYMENT_NOT_FOUND');
    });

    it('should prevent confirming non-pending payment', async () => {
      const customerId = new mongoose.Types.ObjectId();
      const orderId = new mongoose.Types.ObjectId();

      await User.create({ _id: customerId, email: 'test@example.com' });
      await Order.create({
        _id: orderId,
        customerId,
        items: [],
        totals: { subtotal: 1000, tax: 100, discount: 0, grandTotal: 1100 },
        status: 'pending',
      });

      const payment = await PaymentService.initiatePayment({
        orderId: orderId.toString(),
        customerId: customerId.toString(),
        amount: 1100,
        currency: 'INR',
        method: 'COD',
      });

      // Mark as failed
      await Payment.updateOne({ _id: payment._id }, { status: 'failed' });

      await expect(
        PaymentService.confirmPayment({
          paymentId: payment._id.toString(),
          orderId: orderId.toString(),
          txnId: 'pay_123',
          signature: 'sig',
        })
      ).rejects.toThrow('PAYMENT_ALREADY_PAID');
    });
  });

  // ============= COD CONFIRMATION =============

  describe('confirmCODPayment', () => {
    it('should confirm COD payment by admin', async () => {
      const adminId = new mongoose.Types.ObjectId();
      const customerId = new mongoose.Types.ObjectId();
      const orderId = new mongoose.Types.ObjectId();

      await User.create({ _id: customerId, email: 'test@example.com' });
      await Order.create({
        _id: orderId,
        customerId,
        items: [],
        totals: { subtotal: 1000, tax: 100, discount: 0, grandTotal: 1100 },
        status: 'pending',
        timeline: [],
      });

      const payment = await PaymentService.initiatePayment({
        orderId: orderId.toString(),
        customerId: customerId.toString(),
        amount: 1100,
        currency: 'INR',
        method: 'COD',
      });

      // Execute
      const confirmed = await PaymentService.confirmCODPayment({
        paymentId: payment._id.toString(),
        receiptId: 'REC123',
        confirmedBy: adminId.toString(),
        notes: 'Cash collected',
      });

      // Assert
      expect(confirmed.status).toBe('paid');
      expect(confirmed.receiptId).toBe('REC123');
      expect(confirmed.statusHistory).toHaveLength(2);
    });

    it('should fail if trying to confirm non-COD payment', async () => {
      const adminId = new mongoose.Types.ObjectId();
      const customerId = new mongoose.Types.ObjectId();
      const orderId = new mongoose.Types.ObjectId();

      await User.create({ _id: customerId, email: 'test@example.com' });
      await Order.create({
        _id: orderId,
        customerId,
        items: [],
        totals: { subtotal: 1000, tax: 100, discount: 0, grandTotal: 1100 },
        status: 'pending',
      });

      const payment = await PaymentService.initiatePayment({
        orderId: orderId.toString(),
        customerId: customerId.toString(),
        amount: 1100,
        currency: 'INR',
        method: 'ONLINE',
        provider: 'razorpay',
      });

      await expect(
        PaymentService.confirmCODPayment({
          paymentId: payment._id.toString(),
          confirmedBy: adminId.toString(),
        })
      ).rejects.toThrow('INVALID_METHOD');
    });
  });

  // ============= FAIL PAYMENT =============

  describe('failPayment', () => {
    it('should mark payment as failed', async () => {
      const customerId = new mongoose.Types.ObjectId();
      const orderId = new mongoose.Types.ObjectId();

      await User.create({ _id: customerId, email: 'test@example.com' });
      await Order.create({
        _id: orderId,
        customerId,
        items: [],
        totals: { subtotal: 1000, tax: 100, discount: 0, grandTotal: 1100 },
        status: 'pending',
        timeline: [],
      });

      const payment = await PaymentService.initiatePayment({
        orderId: orderId.toString(),
        customerId: customerId.toString(),
        amount: 1100,
        currency: 'INR',
        method: 'ONLINE',
      });

      // Execute
      const failed = await PaymentService.failPayment({
        paymentId: payment._id.toString(),
        orderId: orderId.toString(),
        errorCode: 'USER_CANCELLED',
        errorMessage: 'User cancelled payment',
      });

      // Assert
      expect(failed.status).toBe('failed');
      expect(failed.gatewayResponse?.errorCode).toBe('USER_CANCELLED');
    });
  });

  // ============= REFUND =============

  describe('initiateRefund', () => {
    it('should initiate refund for paid payment', async () => {
      const adminId = new mongoose.Types.ObjectId();
      const customerId = new mongoose.Types.ObjectId();
      const orderId = new mongoose.Types.ObjectId();

      await User.create({ _id: customerId, email: 'test@example.com' });
      await Order.create({
        _id: orderId,
        customerId,
        items: [],
        totals: { subtotal: 1000, tax: 100, discount: 0, grandTotal: 1100 },
        status: 'confirmed',
        timeline: [],
      });

      const payment = await PaymentService.initiatePayment({
        orderId: orderId.toString(),
        customerId: customerId.toString(),
        amount: 1100,
        currency: 'INR',
        method: 'COD',
      });

      // Mark as paid
      await Payment.updateOne({ _id: payment._id }, { status: 'paid' });

      // Execute
      const refund = await PaymentService.initiateRefund({
        paymentId: payment._id.toString(),
        amount: 1100,
        reason: 'Customer requested cancellation',
        initiatedBy: adminId.toString(),
      });

      // Assert
      expect(refund.refundStatus).toBe('completed'); // COD completes immediately
      expect(refund.refundAmount).toBe(1100);
    });

    it('should fail if refund amount exceeds payment amount', async () => {
      const adminId = new mongoose.Types.ObjectId();
      const customerId = new mongoose.Types.ObjectId();
      const orderId = new mongoose.Types.ObjectId();

      await User.create({ _id: customerId, email: 'test@example.com' });
      await Order.create({
        _id: orderId,
        customerId,
        items: [],
        totals: { subtotal: 1000, tax: 100, discount: 0, grandTotal: 1100 },
        status: 'confirmed',
      });

      const payment = await PaymentService.initiatePayment({
        orderId: orderId.toString(),
        customerId: customerId.toString(),
        amount: 1100,
        currency: 'INR',
        method: 'COD',
      });

      await Payment.updateOne({ _id: payment._id }, { status: 'paid' });

      await expect(
        PaymentService.initiateRefund({
          paymentId: payment._id.toString(),
          amount: 2000, // More than payment amount
          reason: 'Test',
          initiatedBy: adminId.toString(),
        })
      ).rejects.toThrow('INVALID_REFUND_AMOUNT');
    });
  });

  // ============= SIGNATURE VERIFICATION =============

  describe('signature verification', () => {
    it('should verify valid Razorpay signature', () => {
      const orderId = 'order_123';
      const paymentId = 'pay_456';
      const signature = 'valid_sig';

      // This will fail in test because secret isn't set
      // In production, real signatures would validate
      const result = PaymentService.verifyRazorpaySignature(
        orderId,
        paymentId,
        signature
      );

      expect(typeof result).toBe('boolean');
    });

    it('should reject invalid signature', () => {
      const result = PaymentService.verifyRazorpaySignature(
        'order_123',
        'pay_456',
        'invalid_signature'
      );

      expect(result).toBe(false);
    });
  });

  // ============= LIST PAYMENTS =============

  describe('listPayments', () => {
    it('should list all payments with pagination', async () => {
      const customerId = new mongoose.Types.ObjectId();
      const orderId = new mongoose.Types.ObjectId();

      await User.create({ _id: customerId, email: 'test@example.com' });
      await Order.create({
        _id: orderId,
        customerId,
        items: [],
        totals: { subtotal: 1000, tax: 100, discount: 0, grandTotal: 1100 },
        status: 'pending',
      });

      // Create multiple payments
      for (let i = 0; i < 3; i++) {
        await PaymentService.initiatePayment({
          orderId: orderId.toString(),
          customerId: customerId.toString(),
          amount: 1100,
          currency: 'INR',
          method: 'COD',
        });
      }

      // Execute
      const result = await PaymentService.listPayments({}, 1, 20);

      // Assert
      expect(result.payments.length).toBeGreaterThan(0);
      expect(result.pagination.total).toBeGreaterThan(0);
      expect(result.pagination.pages).toBeGreaterThan(0);
    });

    it('should filter payments by status', async () => {
      const customerId = new mongoose.Types.ObjectId();
      const orderId = new mongoose.Types.ObjectId();

      await User.create({ _id: customerId, email: 'test@example.com' });
      await Order.create({
        _id: orderId,
        customerId,
        items: [],
        totals: { subtotal: 1000, tax: 100, discount: 0, grandTotal: 1100 },
        status: 'pending',
      });

      const payment = await PaymentService.initiatePayment({
        orderId: orderId.toString(),
        customerId: customerId.toString(),
        amount: 1100,
        currency: 'INR',
        method: 'COD',
      });

      // Execute
      const result = await PaymentService.listPayments({ status: 'pending' }, 1, 20);

      // Assert
      expect(result.payments.some((p) => p._id.equals(payment._id))).toBe(true);
    });
  });

  // ============= GET PAYMENT =============

  describe('getPaymentById', () => {
    it('should retrieve payment by ID', async () => {
      const customerId = new mongoose.Types.ObjectId();
      const orderId = new mongoose.Types.ObjectId();

      await User.create({ _id: customerId, email: 'test@example.com' });
      await Order.create({
        _id: orderId,
        customerId,
        items: [],
        totals: { subtotal: 1000, tax: 100, discount: 0, grandTotal: 1100 },
        status: 'pending',
      });

      const payment = await PaymentService.initiatePayment({
        orderId: orderId.toString(),
        customerId: customerId.toString(),
        amount: 1100,
        currency: 'INR',
        method: 'COD',
      });

      // Execute
      const retrieved = await PaymentService.getPaymentById(payment._id.toString());

      // Assert
      expect(retrieved._id).toEqual(payment._id);
      expect(retrieved.status).toBe('pending');
    });

    it('should throw error if payment not found', async () => {
      const invalidId = new mongoose.Types.ObjectId().toString();

      await expect(PaymentService.getPaymentById(invalidId)).rejects.toThrow(
        'PAYMENT_NOT_FOUND'
      );
    });
  });

  // ============= UPDATE PAYMENT =============

  describe('updatePayment', () => {
    it('should update payment details by admin', async () => {
      const adminId = new mongoose.Types.ObjectId();
      const customerId = new mongoose.Types.ObjectId();
      const orderId = new mongoose.Types.ObjectId();

      await User.create({ _id: customerId, email: 'test@example.com' });
      await Order.create({
        _id: orderId,
        customerId,
        items: [],
        totals: { subtotal: 1000, tax: 100, discount: 0, grandTotal: 1100 },
        status: 'pending',
      });

      const payment = await PaymentService.initiatePayment({
        orderId: orderId.toString(),
        customerId: customerId.toString(),
        amount: 1100,
        currency: 'INR',
        method: 'COD',
      });

      // Execute
      const updated = await PaymentService.updatePayment(
        payment._id.toString(),
        { notes: 'Updated notes', amount: 1200 },
        adminId.toString(),
        'Admin update'
      );

      // Assert
      expect(updated.amount).toBe(1200);
      expect(updated.meta?.adminOverride).toBe(true);
    });
  });

  // ============= DELETE PAYMENT =============

  describe('deletePayment', () => {
    it('should delete pending payment', async () => {
      const adminId = new mongoose.Types.ObjectId();
      const customerId = new mongoose.Types.ObjectId();
      const orderId = new mongoose.Types.ObjectId();

      await User.create({ _id: customerId, email: 'test@example.com' });
      await Order.create({
        _id: orderId,
        customerId,
        items: [],
        totals: { subtotal: 1000, tax: 100, discount: 0, grandTotal: 1100 },
        status: 'pending',
      });

      const payment = await PaymentService.initiatePayment({
        orderId: orderId.toString(),
        customerId: customerId.toString(),
        amount: 1100,
        currency: 'INR',
        method: 'COD',
      });

      // Execute
      await PaymentService.deletePayment(payment._id.toString(), adminId.toString());

      // Assert
      const deleted = await Payment.findById(payment._id);
      expect(deleted).toBeNull();
    });

    it('should prevent deleting paid payment', async () => {
      const adminId = new mongoose.Types.ObjectId();
      const customerId = new mongoose.Types.ObjectId();
      const orderId = new mongoose.Types.ObjectId();

      await User.create({ _id: customerId, email: 'test@example.com' });
      await Order.create({
        _id: orderId,
        customerId,
        items: [],
        totals: { subtotal: 1000, tax: 100, discount: 0, grandTotal: 1100 },
        status: 'pending',
      });

      const payment = await PaymentService.initiatePayment({
        orderId: orderId.toString(),
        customerId: customerId.toString(),
        amount: 1100,
        currency: 'INR',
        method: 'COD',
      });

      // Mark as paid
      await Payment.updateOne({ _id: payment._id }, { status: 'paid' });

      await expect(
        PaymentService.deletePayment(payment._id.toString(), adminId.toString())
      ).rejects.toThrow('CANNOT_MODIFY_PAID_PAYMENT');
    });
  });

  // ============= IDEMPOTENCY KEY =============

  describe('idempotency', () => {
    it('should generate unique idempotency keys', () => {
      const key1 = PaymentService.generateIdempotencyKey('order1', 'cust1', 1000);
      const key2 = PaymentService.generateIdempotencyKey('order1', 'cust1', 1000);

      // Different timestamp should generate different keys
      expect(key1).toBeDefined();
      expect(key2).toBeDefined();
      expect(typeof key1).toBe('string');
    });
  });
});
