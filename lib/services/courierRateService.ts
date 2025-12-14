import CourierRate, { ICourierRate } from '@/models/CourierRateModel';
import Order from '@/models/OrderModel';
import mongoose from 'mongoose';

/**
 * Courier Rate Service
 * Handles courier pricing rules and shipping cost calculation
 */

interface CreateRateOptions {
  courierName: string;
  zones: { name: string; pincodes: string[] }[];
  weightSlabs: { minWeight: number; maxWeight: number; price: number }[];
  codExtraCharge?: number;
  prepaidDiscount?: number;
  minOrderValue?: number;
  status?: 'active' | 'inactive' | 'archived';
  createdBy?: string;
}

interface UpdateRateOptions {
  zones?: { name: string; pincodes: string[] }[];
  weightSlabs?: { minWeight: number; maxWeight: number; price: number }[];
  codExtraCharge?: number;
  prepaidDiscount?: number;
  minOrderValue?: number;
  status?: 'active' | 'inactive' | 'archived';
  updatedBy?: string;
}

interface CalculateShippingOptions {
  courierName: string;
  pincode: string;
  weight: number;
  orderValue: number;
  paymentMethod: 'cod' | 'paid';
}

interface ShippingCostResult {
  baseCost: number;
  extraCharge: number;
  discount: number;
  totalCost: number;
  zone: string;
}

class CourierRateService {
  /**
   * Create new courier rate rule
   */
  async createRate(options: CreateRateOptions): Promise<ICourierRate> {
    try {
      const {
        courierName,
        zones,
        weightSlabs,
        codExtraCharge = 0,
        prepaidDiscount = 0,
        minOrderValue = 0,
        status = 'active',
        createdBy,
      } = options;

      // Validate weight slabs
      for (const slab of weightSlabs) {
        if (slab.minWeight >= slab.maxWeight) {
          throw new Error(`Min weight must be less than max weight in slab`);
        }
      }

      const rate = new CourierRate({
        courierName,
        zones,
        weightSlabs,
        codExtraCharge,
        prepaidDiscount,
        minOrderValue,
        status,
        createdBy: createdBy ? new mongoose.Types.ObjectId(createdBy) : undefined,
      });

      await rate.save();
      return rate;
    } catch (error) {
      console.error('Error creating courier rate:', error);
      throw error;
    }
  }

  /**
   * Get courier rate by ID
   */
  async getRate(rateId: string): Promise<ICourierRate | null> {
    try {
      return await CourierRate.findById(rateId).populate('createdBy', 'name');
    } catch (error) {
      console.error('Error getting courier rate:', error);
      throw error;
    }
  }

  /**
   * List all courier rates with filters
   */
  async listRates(options?: {
    courierName?: string;
    status?: string;
    skip?: number;
    limit?: number;
  }): Promise<ICourierRate[]> {
    try {
      const query: any = {};

      if (options?.courierName) {
        query.courierName = options.courierName;
      }

      if (options?.status) {
        query.status = options.status;
      }

      return await CourierRate.find(query)
        .sort({ createdAt: -1 })
        .skip(options?.skip || 0)
        .limit(options?.limit || 50)
        .populate('createdBy', 'name');
    } catch (error) {
      console.error('Error listing courier rates:', error);
      throw error;
    }
  }

  /**
   * Update courier rate
   */
  async updateRate(rateId: string, options: UpdateRateOptions): Promise<ICourierRate | null> {
    try {
      const rate = await CourierRate.findById(rateId);
      if (!rate) {
        throw new Error(`Courier rate not found: ${rateId}`);
      }

      // Update fields
      if (options.zones) {
        rate.zones = options.zones;
      }

      if (options.weightSlabs) {
        // Validate weight slabs
        for (const slab of options.weightSlabs) {
          if (slab.minWeight >= slab.maxWeight) {
            throw new Error(`Min weight must be less than max weight in slab`);
          }
        }
        rate.weightSlabs = options.weightSlabs;
      }

      if (options.codExtraCharge !== undefined) {
        rate.codExtraCharge = options.codExtraCharge;
      }

      if (options.prepaidDiscount !== undefined) {
        rate.prepaidDiscount = options.prepaidDiscount;
      }

      if (options.minOrderValue !== undefined) {
        rate.minOrderValue = options.minOrderValue;
      }

      if (options.status) {
        if (options.status === 'archived' && rate.status !== 'archived') {
          rate.archivedAt = new Date();
        }
        rate.status = options.status;
      }

      if (options.updatedBy) {
        rate.updatedBy = new mongoose.Types.ObjectId(options.updatedBy);
      }

      await rate.save();
      return rate;
    } catch (error) {
      console.error('Error updating courier rate:', error);
      throw error;
    }
  }

  /**
   * Archive courier rate
   */
  async archiveRate(rateId: string): Promise<ICourierRate | null> {
    try {
      return await this.updateRate(rateId, { status: 'archived' });
    } catch (error) {
      console.error('Error archiving courier rate:', error);
      throw error;
    }
  }

  /**
   * Delete courier rate
   */
  async deleteRate(rateId: string): Promise<void> {
    try {
      await CourierRate.findByIdAndDelete(rateId);
    } catch (error) {
      console.error('Error deleting courier rate:', error);
      throw error;
    }
  }

  /**
   * Calculate shipping cost based on order details
   */
  async calculateShippingCost(
    options: CalculateShippingOptions
  ): Promise<ShippingCostResult> {
    try {
      const { courierName, pincode, weight, orderValue, paymentMethod } = options;

      // Get active courier rate
      const rate = await CourierRate.findOne({
        courierName,
        status: 'active',
      });

      if (!rate) {
        throw new Error(`No active rate found for courier: ${courierName}`);
      }

      // Find zone for pincode
      let zone = null;
      for (const z of rate.zones) {
        if (z.pincodes.includes(pincode)) {
          zone = z.name;
          break;
        }
      }

      if (!zone) {
        throw new Error(`Pincode ${pincode} not found in service zones`);
      }

      // Find matching weight slab
      let baseCost = 0;
      for (const slab of rate.weightSlabs) {
        if (weight >= slab.minWeight && weight <= slab.maxWeight) {
          baseCost = slab.price;
          break;
        }
      }

      if (baseCost === 0 && weight > 0) {
        throw new Error(`Weight ${weight}kg not covered in slabs`);
      }

      // Calculate extra charges
      let extraCharge = 0;
      if (paymentMethod === 'cod') {
        extraCharge = (baseCost * rate.codExtraCharge) / 100;
      }

      // Apply discount for prepaid
      let discount = 0;
      if (paymentMethod === 'paid') {
        discount = (baseCost * rate.prepaidDiscount) / 100;
      }

      // Check for free shipping
      let totalCost = baseCost + extraCharge - discount;
      if (rate.minOrderValue > 0 && orderValue >= rate.minOrderValue) {
        totalCost = 0;
      } else if (totalCost < 0) {
        totalCost = 0;
      }

      return {
        baseCost: Math.round(baseCost * 100) / 100,
        extraCharge: Math.round(extraCharge * 100) / 100,
        discount: Math.round(discount * 100) / 100,
        totalCost: Math.round(totalCost * 100) / 100,
        zone,
      };
    } catch (error) {
      console.error('Error calculating shipping cost:', error);
      throw error;
    }
  }

  /**
   * Get rate for courier
   */
  async getRateForCourier(courierName: string): Promise<ICourierRate | null> {
    try {
      return await CourierRate.findOne({
        courierName,
        status: 'active',
      });
    } catch (error) {
      console.error('Error getting rate for courier:', error);
      throw error;
    }
  }
}

export default new CourierRateService();
