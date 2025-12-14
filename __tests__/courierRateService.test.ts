import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import courierRateService from '@/lib/services/courierRateService';
import CourierRate from '@/models/CourierRateModel';
import User from '@/models/UserModel';

let mongoServer: MongoMemoryServer;

describe('Courier Rate Service', () => {
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
    await CourierRate.deleteMany({});
    await User.deleteMany({});
  });

  describe('createRate', () => {
    it('should create a new courier rate', async () => {
      const rate = await courierRateService.createRate({
        courierName: 'Delhivery',
        zones: [
          {
            name: 'North',
            pincodes: ['110001', '110002', '110003'],
          },
        ],
        weightSlabs: [
          {
            minWeight: 0,
            maxWeight: 5,
            price: 100,
          },
          {
            minWeight: 5,
            maxWeight: 10,
            price: 150,
          },
        ],
        codExtraCharge: 5,
        prepaidDiscount: 10,
        minOrderValue: 500,
      });

      expect(rate).toBeDefined();
      expect(rate.courierName).toBe('Delhivery');
      expect(rate.zones).toHaveLength(1);
      expect(rate.weightSlabs).toHaveLength(2);
      expect(rate.status).toBe('active');
    });

    it('should validate weight slabs', async () => {
      try {
        await courierRateService.createRate({
          courierName: 'Delhivery',
          zones: [
            {
              name: 'North',
              pincodes: ['110001'],
            },
          ],
          weightSlabs: [
            {
              minWeight: 5,
              maxWeight: 5, // Invalid: min >= max
              price: 100,
            },
          ],
        });
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(String(error)).toContain('Min weight must be less than max weight');
      }
    });
  });

  describe('calculateShippingCost', () => {
    let rateId: string;

    beforeEach(async () => {
      const rate = await courierRateService.createRate({
        courierName: 'Delhivery',
        zones: [
          {
            name: 'North',
            pincodes: ['110001', '110002'],
          },
          {
            name: 'South',
            pincodes: ['560001', '560002'],
          },
        ],
        weightSlabs: [
          {
            minWeight: 0,
            maxWeight: 5,
            price: 100,
          },
          {
            minWeight: 5,
            maxWeight: 10,
            price: 150,
          },
        ],
        codExtraCharge: 5, // 5% extra for COD
        prepaidDiscount: 10, // 10% discount for prepaid
        minOrderValue: 500,
      });

      rateId = rate._id.toString();
    });

    it('should calculate base shipping cost for prepaid order', async () => {
      const result = await courierRateService.calculateShippingCost({
        courierName: 'Delhivery',
        pincode: '110001',
        weight: 2,
        orderValue: 300, // Below minOrderValue of 500
        paymentMethod: 'paid',
      });

      expect(result.baseCost).toBe(100);
      expect(result.extraCharge).toBe(0);
      expect(result.discount).toBe(10); // 10% of 100
      expect(result.totalCost).toBe(90);
      expect(result.zone).toBe('North');
    });

    it('should add extra charge for COD orders', async () => {
      const result = await courierRateService.calculateShippingCost({
        courierName: 'Delhivery',
        pincode: '110001',
        weight: 2,
        orderValue: 300, // Below minOrderValue of 500
        paymentMethod: 'cod',
      });

      expect(result.baseCost).toBe(100);
      expect(result.extraCharge).toBe(5); // 5% of 100
      expect(result.discount).toBe(0);
      expect(result.totalCost).toBe(105);
    });

    it('should apply free shipping for high order value', async () => {
      const result = await courierRateService.calculateShippingCost({
        courierName: 'Delhivery',
        pincode: '110001',
        weight: 2,
        orderValue: 600, // >= minOrderValue of 500
        paymentMethod: 'paid',
      });

      expect(result.totalCost).toBe(0);
    });

    it('should find correct weight slab', async () => {
      const result = await courierRateService.calculateShippingCost({
        courierName: 'Delhivery',
        pincode: '110001',
        weight: 7, // Falls in 5-10 slab
        orderValue: 300, // Below minOrderValue
        paymentMethod: 'paid',
      });

      expect(result.baseCost).toBe(150);
      expect(result.totalCost).toBe(135); // 150 - (10% of 150)
    });

    it('should throw error for invalid pincode', async () => {
      try {
        await courierRateService.calculateShippingCost({
          courierName: 'Delhivery',
          pincode: '999999',
          weight: 2,
          orderValue: 1000,
          paymentMethod: 'paid',
        });
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(String(error)).toContain('not found in service zones');
      }
    });

    it('should throw error for weight not covered in slabs', async () => {
      try {
        await courierRateService.calculateShippingCost({
          courierName: 'Delhivery',
          pincode: '110001',
          weight: 15, // > max 10
          orderValue: 1000,
          paymentMethod: 'paid',
        });
        expect(true).toBe(false);
      } catch (error) {
        expect(String(error)).toContain('not covered in slabs');
      }
    });
  });

  describe('updateRate', () => {
    let rateId: string;

    beforeEach(async () => {
      const rate = await courierRateService.createRate({
        courierName: 'Delhivery',
        zones: [
          {
            name: 'North',
            pincodes: ['110001'],
          },
        ],
        weightSlabs: [
          {
            minWeight: 0,
            maxWeight: 5,
            price: 100,
          },
        ],
      });

      rateId = rate._id.toString();
    });

    it('should update courier rate', async () => {
      const updated = await courierRateService.updateRate(rateId, {
        codExtraCharge: 10,
        prepaidDiscount: 15,
      });

      expect(updated).toBeDefined();
      expect(updated?.codExtraCharge).toBe(10);
      expect(updated?.prepaidDiscount).toBe(15);
    });

    it('should archive rate', async () => {
      const archived = await courierRateService.archiveRate(rateId);

      expect(archived?.status).toBe('archived');
      expect(archived?.archivedAt).toBeDefined();
    });
  });

  describe('listRates', () => {
    beforeEach(async () => {
      await CourierRate.deleteMany({}); // Clear all rates
      
      await courierRateService.createRate({
        courierName: 'Delhivery',
        zones: [{ name: 'North', pincodes: ['110001'] }],
        weightSlabs: [{ minWeight: 0, maxWeight: 5, price: 100 }],
      });

      await courierRateService.createRate({
        courierName: 'Shiprocket',
        zones: [{ name: 'South', pincodes: ['560001'] }],
        weightSlabs: [{ minWeight: 0, maxWeight: 5, price: 80 }],
      });
    });

    it('should list all rates', async () => {
      const rates = await courierRateService.listRates();

      expect(rates).toHaveLength(2);
    });

    it('should filter by courier name', async () => {
      const rates = await courierRateService.listRates({ courierName: 'Delhivery' });

      expect(rates).toHaveLength(1);
      expect(rates[0].courierName).toBe('Delhivery');
    });

    it('should filter by status', async () => {
      const rate = await courierRateService.createRate({
        courierName: 'Fedex',
        zones: [{ name: 'West', pincodes: ['400001'] }],
        weightSlabs: [{ minWeight: 0, maxWeight: 5, price: 120 }],
        status: 'inactive',
      });

      const activeRates = await courierRateService.listRates({ status: 'active' });
      expect(activeRates).toHaveLength(2); // Only Delhivery and Shiprocket
      
      const inactiveRates = await courierRateService.listRates({ status: 'inactive' });
      expect(inactiveRates).toHaveLength(1);
    });
  });

  describe('getRateForCourier', () => {
    it('should get active rate for courier', async () => {
      await courierRateService.createRate({
        courierName: 'Delhivery',
        zones: [{ name: 'North', pincodes: ['110001'] }],
        weightSlabs: [{ minWeight: 0, maxWeight: 5, price: 100 }],
        status: 'active',
      });

      const rate = await courierRateService.getRateForCourier('Delhivery');

      expect(rate).toBeDefined();
      expect(rate?.courierName).toBe('Delhivery');
      expect(rate?.status).toBe('active');
    });

    it('should not return archived rates', async () => {
      const rate = await courierRateService.createRate({
        courierName: 'Delhivery',
        zones: [{ name: 'North', pincodes: ['110001'] }],
        weightSlabs: [{ minWeight: 0, maxWeight: 5, price: 100 }],
      });

      await courierRateService.archiveRate(rate._id.toString());
      const result = await courierRateService.getRateForCourier('Delhivery');

      expect(result).toBeNull();
    });
  });
});
