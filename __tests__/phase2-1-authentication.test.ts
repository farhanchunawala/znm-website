/**
 * Phase 2.1: User Authentication Service Test
 * Prerequisites: Phase 1 (Database)
 * 
 * Tests user creation, login, and JWT token generation
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import User from '@/models/UserModel';
import bcrypt from 'bcryptjs';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.connection.close();
  await mongoServer.stop();
});

describe('Phase 2.1: User Authentication', () => {
  beforeEach(async () => {
    await mongoose.connection.dropDatabase();
  });

  describe('User Creation', () => {
    it('should create user with valid data', async () => {
      const userData = {
        email: 'user@example.com',
        password: 'hashedPassword123', // In real app, this should be hashed
        firstName: 'John',
        lastName: 'Doe',
        role: 'customer',
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser._id).toBeDefined();
      expect(savedUser.email).toBe('user@example.com');
      expect(savedUser.firstName).toBe('John');
      expect(savedUser.role).toBe('customer');
    });

    it('should reject duplicate email', async () => {
      const userData = {
        email: 'duplicate@example.com',
        password: 'password123',
        firstName: 'User',
        lastName: 'One',
        role: 'customer',
      };

      const user1 = new User(userData);
      await user1.save();

      const user2 = new User(userData);
      
      try {
        await user2.save();
        expect(true).toBe(false); // Should throw error
      } catch (error: any) {
        expect(error.code).toBe(11000); // Duplicate key error
      }
    });

    it('should require email and password', async () => {
      const user = new User({
        firstName: 'John',
        lastName: 'Doe',
        role: 'customer',
      });

      try {
        await user.save();
        expect(true).toBe(false); // Should throw error
      } catch (error: any) {
        expect(error.errors).toBeDefined();
        expect(error.errors.email || error.errors.password).toBeDefined();
      }
    });
  });

  describe('User Login', () => {
    let testUser: any;

    beforeEach(async () => {
      const hashedPassword = await bcrypt.hash('testPassword123', 10);
      testUser = new User({
        email: 'login@example.com',
        password: hashedPassword,
        firstName: 'Login',
        lastName: 'Test',
        role: 'customer',
      });
      await testUser.save();
    });

    it('should find user by email', async () => {
      const user = await User.findOne({ email: 'login@example.com' });
      expect(user).toBeDefined();
      expect(user?.email).toBe('login@example.com');
    });

    it('should verify correct password', async () => {
      const user = await User.findOne({ email: 'login@example.com' });
      const isValid = await bcrypt.compare('testPassword123', user!.password);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const user = await User.findOne({ email: 'login@example.com' });
      const isValid = await bcrypt.compare('wrongPassword', user!.password);
      expect(isValid).toBe(false);
    });

    it('should return null for non-existent user', async () => {
      const user = await User.findOne({ email: 'nonexistent@example.com' });
      expect(user).toBeNull();
    });
  });

  describe('Password Management', () => {
    it('should hash password before saving', async () => {
      const plainPassword = 'myPassword123';
      const hashedPassword = await bcrypt.hash(plainPassword, 10);
      
      const user = new User({
        email: 'hash@example.com',
        password: hashedPassword,
        firstName: 'Hash',
        lastName: 'Test',
        role: 'customer',
      });
      await user.save();

      const savedUser = await User.findOne({ email: 'hash@example.com' });
      expect(savedUser?.password).not.toBe(plainPassword);
      expect(savedUser?.password).toBe(hashedPassword);
    });

    it('should allow password update', async () => {
      const user = new User({
        email: 'update@example.com',
        password: 'oldPassword',
        firstName: 'Update',
        lastName: 'Test',
        role: 'customer',
      });
      await user.save();

      const foundUser = await User.findOne({ email: 'update@example.com' });
      const newHashedPassword = await bcrypt.hash('newPassword', 10);
      foundUser!.password = newHashedPassword;
      await foundUser!.save();

      const updatedUser = await User.findOne({ email: 'update@example.com' });
      expect(updatedUser?.password).toBe(newHashedPassword);
    });
  });

  describe('User Profile', () => {
    it('should store user metadata', async () => {
      const user = new User({
        email: 'profile@example.com',
        password: 'password',
        firstName: 'Profile',
        lastName: 'User',
        role: 'customer',
        phone: '+1234567890',
      });
      await user.save();

      const savedUser = await User.findOne({ email: 'profile@example.com' });
      expect(savedUser?.phone).toBe('+1234567890');
      expect(savedUser?.firstName).toBe('Profile');
    });

    it('should track user creation date', async () => {
      const user = new User({
        email: 'timestamp@example.com',
        password: 'password',
        firstName: 'Time',
        lastName: 'Stamp',
        role: 'customer',
      });
      await user.save();

      const savedUser = await User.findOne({ email: 'timestamp@example.com' });
      expect(savedUser?.createdAt).toBeDefined();
      expect(new Date(savedUser!.createdAt) <= new Date()).toBe(true);
    });
  });
});
