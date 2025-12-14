import { CronJob } from 'cron';
import Order, { IOrder } from '@/models/OrderModel';
import Shipment, { IShipment } from '@/models/ShipmentModel';
import Customer from '@/models/CustomerModel';
import { sendEmail } from '@/lib/email';
import deliveryReminderTemplate from '@/lib/email/templates/deliveryReminder';

interface DeliveryEstimate {
  orderId: string;
  estimatedDeliveryDate: Date;
  daysRemaining: number;
  status: string;
}

interface DeliveryReminderJob {
  orderId: string;
  customerId: string;
  reminderType: 'preDelivery' | 'dayOfDelivery';
  sentAt: Date;
}

/**
 * DeliveryReminderService
 * Manages delivery date calculations and reminder emails
 */
class DeliveryReminderService {
  private reminderJob: CronJob | null = null;

  /**
   * Calculate estimated delivery date based on shipment and courier info
   * Assumes 5-7 days average for standard delivery
   */
  async calculateEstimatedDelivery(orderId: string): Promise<DeliveryEstimate | null> {
    try {
      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error(`Order not found: ${orderId}`);
      }

      const shipment = await Shipment.findOne({ orderId });
      if (!shipment) {
        // No shipment yet, can't calculate
        return {
          orderId,
          estimatedDeliveryDate: new Date(),
          daysRemaining: 0,
          status: 'awaiting_shipment',
        };
      }

      // Calculate based on shipment date + estimated days
      let estimatedDays = 5; // Default: 5 days

      // You can customize based on courier type
      // For now, using default
      if (shipment.carrier?.toLowerCase().includes('express')) {
        estimatedDays = 2;
      } else if (shipment.carrier?.toLowerCase().includes('economy')) {
        estimatedDays = 7;
      }

      const shippedDate = shipment.shippedAt || new Date();
      const estimatedDeliveryDate = new Date(shippedDate);
      estimatedDeliveryDate.setDate(estimatedDeliveryDate.getDate() + estimatedDays);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const daysRemaining = Math.ceil(
        (estimatedDeliveryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        orderId,
        estimatedDeliveryDate,
        daysRemaining,
        status: shipment.status,
      };
    } catch (error) {
      console.error('Error calculating estimated delivery:', error);
      throw error;
    }
  }

  /**
   * Get delivery status for an order
   */
  async getDeliveryStatus(orderId: string): Promise<{
    status: string;
    estimatedDeliveryDate: Date | null;
    lastUpdate: Date;
    trackingId?: string;
  }> {
    try {
      const shipment = await Shipment.findOne({ orderId });
      if (!shipment) {
        return {
          status: 'not_shipped',
          estimatedDeliveryDate: null,
          lastUpdate: new Date(),
        };
      }

      const estimate = await this.calculateEstimatedDelivery(orderId);

      return {
        status: shipment.status,
        estimatedDeliveryDate: estimate?.estimatedDeliveryDate || null,
        lastUpdate: shipment.updatedAt || new Date(),
        trackingId: shipment.trackingId,
      };
    } catch (error) {
      console.error('Error getting delivery status:', error);
      throw error;
    }
  }

  /**
   * Send delivery reminder email to customer
   */
  async sendDeliveryReminder(orderId: string, reminderType: 'preDelivery' | 'dayOfDelivery'): Promise<boolean> {
    try {
      const order = await Order.findById(orderId).populate('customerId');
      if (!order || !order.customerId) {
        throw new Error(`Order or customer not found: ${orderId}`);
      }

      const customer = order.customerId as any;
      const shipment = await Shipment.findOne({ orderId });
      if (!shipment) {
        throw new Error(`Shipment not found for order: ${orderId}`);
      }

      const estimate = await this.calculateEstimatedDelivery(orderId);
      if (!estimate) {
        throw new Error('Unable to calculate delivery estimate');
      }

      // Prepare email data
      const emailData = {
        customerName: customer.name || customer.email,
        orderNumber: order.orderId,
        trackingId: shipment.trackingId,
        carrier: shipment.carrier,
        estimatedDeliveryDate: estimate.estimatedDeliveryDate.toLocaleDateString(),
        reminderType,
        orderTotal: order.totals.grandTotal,
        items: order.items.map((item: any) => ({
          name: item.productName,
          quantity: item.quantity,
        })),
      };

      // Get email template
      const emailContent = deliveryReminderTemplate(emailData);

      // Send email
      await sendEmail({
        to: customer.email,
        subject:
          reminderType === 'preDelivery'
            ? `Your order ${order.orderId} arrives tomorrow!`
            : `Your order ${order.orderId} is arriving today!`,
        html: emailContent.html,
        text: emailContent.text,
      });

      console.log(`Delivery reminder sent to ${customer.email} for order ${orderId}`);
      return true;
    } catch (error) {
      console.error('Error sending delivery reminder:', error);
      throw error;
    }
  }

