import mongoose from 'mongoose';
import Biller, { IBiller, IBillerCustomerSnapshot, IBillerOrderSnapshot } from '@/models/BillerModel';
import Order, { IOrder } from '@/models/OrderModel';
import Payment, { IPayment } from '@/models/PaymentModel';
import Customer from '@/models/CustomerModel';

interface CreateBillerOptions {
  orderId: string;
  paymentId: string;
  manualOverride?: boolean;
  createdBy: 'system' | 'admin';
  createdById?: string;
  notes?: string;
  items?: Array<{ description: string; quantity: number; rate: number }>;
  paymentStatus?: 'full_paid' | 'advance_payment' | 'pending_payment';
  rate?: number;
  advancePaid?: number;
  balanceAmount?: number;
  customerName?: string;
  customerPhone?: string;
  customerPhones?: string[];
  customerCustomId?: string;
  trialDate?: string | Date;
  deliveryDate?: string | Date;
}

interface UpdateBillerOptions {
  amountToCollect?: number;
  amountPaid?: number;
  notes?: string;
  paymentStatus?: 'full_paid' | 'advance_payment' | 'pending_payment';
  additionalAmount?: number;
  updatedBy?: string;
  status?: 'active' | 'cancelled' | 'completed';
  items?: Array<{ description: string; quantity: number; rate: number }>;
  customerName?: string;
  customerPhone?: string;
  customerPhones?: string[];
  customerCustomId?: string;
  trialDate?: string | Date;
  deliveryDate?: string | Date;
  rate?: number;
  advancePaid?: number;
  balanceAmount?: number;
}

interface ListBillerOptions {
  billType?: 'COD' | 'PAID';
  status?: 'active' | 'cancelled' | 'completed';
  search?: string;
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
   * GENERATE CUSTOM BILL ID
   * Format: znm-DDMMYYYYXXX
   */
  async generateBillId(): Promise<string> {
    const today = new Date();
    const day = today.getDate().toString().padStart(2, '0');
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const year = today.getFullYear().toString();
    const dateStr = `${day}${month}${year}`;
    const prefix = `znm-${dateStr}`;

    // Find ALL bills to determine the global maximum sequence number (last 3-4 digits)
    const allBills = await Biller.find({
      billId: { $regex: /^znm-[0-9]{8}/ }
    }).select('billId').lean();

    let maxGlobalNum = 0;
    allBills.forEach(b => {
      const billId = b.billId;
      if (billId && billId.startsWith('znm-')) {
        // Extract digits after the date string (e.g., after the 8th digit of the data part)
        // Format: znm-DDMMYYYYNNN
        const numPartString = billId.slice(12); // znm- + 8 chars date
        const num = parseInt(numPartString, 10);
        if (!isNaN(num) && num > maxGlobalNum) {
          maxGlobalNum = num;
        }
      }
    });

    const nextNumber = maxGlobalNum + 1;
    return `${prefix}${nextNumber.toString().padStart(3, '0')}`;
  }

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
      let {
        orderId,
        paymentId,
        createdBy,
        createdById,
        notes,
        items = [],
        paymentStatus = 'full_paid',
        rate = 0,
        advancePaid = 0,
        balanceAmount = 0,
        customerName,
        customerPhone,
        customerPhones,
        customerCustomId,
        trialDate,
        deliveryDate
      } = options;

      // Check if orderId is a valid ObjectId
      const isValidObjectId = mongoose.Types.ObjectId.isValid(orderId);
      
      let order: any = null;
      let payment: any = null;
      
      if (isValidObjectId) {
        order = await Order.findById(orderId).populate('customerId');
        payment = await Payment.findById(paymentId);
      }

      let customerSnapshot: IBillerCustomerSnapshot;
      let orderSnapshot: IBillerOrderSnapshot;
      let billType: 'COD' | 'PAID' = 'PAID';
      let amountToCollect = 0;
      let amountPaid = 0;

