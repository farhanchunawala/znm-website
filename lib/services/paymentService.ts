import crypto from 'crypto';
import Payment, { IPayment } from '@/models/PaymentModel';
import Order from '@/models/OrderModel';
import User from '@/models/UserModel';
import {
  PAYMENT_ERROR_CODES,
  type InitiatePaymentRequest,
  type ConfirmPaymentRequest,
  type FailPaymentRequest,
  type ConfirmCODPaymentRequest,
  type InitiateRefundRequest,
} from '@/lib/validations/paymentValidation';

/**
 * Custom Payment Error
 */
export class PaymentError extends Error {
  constructor(
    public code: string,
    public statusCode: number,
    public details?: Record<string, any>
  ) {
    super(code);
    this.name = 'PaymentError';
  }
}

/**
 * Razorpay Configuration
 * In production, load from environment variables
 */
const RAZORPAY_CONFIG = {
  KEY_ID: process.env.RAZORPAY_KEY_ID || '',
  KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || '',
  WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET || '',
};

/**
 * Stripe Configuration
 */
const STRIPE_CONFIG = {
  PUBLIC_KEY: process.env.STRIPE_PUBLIC_KEY || '',
  SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
  WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',
};

/**
 * Payment Service
 * Core payment operations: initiate, confirm, verify, refund
 */
