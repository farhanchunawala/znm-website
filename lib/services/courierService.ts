import CourierRate, { ICourierRate } from '@/models/CourierModel';

interface CalculateShippingCostOptions {
  weight: number;
  sourcePin: string;
  destPin: string;
  courierId: string;
}

interface AvailableCourierResult {
  courierId: string;
  carrierName: string;
  cost: number;
  estimatedDays: {
    min: number;
    max: number;
  };
  serviceType: string;
}

interface ListCourierOptions {
  serviceType?: 'express' | 'standard' | 'economy';
  isActive?: boolean;
  skip?: number;
  limit?: number;
  sortBy?: 'carrierName' | 'basePrice' | 'createdAt';
}

/**
 * CourierService
 * Manages shipping cost calculation and courier rates
 */
class CourierService {
  /**
   * Calculate shipping cost for a package
   * Factors: weight slab, source-destination region, courier service type
   */
  async calculateShippingCost(options: CalculateShippingCostOptions): Promise<number> {
    try {
      const { weight, sourcePin, destPin, courierId } = options;

      if (!weight || weight <= 0) {
        throw new Error('Invalid weight');
      }

      // Get courier rate
      const courier = await CourierRate.findOne({
        courierId,
        isActive: true,
      });

      if (!courier) {
        throw new Error(`Courier not found: ${courierId}`);
      }

      // Check if destination is available
      if (!this.isDestinationAvailable(courier, destPin)) {
        throw new Error(`Delivery not available for PIN: ${destPin}`);
      }

      // Calculate cost based on weight slab
      let weightCost = this.calculateWeightCost(weight, courier.weightSlab);

      // Apply regional multiplier
      const regional = this.determineRegionalMultiplier(sourcePin, destPin, courier.regional);
      const costBeforeMultiplier = courier.basePrice + weightCost;
      const finalCost = costBeforeMultiplier * regional;

      return Math.round(finalCost * 100) / 100; // Round to 2 decimals
    } catch (error) {
      console.error('Error calculating shipping cost:', error);
      throw error;
    }
  }

  /**
   * Get all available couriers for a route
   * Returns courierswith calculated costs
   */
  async getAvailableCouriers(
    weight: number,
    sourcePin: string,
    destPin: string
  ): Promise<AvailableCourierResult[]> {
    try {
      const couriers = await CourierRate.find({ isActive: true });

      const available: AvailableCourierResult[] = [];

      for (const courier of couriers) {
        // Check if destination is available
        if (!this.isDestinationAvailable(courier, destPin)) {
          continue;
        }

        try {
          const cost = await this.calculateShippingCost({
            weight,
            sourcePin,
            destPin,
            courierId: courier.courierId,
          });

          available.push({
            courierId: courier.courierId,
            carrierName: courier.carrierName,
            cost,
            estimatedDays: courier.estimatedDays,
            serviceType: courier.serviceType,
          });
        } catch (error) {
          // Skip this courier if calculation fails
          continue;
        }
      }

      // Sort by cost (ascending)
      return available.sort((a, b) => a.cost - b.cost);
    } catch (error) {
      console.error('Error fetching available couriers:', error);
      throw error;
    }
  }

  /**
   * List all courier rates with optional filters
   */
  async listRates(options?: ListCourierOptions): Promise<ICourierRate[]> {
    try {
      const {
        serviceType,
        isActive = true,
        skip = 0,
        limit = 50,
        sortBy = 'carrierName',
      } = options || {};

      const query: any = {};

      if (typeof isActive === 'boolean') {
        query.isActive = isActive;
      }

      if (serviceType) {
        query.serviceType = serviceType;
      }

      const sortObj: any = {};
      sortObj[sortBy] = 1;

      const rates = await CourierRate.find(query).sort(sortObj).skip(skip).limit(limit);

      return rates;
    } catch (error) {
      console.error('Error listing courier rates:', error);
      throw error;
    }
  }

  /**
   * Create a new courier rate
   */
  async createRate(data: Partial<ICourierRate>, createdBy?: string): Promise<ICourierRate> {
    try {
      const rate = new CourierRate({
        ...data,
        createdBy,
      });

      await rate.save();
      return rate;
    } catch (error) {
      console.error('Error creating courier rate:', error);
      throw error;
    }
  }

  /**
   * Update a courier rate
   */
  async updateRate(
    courierId: string,
    data: Partial<ICourierRate>,
    updatedBy?: string
  ): Promise<ICourierRate | null> {
    try {
      const rate = await CourierRate.findOneAndUpdate(
        { courierId },
        {
          ...data,
          lastUpdatedBy: updatedBy,
        },
        { new: true }
      );

      return rate;
    } catch (error) {
      console.error('Error updating courier rate:', error);
      throw error;
    }
  }

  /**
   * Delete (soft delete) a courier rate
   */
  async deleteRate(courierId: string): Promise<boolean> {
    try {
      const result = await CourierRate.updateOne(
        { courierId },
        { isActive: false }
      );

      return result.modifiedCount > 0;
    } catch (error) {
      console.error('Error deleting courier rate:', error);
      throw error;
    }
  }

  /**
   * Get a single courier rate
   */
  async getRate(courierId: string): Promise<ICourierRate | null> {
    try {
      return await CourierRate.findOne({ courierId });
    } catch (error) {
      console.error('Error fetching courier rate:', error);
      throw error;
    }
  }

  // === HELPER METHODS ===

  /**
   * Check if destination PIN is available for courier
   */
  private isDestinationAvailable(courier: ICourierRate, destPin: string): boolean {
    // If include list is empty, all PINs are available (except excluded)
    if (courier.availablePin.include.length === 0) {
      return !courier.availablePin.exclude.includes(destPin);
    }

    // Otherwise, check if PIN is in include list and not in exclude list
    return (
      courier.availablePin.include.includes(destPin) &&
      !courier.availablePin.exclude.includes(destPin)
    );
  }

  /**
   * Calculate cost based on weight slab
   */
  private calculateWeightCost(weight: number, weightSlab: any): number {
    if (weight <= 1) {
      return weightSlab.upTo1kg;
    } else if (weight <= 5) {
      return weightSlab.upTo5kg;
    } else if (weight <= 10) {
      return weightSlab.upTo10kg;
    } else if (weight <= 20) {
      return weightSlab.upTo20kg;
    } else {
      // Weight > 20kg: use base + additional per kg
      const additionalWeight = weight - 20;
      return weightSlab.upTo20kg + additionalWeight * weightSlab.additionalPerKg;
    }
  }

  /**
   * Determine regional multiplier based on source and destination PINs
   * For simplicity, we'll use state codes (first 2 digits of PIN)
   */
  private determineRegionalMultiplier(
    sourcePin: string,
    destPin: string,
    regional: any
  ): number {
    // Extract state codes (simplified - first 2 digits)
    // In production, use proper PIN to state mapping
    const sourceState = sourcePin.substring(0, 2);
    const destState = destPin.substring(0, 2);

    // Check if northeast (simplified - includes some PIN ranges)
    const northeastPins = ['79', '78', '78', '79', '80', '81', '82', '83']; // Sample NE PINs
    const isNortheast = northeastPins.some((pin) => destPin.startsWith(pin));

    if (isNortheast) {
      return regional.northeast;
    } else if (sourceState === destState) {
      return regional.sameState;
    } else {
      return regional.otherState;
    }
  }
}

export default new CourierService();