      if (order && payment) {
        // Build customer snapshot
        const customer = await Customer.findById(order.customerId);
        customerSnapshot = {
          customerId: order.customerId as mongoose.Types.ObjectId,
          name: customer?.name || 'Unknown',
          phone: customer?.phoneNumber || 'N/A',
          phones: [], // Auto-registration from order uses primary phone
          email: customer?.email,
        };

        // Build order snapshot
        const itemsSummary = items.length > 0 
          ? items.map(i => i.description).join(', ')
          : `${order.items.length} item${order.items.length !== 1 ? 's' : ''}`;
          
        const addressLine =
          `${order.address.recipientName}, ${order.address.streetAddress}, ${order.address.city}, ${order.address.state} ${order.address.postalCode}`;

        orderSnapshot = {
          orderId: order._id as mongoose.Types.ObjectId,
          orderNumber: order.orderNumber,
          itemCount: order.items.length,
          itemsSummary,
          address: addressLine,
        };

        // Determine bill type and amounts based on the new logic
        if (paymentStatus === 'full_paid') {
          billType = 'PAID';
          amountPaid = rate || order.totals.grandTotal;
          amountToCollect = 0;
          balanceAmount = 0;
          advancePaid = amountPaid;
        } else if (paymentStatus === 'pending_payment') {
          billType = 'COD';
          amountPaid = 0;
          amountToCollect = rate || order.totals.grandTotal;
          balanceAmount = amountToCollect;
          advancePaid = 0;
        } else if (paymentStatus === 'advance_payment') {
          billType = 'COD';
          amountPaid = advancePaid;
          amountToCollect = balanceAmount;
          // advancePaid is already set from options
        } else {
          billType = payment.method === 'COD' ? 'COD' : 'PAID';
          amountToCollect = billType === 'COD' ? order.totals.grandTotal : 0;
          amountToCollect = billType === 'COD' ? order.totals.grandTotal : 0;
          amountPaid = billType === 'PAID' ? order.totals.grandTotal : 0;
          balanceAmount = amountToCollect;
          advancePaid = amountPaid;
        }
      } else {
        // Ad-hoc creation if order or payment doesn't explicitly exist
        let finalCustomerCustomId = options.customerCustomId;
        if (!finalCustomerCustomId && customerName) {
          const initial = customerName.charAt(0).toUpperCase();
          // Find the highest existing number for this initial across all billers
          const existingBillers = await Biller.find({
            'customerSnapshot.customerCustomId': { $regex: `^${initial}-` }
          }).select('customerSnapshot.customerCustomId').lean();

          let maxNum = 0;
          existingBillers.forEach(b => {
            const customId = b.customerSnapshot?.customerCustomId;
            if (customId && customId.startsWith(`${initial}-`)) {
              const numPart = customId.split('-')[1];
              const num = parseInt(numPart, 10);
              if (!isNaN(num) && num > maxNum) {
                maxNum = num;
              }
            }
          });
          
          finalCustomerCustomId = `${initial}-${(maxNum + 1).toString().padStart(3, '0')}`;
        }

        // Check if customer already exists in main Customers collection
        let existingCustomer: any = null;
        if (customerPhone && customerPhone !== 'N/A') {
          existingCustomer = await Customer.findOne({ phone: customerPhone });
        }

        let mainCustomerId;
        if (existingCustomer) {
          mainCustomerId = existingCustomer._id;
        } else {
          // Register new customer automatically
          const newCustomer = await Customer.create({
            name: customerName || 'Ad-Hoc Customer',
            phone: customerPhone || undefined,
            status: 'active',
            tags: ['biller-auto-reg'],
            meta: {
              customId: finalCustomerCustomId,
              source: 'biller'
            }
          });
          mainCustomerId = newCustomer._id;
        }

        customerSnapshot = {
          customerId: mainCustomerId as mongoose.Types.ObjectId,
          customerCustomId: finalCustomerCustomId || 'N/A',
          name: customerName || 'Ad-Hoc Customer',
          phone: customerPhone || 'N/A',
          phones: customerPhones || [],
        };

        const itemsSummary = items.length > 0 
          ? items.map(i => i.description).join(', ')
          : 'Ad-hoc Item';

        // Generate custom bill ID
        const billId = await this.generateBillId();

        orderSnapshot = {
          orderId: mongoose.Types.ObjectId.isValid(orderId) ? new mongoose.Types.ObjectId(orderId) : new mongoose.Types.ObjectId(),
          orderNumber: billId, // Use billId format as requested for ad-hoc
          itemCount: items.length || 1,
          itemsSummary,
          address: 'Ad-hoc Address',
        };

        if (paymentStatus === 'full_paid') {
          billType = 'PAID';
          amountPaid = rate;
          amountToCollect = 0;
          balanceAmount = 0;
          advancePaid = rate;
        } else if (paymentStatus === 'pending_payment') {
          billType = 'COD';
          amountPaid = 0;
          amountToCollect = rate;
          balanceAmount = rate;
          advancePaid = 0;
        } else if (paymentStatus === 'advance_payment') {
          billType = 'COD';
          amountPaid = advancePaid;
          amountToCollect = balanceAmount;
          // advancePaid is already set from options
        } else {
          billType = 'PAID';
          amountPaid = 0;
          amountToCollect = 0;
          balanceAmount = 0;
          advancePaid = 0;
        }
      }

