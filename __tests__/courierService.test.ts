import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import CourierService from '@/lib/services/courierService';
import CourierRate from '@/models/CourierModel';

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
  await CourierRate.deleteMany({});
});

describe('CourierService', () => {
  // ✅ TEST 1: Create courier rate
  it('should create a new courier rate', async () => {
    const rate = await CourierService.createRate({
      courierId: 'delhivery',
      carrierName: 'Delhivery',
      basePrice: 50,
      weightSlab: {
        upTo1kg: 30,
        upTo5kg: 50,
        upTo10kg: 75,
        upTo20kg: 100,
        additionalPerKg: 5,
      },
      regional: {
        sameState: 1.0,
        otherState: 1.2,
        northeast: 1.5,
      },
      serviceType: 'standard',
      isActive: true,
      estimatedDays: { min: 3, max: 5 },
    });

    expect(rate).toBeDefined();
    expect(rate.courierId).toBe('delhivery');
    expect(rate.carrierName).toBe('Delhivery');
    expect(rate.basePrice).toBe(50);
  });

  // ✅ TEST 2: Get courier rate
  it('should fetch a courier rate by ID', async () => {
    await CourierService.createRate({
      courierId: 'shiprocket',
      carrierName: 'Shiprocket',
      basePrice: 40,
      weightSlab: {
        upTo1kg: 25,
        upTo5kg: 45,
        upTo10kg: 70,
        upTo20kg: 90,
        additionalPerKg: 4,
      },
      serviceType: 'express',
      isActive: true,
    });

    const rate = await CourierService.getRate('shiprocket');
    expect(rate).toBeDefined();
    expect(rate?.carrierName).toBe('Shiprocket');
  });

  // ✅ TEST 3: Update courier rate
  it('should update a courier rate', async () => {
    await CourierService.createRate({
      courierId: 'fedex',
      carrierName: 'FedEx',
      basePrice: 80,
      weightSlab: {
        upTo1kg: 50,
        upTo5kg: 80,
        upTo10kg: 120,
        upTo20kg: 150,
        additionalPerKg: 8,
      },
      serviceType: 'express',
      isActive: true,
    });

    const updated = await CourierService.updateRate('fedex', {
      basePrice: 75,
    });

    expect(updated?.basePrice).toBe(75);
  });

  // ✅ TEST 4: Delete (soft delete) courier rate
  it('should soft delete a courier rate', async () => {
    await CourierService.createRate({
      courierId: 'ecom',
      carrierName: 'Ecom Express',
      basePrice: 35,
      weightSlab: {
        upTo1kg: 20,
        upTo5kg: 40,
        upTo10kg: 60,
        upTo20kg: 80,
        additionalPerKg: 3,
      },
      serviceType: 'economy',
      isActive: true,
    });

    const deleted = await CourierService.deleteRate('ecom');
    expect(deleted).toBe(true);

    const rate = await CourierService.getRate('ecom');
    expect(rate?.isActive).toBe(false);
  });

  // ✅ TEST 5: List courier rates with filters
  it('should list courier rates with filters', async () => {
    await CourierService.createRate({
      courierId: 'express1',
      carrierName: 'Express Courier',
      basePrice: 60,
      serviceType: 'express',
      isActive: true,
      weightSlab: {
        upTo1kg: 35,
        upTo5kg: 55,
        upTo10kg: 80,
        upTo20kg: 110,
        additionalPerKg: 6,
      },
    });

    await CourierService.createRate({
      courierId: 'economy1',
      carrierName: 'Economy Courier',
      basePrice: 25,
      serviceType: 'economy',
      isActive: true,
      weightSlab: {
        upTo1kg: 15,
        upTo5kg: 30,
        upTo10kg: 50,
        upTo20kg: 70,
        additionalPerKg: 2,
      },
    });

    const expressRates = await CourierService.listRates({
      serviceType: 'express',
    });

    expect(expressRates.length).toBe(1);
    expect(expressRates[0].serviceType).toBe('express');
  });

  // ✅ TEST 6: Calculate shipping cost
  it('should calculate shipping cost correctly', async () => {
    await CourierService.createRate({
      courierId: 'test-courier',
      carrierName: 'Test Courier',
      basePrice: 50,
      weightSlab: {
        upTo1kg: 30,
        upTo5kg: 50,
        upTo10kg: 75,
        upTo20kg: 100,
        additionalPerKg: 5,
      },
      regional: {
        sameState: 1.0,
        otherState: 1.2,
        northeast: 1.5,
      },
      serviceType: 'standard',
      isActive: true,
      availablePin: { include: [], exclude: [] },
    });

    const cost = await CourierService.calculateShippingCost({
      weight: 2,
      sourcePin: '110001',
      destPin: '110002',
      courierId: 'test-courier',
    });

    expect(cost).toBeGreaterThan(0);
    // Same state: base (50) + weight (50) * 1.0 = 100
    expect(cost).toBe(100);
  });

  // ✅ TEST 7: Get available couriers for route
  it('should return available couriers for a route', async () => {
    await CourierService.createRate({
      courierId: 'courier1',
      carrierName: 'Courier 1',
      basePrice: 50,
      serviceType: 'standard',
      isActive: true,
      weightSlab: {
        upTo1kg: 30,
        upTo5kg: 50,
        upTo10kg: 75,
        upTo20kg: 100,
        additionalPerKg: 5,
      },
      availablePin: { include: [], exclude: [] },
      estimatedDays: { min: 3, max: 5 },
    });

    await CourierService.createRate({
      courierId: 'courier2',
      carrierName: 'Courier 2',
      basePrice: 60,
      serviceType: 'express',
      isActive: true,
      weightSlab: {
        upTo1kg: 40,
        upTo5kg: 60,
        upTo10kg: 85,
        upTo20kg: 110,
        additionalPerKg: 6,
      },
      availablePin: { include: [], exclude: [] },
      estimatedDays: { min: 1, max: 2 },
    });

    const available = await CourierService.getAvailableCouriers(
      2,
      '110001',
      '110002'
    );

    expect(available.length).toBe(2);
    expect(available[0].cost).toBeLessThanOrEqual(available[1].cost);
  });

  // ✅ TEST 8: Verify PIN code availability
  it('should respect PIN code restrictions', async () => {
    await CourierService.createRate({
      courierId: 'restricted',
      carrierName: 'Restricted Courier',
      basePrice: 50,
      serviceType: 'standard',
      isActive: true,
      weightSlab: {
        upTo1kg: 30,
        upTo5kg: 50,
        upTo10kg: 75,
        upTo20kg: 100,
        additionalPerKg: 5,
      },
      availablePin: {
        include: ['110001', '110002'],
        exclude: ['110003'],
      },
    });

    // Should work for included PIN
    const cost1 = await CourierService.calculateShippingCost({
      weight: 1,
      sourcePin: '110001',
      destPin: '110001',
      courierId: 'restricted',
    });
    expect(cost1).toBeGreaterThan(0);

    // Should fail for excluded PIN
    try {
      await CourierService.calculateShippingCost({
        weight: 1,
        sourcePin: '110001',
        destPin: '110003',
        courierId: 'restricted',
      });
      fail('Should have thrown error');
    } catch (error: any) {
      expect(error.message).toContain('not available');
    }
  });
});
