import mongoose from 'mongoose';
import Biller, { IBiller, IBillerCustomerSnapshot, IBillerOrderSnapshot } from '@/models/BillerModel';
import { Order, IOrder } from '@/models/OrderModel';
import { Payment, IPayment } from '@/models/PaymentModel';
import { Customer } from '@/models/CustomerModel';

interface CreateBillerOptions {
  orderId: string;
  paymentId: string;
  manualOverride?: boolean;
  createdBy: 'system' | 'admin';
  createdById?: string;
  notes?: string;
}

interface UpdateBillerOptions {
  amountToCollect?: number;
  amountPaid?: number;
  notes?: string;
  updatedBy?: string;
}

interface ListBillerOptions {
  billType?: 'COD' | 'PAID';
  status?: 'active' | 'cancelled';
  skip?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'billType' | 'amountToCollect';
}

/**
 * BillerService
 * Complete CRUD and auto-generation for billing slips
 * Enforces global rule: automated + manual admin control
 */
class BillerService {
  /**
   * AUTO-GENERATE BILL (Called after order confirmation)
   * Triggered automatically when:
   * - Order confirmed with payment.method == COD
   * - Payment completed and payment.status == paid
   */
  async autoGenerateBill(orderId: string): Promise<IBiller | null> {
    try {
      const order = await Order.findById(orderId).populate('paymentStatus');
      if (!order) throw new Error(`Order not found: ${orderId}`);

      const payment = await Payment.findOne({ orderId });
      if (!payment) throw new Error(`Payment not found for order: ${orderId}`);

      // Check if bill already exists
      const existingBill = await Biller.findOne({
        orderId: new mongoose.Types.ObjectId(orderId),
        status: 'active',
      });
      if (existingBill) {
        console.log(`Active bill already exists for order ${orderId}`);
        return null;
      }

      // Determine bill type based on payment method
      let billType: 'COD' | 'PAID';
      let amountToCollect = 0;
      let amountPaid = 0;

      if (payment.method === 'COD') {
        billType = 'COD';
        amountToCollect = order.totals.grandTotal;
      } else if (payment.status === 'paid') {
        billType = 'PAID';
        amountPaid = order.totals.grandTotal;
      } else {
        console.log(`Cannot auto-generate bill: Order ${orderId} not in billable state`);
        return null;
      }

      // Generate bill
      const bill = await this.createBiller({
        orderId,
        paymentId: payment._id.toString(),
        createdBy: 'system',
        notes: `Auto-generated for ${billType} order`,
      });

      // Add timeline event to order
      if (order.addTimelineEvent) {
        order.addTimelineEvent('bill.generated', 'system', { billType, billId: bill._id });
        await order.save();
      }

      return bill;
    } catch (error) {
      console.error('Error auto-generating bill:', error);
      throw error;
    }
  }

  /**
   * CREATE BILLER (Manual admin creation)
   * Allows full manual override of bill generation
   */
  async createBiller(options: CreateBillerOptions): Promise<IBiller> {
    try {
      const { orderId, paymentId, createdBy, createdById, notes } = options;

      // Validate order exists
      const order = await Order.findById(orderId).populate('customerId');
      if (!order) throw new Error(`Order not found: ${orderId}`);

      // Validate payment exists
      const payment = await Payment.findById(paymentId);
      if (!payment) throw new Error(`Payment not found: ${paymentId}`);

      // Build customer snapshot
      const customer = await Customer.findById(order.customerId);
      const customerSnapshot: IBillerCustomerSnapshot = {
        customerId: order.customerId as mongoose.Types.ObjectId,
        name: customer?.name || 'Unknown',
        phone: customer?.phoneNumber || 'N/A',
        email: customer?.email,
      };

      // Build order snapshot
      const itemsSummary = `${order.items.length} item${order.items.length !== 1 ? 's' : ''}`;
      const addressLine =
        `${order.address.recipientName}, ${order.address.streetAddress}, ${order.address.city}, ${order.address.state} ${order.address.postalCode}`;

      const orderSnapshot: IBillerOrderSnapshot = {
        orderId: order._id as mongoose.Types.ObjectId,
        orderNumber: order.orderNumber,
        itemCount: order.items.length,
        itemsSummary,
        address: addressLine,
      };

      // Determine bill type
      const billType: 'COD' | 'PAID' = payment.method === 'COD' ? 'COD' : 'PAID';
      const amountToCollect = billType === 'COD' ? order.totals.grandTotal : 0;
      const amountPaid = billType === 'PAID' ? order.totals.grandTotal : 0;

      // Create bill
      const bill = new Biller({
        orderId: new mongoose.Types.ObjectId(orderId),
        paymentId: new mongoose.Types.ObjectId(paymentId),
        billType,
        amountToCollect,
        amountPaid,
        currency: 'INR',
        customerSnapshot,
        orderSnapshot,
        status: 'active',
        printCount: 0,
        createdBy,
        createdById: createdById ? new mongoose.Types.ObjectId(createdById) : undefined,
        notes,
        auditLog: [
          {
            action: createdBy === 'system' ? 'created' : 'created',
            actor: createdBy,
            actorId: createdById ? new mongoose.Types.ObjectId(createdById) : undefined,
            timestamp: new Date(),
            reason: notes,
          },
        ],
      });

      await bill.save();
      return bill;
    } catch (error) {
      console.error('Error creating biller:', error);
      throw error;
    }
  }