      // Generate custom bill ID if not already generated
      const generatedBillId = orderSnapshot?.orderNumber?.startsWith('znm-') ? orderSnapshot.orderNumber : await this.generateBillId();

      // Create bill
      const finalOrderId = isValidObjectId ? new mongoose.Types.ObjectId(orderId) : new mongoose.Types.ObjectId();
      const finalPaymentId = mongoose.Types.ObjectId.isValid(paymentId) ? new mongoose.Types.ObjectId(paymentId) : new mongoose.Types.ObjectId();

      const bill = new Biller({
        billId: generatedBillId,
        orderId: finalOrderId,
        paymentId: finalPaymentId,
        billType,
        paymentStatus,
        rate,
        advancePaid,
        balanceAmount,
        amountToCollect,
        amountPaid,
        currency: 'INR',
        customerSnapshot,
        orderSnapshot,
        items,
        trialDate: trialDate ? new Date(trialDate) : undefined,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : undefined,
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
      const { billType, status, skip = 0, limit = 50, sortBy = 'createdAt', search } = options;

      const filter: any = {};
      if (billType) filter.billType = billType;
      
      if (status === 'completed') {
        filter.$or = [
          { status: 'completed' },
          { balanceAmount: { $lte: 0 }, status: { $ne: 'cancelled' } }
        ];
      } else if (status === 'active') {
        filter.status = 'active';
        filter.balanceAmount = { $gt: 0 };
      } else if (status) {
        filter.status = status;
      }

      if (search) {
        const searchRegex = new RegExp(search, 'i');
        filter.$or = [
          ...(filter.$or || []),
          { billId: searchRegex },
          { 'customerSnapshot.name': searchRegex },
          { 'customerSnapshot.customerCustomId': searchRegex },
          { 'orderSnapshot.orderNumber': searchRegex }
        ];
      }

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

      if (options.paymentStatus) {
        changes.paymentStatus = {
          old: bill.paymentStatus,
          new: options.paymentStatus,
        };
        bill.paymentStatus = options.paymentStatus;
        
        // Auto-adjust amounts based on status if payment is made
        if (options.paymentStatus === 'full_paid') {
          bill.billType = 'PAID';
          bill.amountPaid = bill.rate;
          bill.advancePaid = bill.rate;
          bill.amountToCollect = 0;
          bill.balanceAmount = 0;
          bill.status = 'completed';
        } else if (options.paymentStatus === 'advance_payment') {
          bill.billType = 'COD';
          const additional = options.additionalAmount || options.amountPaid || 0;
          bill.advancePaid = (bill.advancePaid || 0) + additional;
          bill.amountPaid = bill.advancePaid;
          bill.balanceAmount = Math.max(0, (bill.rate || 0) - bill.advancePaid);
          bill.amountToCollect = bill.balanceAmount;
          
          // If balance becomes 0, mark as full_paid and completed automatically
          if (bill.balanceAmount === 0) {
            bill.paymentStatus = 'full_paid';
            bill.billType = 'PAID';
            bill.status = 'completed';
          }
        }
      }

      if (options.notes !== undefined) {
        changes.notes = {
          old: bill.notes,
          new: options.notes,
        };
        bill.notes = options.notes;
      }

      if (options.customerName || options.customerPhone || options.customerCustomId || options.customerPhones) {
        bill.customerSnapshot = {
          ...bill.customerSnapshot,
          name: options.customerName || bill.customerSnapshot.name,
          phone: options.customerPhone || bill.customerSnapshot.phone,
          phones: options.customerPhones || bill.customerSnapshot.phones || [],
          customerCustomId: options.customerCustomId || bill.customerSnapshot.customerCustomId,
        };
      }

      if (options.trialDate !== undefined) bill.trialDate = options.trialDate ? new Date(options.trialDate) : undefined;
      if (options.deliveryDate !== undefined) bill.deliveryDate = options.deliveryDate ? new Date(options.deliveryDate) : undefined;

      if (options.items !== undefined) {
        bill.items = options.items;
        const itemsSummary = options.items.length > 0
          ? options.items.map(i => i.description).join(', ')
          : 'Items';
        bill.orderSnapshot = {
          ...bill.orderSnapshot,
          itemCount: options.items.length,
          itemsSummary,
        };
      }

      if (options.rate !== undefined) bill.rate = options.rate;
      if (options.advancePaid !== undefined) bill.advancePaid = options.advancePaid;
      if (options.balanceAmount !== undefined) {
        bill.balanceAmount = options.balanceAmount;
        bill.amountToCollect = options.balanceAmount;
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

      // Delete immediately
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

  /**
   * GENERATE NEXT CUSTOMER ID
   * Pre-generate a custom ID based on Initial and existing slots
   */
  async generateNextCustomerId(initial: string): Promise<string> {
    try {
      if (!initial) return '';
      const uppercaseInitial = initial.charAt(0).toUpperCase();
      
      // Find ALL custom IDs to determine the global maximum number
      const allBillers = await Biller.find({
        'customerSnapshot.customerCustomId': { $regex: /-[0-9]{3,}$/ }
      }).select('customerSnapshot.customerCustomId').lean();

      let maxGlobalNum = 0;
      allBillers.forEach(b => {
        const customId = b.customerSnapshot?.customerCustomId;
        if (customId && customId.includes('-')) {
          const parts = customId.split('-');
          const numPart = parts[parts.length - 1];
          const num = parseInt(numPart, 10);
          if (!isNaN(num) && num > maxGlobalNum) {
            maxGlobalNum = num;
          }
        }
      });
      
      return `${uppercaseInitial}-${(maxGlobalNum + 1).toString().padStart(3, '0')}`;
    } catch (error) {
      console.error('Error generating next customer ID:', error);
      return `${initial.charAt(0).toUpperCase()}-001`;
    }
  }

  /**
   * FIND CUSTOMER BY CUSTOM ID
   * Retrieve existing customer details for auto-filling
   */
  async findCustomerByCustomId(customId: string): Promise<IBillerCustomerSnapshot | null> {
    try {
      if (!customId) return null;
      const bill = await Biller.findOne({
        'customerSnapshot.customerCustomId': { $regex: new RegExp(`^${customId}$`, 'i') }
      }).select('customerSnapshot').lean();
      
      return bill?.customerSnapshot || null;
    } catch (error) {
      console.error('Error finding customer by custom ID:', error);
      return null;
    }
  }

  /**
   * SEARCH CUSTOMERS BY NAME
   * Return unique customer profiles matching the name query
   */
  async searchCustomers(query: string): Promise<IBillerCustomerSnapshot[]> {
    try {
      if (!query || query.length < 2) return [];
      
      const regex = new RegExp(query, 'i');
      const uniqueCustomers = await Biller.aggregate([
        { $match: { 'customerSnapshot.name': { $regex: regex } } },
        { 
          $sort: { createdAt: -1 } 
        },
        { $group: {
            _id: '$customerSnapshot.customerCustomId',
            name: { $first: '$customerSnapshot.name' },
            phone: { $first: '$customerSnapshot.phone' },
            customerCustomId: { $first: '$customerSnapshot.customerCustomId' }
        }},
        { $limit: 5 }
      ]);
      
      return uniqueCustomers.map(c => ({
          name: c.name,
          phone: c.phone,
          customerCustomId: c.customerCustomId,
          customerId: c.customerId || new mongoose.Types.ObjectId()
      } as IBillerCustomerSnapshot));
    } catch (error) {
      console.error('Error searching customers:', error);
      return [];
    }
  }
}

export default new BillerService();