  /**
   * Start background job to send delivery reminders
   * Runs daily at 9 AM
   * Sends:
   * - Pre-delivery reminders (1 day before)
   * - Day-of-delivery reminders (on delivery day)
   */
  startReminderJob(): void {
    if (this.reminderJob) {
      console.log('Reminder job already running');
      return;
    }

    // Run at 9 AM every day
    this.reminderJob = new CronJob('0 9 * * *', async () => {
      try {
        console.log('Running delivery reminder job...');

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Find all active shipments
        const shipments = await Shipment.find({
          status: { $in: ['shipped', 'outForDelivery'] },
        });

        for (const shipment of shipments) {
          const estimate = await this.calculateEstimatedDelivery(shipment.orderId.toString());
          if (!estimate) continue;

          const estimatedDate = new Date(estimate.estimatedDeliveryDate);
          estimatedDate.setHours(0, 0, 0, 0);

          // Send pre-delivery reminder (1 day before)
          if (estimatedDate.getTime() === tomorrow.getTime()) {
            await this.sendDeliveryReminder(
              shipment.orderId.toString(),
              'preDelivery'
            ).catch((err) => {
              console.error(`Failed to send pre-delivery reminder for ${shipment.orderId}:`, err);
            });
          }

          // Send day-of-delivery reminder
          if (estimatedDate.getTime() === today.getTime()) {
            await this.sendDeliveryReminder(
              shipment.orderId.toString(),
              'dayOfDelivery'
            ).catch((err) => {
              console.error(`Failed to send day-of-delivery reminder for ${shipment.orderId}:`, err);
            });
          }
        }

        console.log('Delivery reminder job completed');
      } catch (error) {
        console.error('Error in delivery reminder job:', error);
      }
    });

    this.reminderJob.start();
    console.log('Delivery reminder job started (daily at 9 AM)');
  }

  /**
   * Stop the reminder job
   */
  stopReminderJob(): void {
    if (this.reminderJob) {
      this.reminderJob.stop();
      this.reminderJob = null;
      console.log('Delivery reminder job stopped');
    }
  }

  /**
   * Send manual reminder (admin action)
   */
  async sendManualReminder(orderId: string, reminderType: 'preDelivery' | 'dayOfDelivery'): Promise<boolean> {
    return this.sendDeliveryReminder(orderId, reminderType);
  }

  /**
   * Get upcoming delivery reminders (next 7 days)
   */
  async getUpcomingReminders(): Promise<Array<{
    orderId: string;
    customerId: string;
    estimatedDeliveryDate: Date;
    daysUntilDelivery: number;
  }>> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const shipments = await Shipment.find({
        status: { $in: ['shipped', 'outForDelivery'] },
      });

      const reminders = [];

      for (const shipment of shipments) {
        const estimate = await this.calculateEstimatedDelivery(shipment.orderId.toString());
        if (!estimate) continue;

        const estimatedDate = new Date(estimate.estimatedDeliveryDate);
        estimatedDate.setHours(0, 0, 0, 0);

        const daysUntilDelivery = Math.ceil(
          (estimatedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysUntilDelivery >= 0 && daysUntilDelivery <= 7) {
          reminders.push({
            orderId: shipment.orderId.toString(),
            customerId: shipment.customerId.toString(),
            estimatedDeliveryDate: estimate.estimatedDeliveryDate,
            daysUntilDelivery,
          });
        }
      }

      return reminders.sort((a, b) => a.daysUntilDelivery - b.daysUntilDelivery);
    } catch (error) {
      console.error('Error getting upcoming reminders:', error);
      throw error;
    }
  }
}

export default new DeliveryReminderService();