  /**
   * GET BILL (Read)
   * Retrieve bill by ID with full details
   */
  async getBiller(billerId: string): Promise<IBiller | null> {
    try {
      const bill = await Biller.findById(billerId)
        .populate('orderId')
        .populate('paymentId')
        .populate('createdById');
      return bill;
    } catch (error) {
      console.error('Error fetching biller:', error);
      throw error;
    }
  }

  /**
   * LIST BILLS (Read with filters)
   * List all bills with optional filters
   */
  async listBillers(options: ListBillerOptions = {}): Promise<{ bills: IBiller[]; total: number }> {
    try {
      const { billType, status, skip = 0, limit = 50, sortBy = 'createdAt' } = options;

      const filter: any = {};
      if (billType) filter.billType = billType;
      if (status) filter.status = status;

      const sortOptions: any = {};
      sortOptions[sortBy] = -1;

      const bills = await Biller.find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .populate('orderId')
        .populate('paymentId');

      const total = await Biller.countDocuments(filter);

      return { bills, total };
    } catch (error) {
      console.error('Error listing billers:', error);
      throw error;
    }
  }

  /**
   * UPDATE BILL (Edit)
   * Allows manual edits to bill details with audit logging
   */
  async updateBiller(billerId: string, options: UpdateBillerOptions): Promise<IBiller> {
    try {
      const bill = await Biller.findById(billerId);
      if (!bill) throw new Error(`Bill not found: ${billerId}`);

      // Prevent editing cancelled bills
      if (bill.status === 'cancelled') {
        throw new Error('Cannot edit a cancelled bill. Create a new one instead.');
      }

      const changes: Record<string, any> = {};

      if (options.amountToCollect !== undefined && bill.billType === 'COD') {
        changes.amountToCollect = {
          old: bill.amountToCollect,
          new: options.amountToCollect,
        };
        bill.amountToCollect = options.amountToCollect;
      }

      if (options.amountPaid !== undefined && bill.billType === 'PAID') {
        changes.amountPaid = {
          old: bill.amountPaid,
          new: options.amountPaid,
        };
        bill.amountPaid = options.amountPaid;
      }

      if (options.notes !== undefined) {
        changes.notes = {
          old: bill.notes,
          new: options.notes,
        };
        bill.notes = options.notes;
      }

      // Add audit log entry
      bill.auditLog.push({
        action: 'edited',
        actor: 'admin',
        actorId: options.updatedBy ? new mongoose.Types.ObjectId(options.updatedBy) : undefined,
        timestamp: new Date(),
        changes,
        reason: 'Manual edit via admin UI',
      });

      await bill.save();
      return bill;
    } catch (error) {
      console.error('Error updating biller:', error);
      throw error;
    }
  }

  /**
   * PRINT BILL (Increment print count)
   * Tracks print operations
   */
  async printBill(billerId: string): Promise<IBiller> {
    try {
      const bill = await Biller.findById(billerId);
      if (!bill) throw new Error(`Bill not found: ${billerId}`);

      if (bill.status === 'cancelled') {
        throw new Error('Cannot print a cancelled bill.');
      }

      bill.printCount += 1;
      bill.lastPrintedAt = new Date();

      // Add audit log entry
      bill.auditLog.push({
        action: 'printed',
        actor: 'admin',
        timestamp: new Date(),
        printCount: bill.printCount,
      });

      await bill.save();
      return bill;
    } catch (error) {
      console.error('Error printing bill:', error);
      throw error;
    }
  }