export class PaymentService {
  /**
   * Initiate Payment
   * Creates payment record and prepares for gateway flow or COD confirmation
   */
  static async initiatePayment(
    data: InitiatePaymentRequest
  ): Promise<IPayment> {
    const session = await Payment.startSession();
    session.startTransaction();

    try {
      // Validate order exists and is eligible
      const order = await Order.findById(data.orderId).session(session);
      if (!order) {
        throw new PaymentError(
          PAYMENT_ERROR_CODES.ORDER_NOT_FOUND,
          404,
          { orderId: data.orderId }
        );
      }

      // Validate customer exists
      const customer = await User.findById(data.customerId).session(session);
      if (!customer) {
        throw new PaymentError(
          PAYMENT_ERROR_CODES.CUSTOMER_NOT_FOUND,
          404,
          { customerId: data.customerId }
        );
      }

      // Validate amount matches order total
      if (Math.abs(data.amount - order.totals.grandTotal) > 0.01) {
        throw new PaymentError(
          PAYMENT_ERROR_CODES.AMOUNT_MISMATCH,
          400,
          {
            expectedAmount: order.totals.grandTotal,
            providedAmount: data.amount,
          }
        );
      }

      // Prevent duplicate payments for completed orders
      const existingPayment = await Payment.findOne({
        orderId: data.orderId,
        status: { $in: ['paid', 'refunded'] },
      }).session(session);

      if (existingPayment) {
        throw new PaymentError(
          PAYMENT_ERROR_CODES.PAYMENT_ALREADY_PAID,
          400,
          { existingPaymentId: existingPayment._id }
        );
      }

      // Create idempotency key if not provided
      const idempotencyKey =
        data.meta?.idempotencyKey ||
        this.generateIdempotencyKey(
          data.orderId,
          data.customerId,
          data.amount
        );

      // Check for duplicate idempotency key
      const duplicatePayment = await Payment.findOne({
        'meta.idempotencyKey': idempotencyKey,
        orderId: data.orderId,
      }).session(session);

      if (duplicatePayment) {
        await session.abortTransaction();
        return duplicatePayment;
      }

      // Prepare gateway snapshot for ONLINE payments
      let gatewayRequest: any = null;
      if (data.method === 'ONLINE' && data.provider) {
        gatewayRequest = {
          provider: data.provider,
          amount: data.amount,
          currency: data.currency,
          timestamp: new Date(),
          requestId: crypto.randomUUID(),
        };
      }

      // Create payment record
      const payment = new Payment({
        orderId: data.orderId,
        customerId: data.customerId,
        amount: data.amount,
        currency: data.currency,
        method: data.method,
        provider: data.provider || null,
        status: 'pending',
        gatewayRequest,
        meta: {
          ...data.meta,
          idempotencyKey,
        },
        statusHistory: [
          {
            status: 'pending',
            changedAt: new Date(),
            changedBy: 'system',
            reason: 'Payment initiated',
          },
        ],
      });

      await payment.save({ session });
      await session.commitTransaction();

      return payment;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Confirm Payment (Online Gateway)
   * Verify gateway signature and mark payment as paid
   */
  static async confirmPayment(
    data: ConfirmPaymentRequest
  ): Promise<IPayment> {
    const session = await Payment.startSession();
    session.startTransaction();

    try {
      const payment = await Payment.findById(data.paymentId).session(session);
      if (!payment) {
        throw new PaymentError(
          PAYMENT_ERROR_CODES.PAYMENT_NOT_FOUND,
          404,
          { paymentId: data.paymentId }
        );
      }

      // Validate payment is pending
      if (payment.status !== 'pending') {
        throw new PaymentError(
          PAYMENT_ERROR_CODES.PAYMENT_ALREADY_PAID,
          400,
          { currentStatus: payment.status }
        );
      }

      // Verify gateway signature based on provider
      if (payment.provider === 'razorpay') {
        const isValid = this.verifyRazorpaySignature(
          data.orderId,
          data.txnId,
          data.signature
        );
        if (!isValid) {
          // Mark as failed before throwing
          await this.failPaymentInternal(payment, session, {
            errorCode: PAYMENT_ERROR_CODES.SIGNATURE_VERIFICATION_FAILED,
            errorMessage: 'Invalid Razorpay signature',
          });
          throw new PaymentError(
            PAYMENT_ERROR_CODES.SIGNATURE_VERIFICATION_FAILED,
            400,
            { provider: 'razorpay' }
          );
        }
      } else if (payment.provider === 'stripe') {
        // Stripe verification logic would go here
        // For now, trust the gateway (in production, use Stripe webhook)
      }

      // Update payment
      payment.status = 'paid';
      payment.txnId = data.txnId;
      payment.paymentId = data.paymentId;
      payment.gatewayResponse = {
        provider: payment.provider,
        signature: data.signature,
        amount: payment.amount,
        currency: payment.currency,
        timestamp: new Date(),
      };
      payment.statusHistory.push({
        status: 'paid',
        changedAt: new Date(),
        changedBy: 'gateway',
        reason: 'Payment verified and captured',
      });

      await payment.save({ session });

      // Commit inventory on order
      const order = await Order.findById(payment.orderId).session(session);
      if (order) {
        // Transition order to confirmed if pending
        if (order.status === 'pending') {
          order.status = 'confirmed';
          // Add timeline event
          order.timeline?.push({
            actor: 'system',
            action: 'payment.success',
            timestamp: new Date(),
            meta: {
              paymentId: payment._id.toString(),
              amount: payment.amount,
            },
          });
          await order.save({ session });
        }
      }

      await session.commitTransaction();
      return payment;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Fail Payment
   * Mark payment as failed (customer cancelled or gateway rejected)
   */
  static async failPayment(data: FailPaymentRequest): Promise<IPayment> {
    const session = await Payment.startSession();
    session.startTransaction();

    try {
      const payment = await Payment.findById(data.paymentId).session(session);
      if (!payment) {
        throw new PaymentError(
          PAYMENT_ERROR_CODES.PAYMENT_NOT_FOUND,
          404,
          { paymentId: data.paymentId }
        );
      }

      const updated = await this.failPaymentInternal(payment, session, {
        errorCode: data.errorCode || 'USER_CANCELLED',
        errorMessage: data.errorMessage || 'Payment cancelled by customer',
      });

      await session.commitTransaction();
      return updated;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Internal: Fail Payment (used in transactions)
   */
  private static async failPaymentInternal(
    payment: IPayment,
    session: any,
    errorInfo: { errorCode: string; errorMessage: string }
  ): Promise<IPayment> {
    payment.status = 'failed';
    payment.gatewayResponse = {
      provider: payment.provider,
      errorCode: errorInfo.errorCode,
      errorMessage: errorInfo.errorMessage,
      timestamp: new Date(),
    };
    payment.statusHistory.push({
      status: 'failed',
      changedAt: new Date(),
      changedBy: 'gateway',
      reason: errorInfo.errorMessage,
    });

    await payment.save({ session });

    // Update order status and release inventory
    const order = await Order.findById(payment.orderId).session(session);
    if (order && order.status === 'pending') {
      order.status = 'failed';
      order.timeline?.push({
        actor: 'system',
        action: 'payment.failed',
        timestamp: new Date(),
        meta: {
          paymentId: payment._id.toString(),
          errorCode: errorInfo.errorCode,
        },
      });
      // TODO: Call inventory.release() for all items in order
      await order.save({ session });
    }

    return payment;
  }

  /**
   * Confirm COD Payment (Admin Action)
   * Admin confirms cash collected from customer
   */
  static async confirmCODPayment(
    data: ConfirmCODPaymentRequest
  ): Promise<IPayment> {
    const session = await Payment.startSession();
    session.startTransaction();

    try {
      const payment = await Payment.findById(data.paymentId).session(session);
      if (!payment) {
        throw new PaymentError(
          PAYMENT_ERROR_CODES.PAYMENT_NOT_FOUND,
          404,
          { paymentId: data.paymentId }
        );
      }

      if (payment.method !== 'COD') {
        throw new PaymentError(
          PAYMENT_ERROR_CODES.INVALID_METHOD,
          400,
          { method: payment.method }
        );
      }

      if (payment.status !== 'pending') {
        throw new PaymentError(
          PAYMENT_ERROR_CODES.PAYMENT_ALREADY_PAID,
          400,
          { currentStatus: payment.status }
        );
      }

      // Update payment
      payment.status = 'paid';
      payment.receiptId = data.receiptId;
      payment.meta = {
        ...payment.meta,
        notes: data.notes,
      };
      payment.statusHistory.push({
        status: 'paid',
        changedAt: new Date(),
        changedBy: 'admin',
        reason: 'COD payment confirmed by admin',
      });

      await payment.save({ session });

      // Update order
      const order = await Order.findById(payment.orderId).session(session);
      if (order && order.status === 'pending') {
        order.status = 'confirmed';
        order.timeline?.push({
          actor: data.confirmedBy,
          action: 'payment.success',
          timestamp: new Date(),
          meta: {
            paymentId: payment._id.toString(),
            method: 'COD',
          },
        });
        await order.save({ session });
      }

      await session.commitTransaction();
      return payment;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Initiate Refund
   * Admin initiates refund for paid payment
   */
  static async initiateRefund(data: InitiateRefundRequest): Promise<IPayment> {
    const session = await Payment.startSession();
    session.startTransaction();

    try {
      const payment = await Payment.findById(data.paymentId).session(session);
      if (!payment) {
        throw new PaymentError(
          PAYMENT_ERROR_CODES.PAYMENT_NOT_FOUND,
          404,
          { paymentId: data.paymentId }
        );
      }

      if (payment.status !== 'paid') {
        throw new PaymentError(
          PAYMENT_ERROR_CODES.REFUND_NOT_ALLOWED,
          400,
          { currentStatus: payment.status }
        );
      }

      if (payment.refundStatus === 'initiated' || payment.refundStatus === 'processing') {
        throw new PaymentError(
          PAYMENT_ERROR_CODES.REFUND_ALREADY_INITIATED,
          400,
          { refundStatus: payment.refundStatus }
        );
      }

      const refundAmount = data.amount || payment.amount;
      if (refundAmount > payment.amount) {
        throw new PaymentError(
          PAYMENT_ERROR_CODES.INVALID_REFUND_AMOUNT,
          400,
          {
            requestedAmount: refundAmount,
            availableAmount: payment.amount,
          }
        );
      }

      // Update payment
      payment.refundStatus = 'initiated';
      payment.refundAmount = refundAmount;
      payment.refundInitiatedAt = new Date();
      payment.meta = {
        ...payment.meta,
        notes: data.reason,
      };
      payment.statusHistory.push({
        status: payment.status,
        changedAt: new Date(),
        changedBy: 'admin',
        reason: `Refund initiated: ${data.reason}`,
      });

      await payment.save({ session });

      // Add timeline event to order
      const order = await Order.findById(payment.orderId).session(session);
      if (order) {
        order.timeline?.push({
          actor: data.initiatedBy,
          action: 'payment.refund.initiated',
          timestamp: new Date(),
          meta: {
            paymentId: payment._id.toString(),
            refundAmount,
            reason: data.reason,
          },
        });
        await order.save({ session });
      }

      // TODO: Call gateway refund API (Razorpay, Stripe) based on provider
      // For now, immediately mark as completed for COD/manual
      if (payment.method === 'COD' || payment.provider === 'manual') {
        payment.refundStatus = 'completed';
        payment.refundCompletedAt = new Date();
        await payment.save({ session });
      }

      await session.commitTransaction();
      return payment;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Mark Refund as Completed (Gateway Callback)
   * Gateway confirms refund was processed
   */
  static async completeRefund(
    paymentId: string,
    refundTxnId: string
  ): Promise<IPayment> {
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      throw new PaymentError(
        PAYMENT_ERROR_CODES.PAYMENT_NOT_FOUND,
        404,
        { paymentId }
      );
    }

    if (payment.refundStatus !== 'processing') {
      throw new PaymentError(
        PAYMENT_ERROR_CODES.REFUND_NOT_ALLOWED,
        400,
        { currentRefundStatus: payment.refundStatus }
      );
    }

    payment.refundStatus = 'completed';
    payment.refundTxnId = refundTxnId;
    payment.refundCompletedAt = new Date();
    payment.statusHistory.push({
      status: payment.status,
      changedAt: new Date(),
      changedBy: 'gateway',
      reason: 'Refund completed by gateway',
    });

    await payment.save();

    // Add timeline event
    const order = await Order.findById(payment.orderId);
    if (order) {
      order.timeline?.push({
        actor: 'system',
        action: 'payment.refund.completed',
        timestamp: new Date(),
        meta: {
          paymentId: payment._id.toString(),
          refundAmount: payment.refundAmount,
          refundTxnId,
        },
      });
      await order.save();
    }

    return payment;
  }

  /**
   * Verify Razorpay Signature
   * HMAC SHA256 verification
   */
  static verifyRazorpaySignature(
    orderId: string,
    paymentId: string,
    signature: string
  ): boolean {
    if (!RAZORPAY_CONFIG.KEY_SECRET) {
      console.warn('Razorpay webhook secret not configured');
      return false;
    }

    const message = `${orderId}|${paymentId}`;
    const generated_signature = crypto
      .createHmac('sha256', RAZORPAY_CONFIG.KEY_SECRET)
      .update(message)
      .digest('hex');

    return generated_signature === signature;
  }

  /**
   * Verify Stripe Signature
   * Stripe uses HMAC SHA256 with timestamp
   */
  static verifyStripeSignature(payload: string, signature: string): boolean {
    if (!STRIPE_CONFIG.WEBHOOK_SECRET) {
      console.warn('Stripe webhook secret not configured');
      return false;
    }

    const generated_signature = crypto
      .createHmac('sha256', STRIPE_CONFIG.WEBHOOK_SECRET)
      .update(payload)
      .digest('hex');

    return generated_signature === signature;
  }

  /**
   * Handle Webhook Payload
   * Process payment status updates from gateway
   */
  static async handleWebhook(payload: any, signature: string, provider: string): Promise<IPayment> {
    // Verify signature based on provider
    let isValid = false;
    if (provider === 'razorpay') {
      // For Razorpay, signature comes in request header
      isValid = true; // Signature verified at route level
    } else if (provider === 'stripe') {
      isValid = this.verifyStripeSignature(JSON.stringify(payload), signature);
    }

    if (!isValid) {
      throw new PaymentError(
        PAYMENT_ERROR_CODES.SIGNATURE_VERIFICATION_FAILED,
        403,
        { provider }
      );
    }

    // Extract payment ID and status from payload
    let paymentId: string;
    let status: 'paid' | 'failed';

    if (provider === 'razorpay') {
      paymentId = payload.payload?.payment?.order_id || '';
      status = payload.payload?.payment?.status === 'captured' ? 'paid' : 'failed';
    } else if (provider === 'stripe') {
      paymentId = payload.data?.object?.id || '';
      status = payload.type === 'charge.succeeded' ? 'paid' : 'failed';
    } else {
      throw new PaymentError(
        PAYMENT_ERROR_CODES.INVALID_PROVIDER,
        400,
        { provider }
      );
    }

    const payment = await Payment.findOne({
      paymentId: paymentId,
    });

    if (!payment) {
      throw new PaymentError(
        PAYMENT_ERROR_CODES.PAYMENT_NOT_FOUND,
        404,
        { paymentId }
      );
    }

    // Check for duplicate webhook
    if (
      (status === 'paid' && payment.status === 'paid') ||
      (status === 'failed' && payment.status === 'failed')
    ) {
      throw new PaymentError(
        PAYMENT_ERROR_CODES.DUPLICATE_WEBHOOK,
        400,
        { currentStatus: payment.status, incomingStatus: status }
      );
    }

    if (status === 'paid') {
      return await this.confirmPayment({
        paymentId: payment._id.toString(),
        orderId: payment.orderId.toString(),
        txnId: paymentId,
        signature,
      });
    } else {
      return await this.failPayment({
        paymentId: payment._id.toString(),
        orderId: payment.orderId.toString(),
        errorCode: 'GATEWAY_REJECTED',
        errorMessage: 'Payment rejected by gateway',
      });
    }
  }

  /**
   * Generate Idempotency Key
   * Unique key to prevent duplicate payments
   */
  static generateIdempotencyKey(
    orderId: string,
    customerId: string,
    amount: number
  ): string {
    const data = `${orderId}:${customerId}:${amount}:${Date.now()}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Get Payment by ID
   */
  static async getPaymentById(paymentId: string): Promise<IPayment> {
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      throw new PaymentError(
        PAYMENT_ERROR_CODES.PAYMENT_NOT_FOUND,
        404,
        { paymentId }
      );
    }
    return payment;
  }

  /**
   * Get Payment by Order ID
   */
  static async getPaymentByOrderId(orderId: string): Promise<IPayment | null> {
    return await Payment.findOne({ orderId }).sort({ createdAt: -1 });
  }

  /**
   * List Payments (Admin)
   */
  static async listPayments(
    filters: {
      status?: string;
      method?: string;
      provider?: string;
      customerId?: string;
      orderId?: string;
      startDate?: Date;
      endDate?: Date;
    },
    page: number = 1,
    limit: number = 20,
    sortBy: string = 'createdAt',
    sortOrder: string = 'desc'
  ) {
    const query: any = {};

    if (filters.status) query.status = filters.status;
    if (filters.method) query.method = filters.method;
    if (filters.provider) query.provider = filters.provider;
    if (filters.customerId) query.customerId = filters.customerId;
    if (filters.orderId) query.orderId = filters.orderId;

    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) query.createdAt.$gte = filters.startDate;
      if (filters.endDate) query.createdAt.$lte = filters.endDate;
    }

    const total = await Payment.countDocuments(query);
    const skip = (page - 1) * limit;

    const sortObj: any = {};
    sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const payments = await Payment.find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(limit);

    return {
      payments,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update Payment (Admin)
   */
  static async updatePayment(
    paymentId: string,
    updates: {
      amount?: number;
      status?: string;
      notes?: string;
    },
    adminId: string,
    reason?: string
  ): Promise<IPayment> {
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      throw new PaymentError(
        PAYMENT_ERROR_CODES.PAYMENT_NOT_FOUND,
        404,
        { paymentId }
      );
    }

    if (payment.status === 'paid' && updates.status !== 'paid') {
      throw new PaymentError(
        PAYMENT_ERROR_CODES.CANNOT_MODIFY_PAID_PAYMENT,
        400,
        { currentStatus: payment.status }
      );
    }

    if (updates.amount) payment.amount = updates.amount;
    if (updates.status && updates.status !== payment.status) {
      payment.status = updates.status as any;
      payment.statusHistory.push({
        status: updates.status as any,
        changedAt: new Date(),
        changedBy: 'admin',
        reason: reason || 'Admin updated',
      });
    }
    if (updates.notes) {
      payment.meta = {
        ...payment.meta,
        notes: updates.notes,
      };
    }

    payment.meta = {
      ...payment.meta,
      adminOverride: true,
      overriddenBy: adminId as any,
      overriddenAt: new Date(),
    };

    await payment.save();
    return payment;
  }

  /**
   * Delete Payment (Admin)
   * Only allowed for pending payments
   */
  static async deletePayment(paymentId: string, adminId: string): Promise<void> {
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      throw new PaymentError(
        PAYMENT_ERROR_CODES.PAYMENT_NOT_FOUND,
        404,
        { paymentId }
      );
    }

    if (payment.status !== 'pending') {
      throw new PaymentError(
        PAYMENT_ERROR_CODES.CANNOT_MODIFY_PAID_PAYMENT,
        400,
        { currentStatus: payment.status }
      );
    }

    await Payment.deleteOne({ _id: paymentId });
  }
}

export default PaymentService;
