/**
 * Phase 1: Database Connection & Models Test
 * Prerequisites: None
 * 
 * Tests core database functionality and model initialization
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import Order from '@/models/OrderModel';
import User from '@/models/UserModel';
import Product from '@/models/ProductModel';
import Category from '@/models/CategoryModel';
import Inventory from '@/models/InventoryModel';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.connection.close();
  await mongoServer.stop();
});

describe('Phase 1: Database & Models', () => {
  beforeEach(async () => {
    await mongoose.connection.dropDatabase();
  });

  describe('Database Connection', () => {
    it('should successfully connect to MongoDB', () => {
      expect(mongoose.connection.readyState).toBe(1); // 1 = connected
    });

    it('should have access to database instance', () => {
      expect(mongoose.connection.db).toBeDefined();
    });
  });

  describe('Model Initialization', () => {
    it('should initialize Order model', () => {
      expect(Order).toBeDefined();
      expect(Order.collection).toBeDefined();
    });

    it('should initialize User model', () => {
      expect(User).toBeDefined();
      expect(User.collection).toBeDefined();
    });

    it('should initialize Product model', () => {
      expect(Product).toBeDefined();
      expect(Product.collection).toBeDefined();
    });

    it('should initialize Category model', () => {
      expect(Category).toBeDefined();
      expect(Category.collection).toBeDefined();
    });

    it('should initialize Inventory model', () => {
      expect(Inventory).toBeDefined();
      expect(Inventory.collection).toBeDefined();
    });
  });

  describe('Model Indexing', () => {
    it('should create indexes on Order model', async () => {
      const indexes = Order.collection.getIndexes();
      expect(indexes).toBeDefined();
    });

    it('should support basic CRUD operations', async () => {
      // Test Create
      const user = new User({
        email: 'test@example.com',
        password: 'hashed_password',
        firstName: 'Test',
        lastName: 'User',
        role: 'customer',
      });
      const savedUser = await user.save();
      expect(savedUser._id).toBeDefined();

      // Test Read
      const foundUser = await User.findById(savedUser._id);
      expect(foundUser?.email).toBe('test@example.com');

      // Test Update
      foundUser!.firstName = 'Updated';
      const updatedUser = await foundUser!.save();
      expect(updatedUser.firstName).toBe('Updated');

      // Test Delete
      await User.deleteOne({ _id: savedUser._id });
      const deletedUser = await User.findById(savedUser._id);
      expect(deletedUser).toBeNull();
    });
  });
});