  /**
   * CANCEL BILL (Soft delete)
   * Marks bill as cancelled with reason
   */
  async cancelBiller(billerId: string, reason: string, cancelledBy?: string): Promise<IBiller> {
    try {
      const bill = await Biller.findById(billerId);
      if (!bill) throw new Error(`Bill not found: ${billerId}`);

      if (bill.status === 'cancelled') {
        throw new Error('Bill is already cancelled.');
      }

      bill.status = 'cancelled';

      // Add audit log entry
      bill.auditLog.push({
        action: 'cancelled',
        actor: 'admin',
        actorId: cancelledBy ? new mongoose.Types.ObjectId(cancelledBy) : undefined,
        timestamp: new Date(),
        reason,
      });

      await bill.save();

      // Add timeline event to order
      const order = await Order.findById(bill.orderId);
      if (order && order.addTimelineEvent) {
        order.addTimelineEvent('bill.cancelled', 'admin', { billId: bill._id, reason });
        await order.save();
      }

      return bill;
    } catch (error) {
      console.error('Error cancelling biller:', error);
      throw error;
    }
  }

  /**
   * REGENERATE BILL (Create new bill, archive old)
   * Called when order/payment changes after bill generation
   */
  async regenerateBiller(billerId: string, regeneratedBy?: string): Promise<IBiller> {
    try {
      const oldBill = await Biller.findById(billerId);
      if (!oldBill) throw new Error(`Bill not found: ${billerId}`);

      // Cancel old bill
      oldBill.status = 'cancelled';
      oldBill.auditLog.push({
        action: 'regenerated',
        actor: 'admin',
        actorId: regeneratedBy ? new mongoose.Types.ObjectId(regeneratedBy) : undefined,
        timestamp: new Date(),
        reason: 'New bill generated due to order/payment changes',
      });
      await oldBill.save();

      // Create new bill
      const newBill = await this.createBiller({
        orderId: oldBill.orderId.toString(),
        paymentId: oldBill.paymentId.toString(),
        createdBy: 'admin',
        createdById: regeneratedBy,
        notes: `Regenerated from bill ${oldBill._id}`,
      });

      return newBill;
    } catch (error) {
      console.error('Error regenerating biller:', error);
      throw error;
    }
  }

  /**
   * DELETE BILL (Archive)
   * Permanently remove bill (only if not printed)
   */
  async deleteBiller(billerId: string, deletedBy?: string): Promise<boolean> {
    try {
      const bill = await Biller.findById(billerId);
      if (!bill) throw new Error(`Bill not found: ${billerId}`);

      if (bill.printCount > 0) {
        throw new Error('Cannot delete a bill that has been printed. Cancel it instead.');
      }

      // Add final audit entry before deletion
      bill.auditLog.push({
        action: 'cancelled',
        actor: 'admin',
        actorId: deletedBy ? new mongoose.Types.ObjectId(deletedBy) : undefined,
        timestamp: new Date(),
        reason: 'Permanently deleted',
      });

      await Biller.deleteOne({ _id: billerId });
      return true;
    } catch (error) {
      console.error('Error deleting biller:', error);
      throw error;
    }
  }

  /**
   * GET BILL FOR ORDER
   * Retrieve active bill for a specific order
   */
  async getBillForOrder(orderId: string): Promise<IBiller | null> {
    try {
      const bill = await Biller.findOne({
        orderId: new mongoose.Types.ObjectId(orderId),
        status: 'active',
      });
      return bill;
    } catch (error) {
      console.error('Error fetching bill for order:', error);
      throw error;
    }
  }

  /**
   * GET AUDIT LOG
   * Retrieve complete audit trail for a bill
   */
  async getAuditLog(billerId: string) {
    try {
      const bill = await Biller.findById(billerId);
      if (!bill) throw new Error(`Bill not found: ${billerId}`);
      return bill.auditLog;
    } catch (error) {
      console.error('Error fetching audit log:', error);
      throw error;
    }
  }

  /**
   * VERIFY BILL PRINTABILITY
   * Check if bill can be printed
   */
  async canPrintBill(billerId: string): Promise<boolean> {
    try {
      const bill = await Biller.findById(billerId);
      return bill?.status === 'active' ? true : false;
    } catch (error) {
      console.error('Error verifying bill printability:', error);
      return false;
    }
  }
}

export default new BillerService();
