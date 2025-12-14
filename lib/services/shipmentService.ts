import Shipment, { IShipment } from '@/models/ShipmentModel';
import Order from '@/models/OrderModel';
import mongoose from 'mongoose';

/**
 * Shipment Service
 * Handles automated and manual shipment management
 */

interface CreateShipmentOptions {
  orderId: string;
  courierName: string;
  trackingNumber?: string;
  trackingUrl?: string;
  createdBy?: 'system' | 'admin';
  adminId?: string;
  meta?: {
    notes?: string;
    carrierCode?: string;
    weight?: number;
    estimatedDelivery?: Date;
  };
}

interface UpdateShipmentOptions {
  courierName?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  status?: 'created' | 'picked' | 'shipped' | 'delivered' | 'cancelled';
  meta?: {
    notes?: string;
    carrierCode?: string;
    weight?: number;
    estimatedDelivery?: Date;
  };
}

interface ListShipmentsOptions {
  status?: string;
  courierName?: string;
  skip?: number;
  limit?: number;
}

class ShipmentService {
  /**
   * Auto-create shipment when order is confirmed
   * Called from order confirmation handler
   */
  async autoCreateShipment(orderId: string): Promise<IShipment> {
    try {
      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error(`Order not found: ${orderId}`);
      }

      // Check if shipment already exists
      const existing = await Shipment.findOne({
        orderId: new mongoose.Types.ObjectId(orderId),
        status: { $ne: 'cancelled' },
      });

      if (existing) {
        return existing;
      }

      // Create shipment with default courier
      const shipment = new Shipment({
        orderId: new mongoose.Types.ObjectId(orderId),
        courierName: 'Delhivery', // Default courier
        trackingNumber: '',
        trackingUrl: '',
        status: 'created',
        createdBy: 'system',
      });

      await shipment.save();

      // Attach shipmentId to order timeline
      if (!order.timeline) {
        order.timeline = [];
      }

      order.timeline.push({
        actor: 'system',
        action: 'shipment.created',
        timestamp: new Date(),
        meta: {
          shipmentId: shipment._id.toString(),
          courierName: shipment.courierName,
        },
      });

      await order.save();

      return shipment;
    } catch (error) {
      console.error('Error auto-creating shipment:', error);
      throw error;
    }
  }

  /**
   * Create shipment manually (admin)
   */
  async createShipment(options: CreateShipmentOptions): Promise<IShipment> {
    try {
      const {
        orderId,
        courierName,
        trackingNumber = '',
        trackingUrl = '',
        createdBy = 'admin',
        adminId,
        meta,
      } = options;

      // Verify order exists
      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error(`Order not found: ${orderId}`);
      }

      // Check if active shipment already exists
      const existing = await Shipment.findOne({
        orderId: new mongoose.Types.ObjectId(orderId),
        status: { $ne: 'cancelled' },
      });

      if (existing) {
        throw new Error(`Active shipment already exists for order ${orderId}`);
      }

      // Create shipment
      const shipment = new Shipment({
        orderId: new mongoose.Types.ObjectId(orderId),
        courierName,
        trackingNumber,
        trackingUrl,
        status: 'created',
        createdBy,
        adminId: adminId ? new mongoose.Types.ObjectId(adminId) : null,
        meta,
      });

      await shipment.save();

      // Add to order timeline
      if (!order.timeline) {
        order.timeline = [];
      }

      order.timeline.push({
        actor: 'admin',
        action: 'shipment.created',
        timestamp: new Date(),
        meta: {
          shipmentId: shipment._id.toString(),
          courierName: shipment.courierName,
        },
      });

      await order.save();

      return shipment;
    } catch (error) {
      console.error('Error creating shipment:', error);
      throw error;
    }
  }

  /**
   * Get shipment by ID
   */
  async getShipment(shipmentId: string): Promise<IShipment | null> {
    try {
      const shipment = await Shipment.findById(shipmentId).populate('orderId');
      return shipment;
    } catch (error) {
      console.error('Error getting shipment:', error);
      throw error;
    }
  }

  /**
   * Get shipment for order
   */
  async getShipmentForOrder(orderId: string): Promise<IShipment | null> {
    try {
      const shipment = await Shipment.findOne({
        orderId: new mongoose.Types.ObjectId(orderId),
        status: { $ne: 'cancelled' },
      });
      return shipment;
    } catch (error) {
      console.error('Error getting shipment for order:', error);
      throw error;
    }
  }

  /**
   * List shipments with filters
   */
  async listShipments(options: ListShipmentsOptions): Promise<IShipment[]> {
    try {
      const { status, courierName, skip = 0, limit = 50 } = options;

      const query: any = {};

      if (status) {
        query.status = status;
      }

      if (courierName) {
        query.courierName = courierName;
      }

      const shipments = await Shipment.find(query)
        .populate('orderId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      return shipments;
    } catch (error) {
      console.error('Error listing shipments:', error);
      throw error;
    }
  }

  /**
   * Update shipment
   */
  async updateShipment(
    shipmentId: string,
    options: UpdateShipmentOptions
  ): Promise<IShipment | null> {
    try {
      const shipment = await Shipment.findById(shipmentId);
      if (!shipment) {
        throw new Error(`Shipment not found: ${shipmentId}`);
      }

      // Prevent updating cancelled shipments
      if (shipment.status === 'cancelled') {
        throw new Error('Cannot update cancelled shipment');
      }

      // Validate status transitions
      if (options.status) {
        const validTransitions: Record<string, string[]> = {
          created: ['picked', 'shipped', 'cancelled'],
          picked: ['shipped', 'cancelled'],
          shipped: ['delivered', 'cancelled'],
          delivered: [],
          cancelled: [],
        };

        if (!validTransitions[shipment.status]?.includes(options.status)) {
          throw new Error(
            `Invalid transition from ${shipment.status} to ${options.status}`
          );
        }

        // Set timestamp based on status
        if (options.status === 'shipped') {
          shipment.shippedAt = new Date();
        } else if (options.status === 'delivered') {
          shipment.deliveredAt = new Date();
        }

        shipment.status = options.status;
      }

      // Update fields
      if (options.courierName) {
        shipment.courierName = options.courierName;
      }

      if (options.trackingNumber) {
        shipment.trackingNumber = options.trackingNumber;
      }

      if (options.trackingUrl) {
        shipment.trackingUrl = options.trackingUrl;
      }

      if (options.meta) {
        shipment.meta = { ...shipment.meta, ...options.meta };
      }

      await shipment.save();

      // Add to order timeline
      const order = await Order.findById(shipment.orderId);
      if (order && options.status) {
        if (!order.timeline) {
          order.timeline = [];
        }

        // Only log shipment.created event (other status updates are tracked in shipment model)
        if (options.status === 'shipped') {
          order.timeline.push({
            actor: 'admin',
            action: 'order.shipped',
            timestamp: new Date(),
            meta: {
              shipmentId: shipment._id.toString(),
              status: options.status,
            },
          });

          await order.save();
        }
      }

      return shipment;
    } catch (error) {
      console.error('Error updating shipment:', error);
      throw error;
    }
  }

  /**
   * Cancel shipment
   */
  async cancelShipment(shipmentId: string): Promise<IShipment | null> {
    try {
      const shipment = await Shipment.findById(shipmentId);
      if (!shipment) {
        throw new Error(`Shipment not found: ${shipmentId}`);
      }

      if (shipment.status === 'delivered') {
        throw new Error('Cannot cancel delivered shipment');
      }

      shipment.status = 'cancelled';
      await shipment.save();

      // Add to order timeline
      const order = await Order.findById(shipment.orderId);
      if (order) {
        if (!order.timeline) {
          order.timeline = [];
        }

        order.timeline.push({
          actor: 'admin',
          action: 'order.cancelled',
          timestamp: new Date(),
          meta: {
            shipmentId: shipment._id.toString(),
          },
        });

        await order.save();
      }

      return shipment;
    } catch (error) {
      console.error('Error cancelling shipment:', error);
      throw error;
    }
  }

  /**
   * Delete (archive) shipment
   * Only if not yet shipped
   */
  async deleteShipment(shipmentId: string): Promise<void> {
    try {
      const shipment = await Shipment.findById(shipmentId);
      if (!shipment) {
        throw new Error(`Shipment not found: ${shipmentId}`);
      }

      if (shipment.status === 'shipped' || shipment.status === 'delivered') {
        throw new Error('Cannot delete shipped or delivered shipment');
      }

      await Shipment.deleteOne({ _id: shipmentId });
    } catch (error) {
      console.error('Error deleting shipment:', error);
      throw error;
    }
  }

  /**
   * Get tracking info (customer visible)
   */
  async getTrackingInfo(orderId: string) {
    try {
      const shipment = await Shipment.findOne({
        orderId: new mongoose.Types.ObjectId(orderId),
        status: { $ne: 'cancelled' },
      });

      if (!shipment) {
        return null;
      }

      return {
        status: shipment.status,
        trackingNumber: shipment.trackingNumber,
        trackingUrl: shipment.trackingUrl,
        courierName: shipment.courierName,
        shippedAt: shipment.shippedAt,
        deliveredAt: shipment.deliveredAt,
        estimatedDelivery: shipment.meta?.estimatedDelivery,
      };
    } catch (error) {
      console.error('Error getting tracking info:', error);
      throw error;
    }
  }
}

export default new ShipmentService();
