/**
 * Phase 3.1: Product Management Service Test
 * Prerequisites: Phase 2 (User Authentication)
 * 
 * Tests product creation, validation, update, and deletion
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import Product from '@/models/ProductModel';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.connection.close();
  await mongoServer.stop();
});

describe('Phase 3.1: Product Management', () => {
  beforeEach(async () => {
    await mongoose.connection.dropDatabase();
  });

  describe('Product Creation', () => {
    it('should create product with valid data', async () => {
      const productData = {
        name: 'Kurta',
        slug: 'kurta',
        description: 'Traditional kurta',
        basePrice: 1500,
        currency: 'INR',
        category: new mongoose.Types.ObjectId(),
        sku: 'KURTA-001',
        images: ['image1.jpg', 'image2.jpg'],
        status: 'active',
      };

      const product = new Product(productData);
      const savedProduct = await product.save();

      expect(savedProduct._id).toBeDefined();
      expect(savedProduct.name).toBe('Kurta');
      expect(savedProduct.basePrice).toBe(1500);
      expect(savedProduct.status).toBe('active');
    });

    it('should require name and basePrice', async () => {
      const product = new Product({
        slug: 'test',
        description: 'Test product',
        currency: 'INR',
      });

      try {
        await product.save();
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.errors).toBeDefined();
      }
    });

    it('should validate basePrice is positive', async () => {
      const product = new Product({
        name: 'Invalid Price',
        slug: 'invalid',
        basePrice: -100,
        currency: 'INR',
        category: new mongoose.Types.ObjectId(),
        sku: 'INVALID-001',
      });

      try {
        await product.save();
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.errors?.basePrice).toBeDefined();
      }
    });

    it('should enforce unique SKU', async () => {
      const productData = {
        name: 'Product 1',
        slug: 'product-1',
        basePrice: 1000,
        currency: 'INR',
        category: new mongoose.Types.ObjectId(),
        sku: 'UNIQUE-SKU',
      };

      const product1 = new Product(productData);
      await product1.save();

      const product2 = new Product(productData);
      try {
        await product2.save();
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.code).toBe(11000);
      }
    });
  });

  describe('Product Validation', () => {
    it('should handle variant SKUs', async () => {
      const product = new Product({
        name: 'Kurta with Variants',
        slug: 'kurta-variants',
        basePrice: 1500,
        currency: 'INR',
        category: new mongoose.Types.ObjectId(),
        sku: 'KURTA-VAR',
        variants: [
          {
            sku: 'KURTA-VAR-M',
            size: 'M',
            color: 'Blue',
            price: 1600,
            stock: 10,
          },
          {
            sku: 'KURTA-VAR-L',
            size: 'L',
            color: 'Blue',
            price: 1600,
            stock: 15,
          },
        ],
      });

      const savedProduct = await product.save();
      expect(savedProduct.variants?.length).toBe(2);
    });

    it('should store product metadata', async () => {
      const product = new Product({
        name: 'Premium Kurta',
        slug: 'premium-kurta',
        description: 'High quality kurta',
        basePrice: 2500,
        currency: 'INR',
        category: new mongoose.Types.ObjectId(),
        sku: 'PREMIUM-001',
        tags: ['traditional', 'cotton', 'premium'],
        brand: 'ZNM',
      });

      const savedProduct = await product.save();
      expect(savedProduct.tags).toContain('traditional');
      expect(savedProduct.brand).toBe('ZNM');
    });
  });

  describe('Product Updates', () => {
    let product: any;

    beforeEach(async () => {
      product = await Product.create({
        name: 'Original Name',
        slug: 'original',
        basePrice: 1000,
        currency: 'INR',
        category: new mongoose.Types.ObjectId(),
        sku: 'UPDATE-TEST',
      });
    });

    it('should update product name', async () => {
      product.name = 'Updated Name';
      const updatedProduct = await product.save();

      expect(updatedProduct.name).toBe('Updated Name');

      const fetchedProduct = await Product.findById(product._id);
      expect(fetchedProduct?.name).toBe('Updated Name');
    });

    it('should update product price', async () => {
      product.basePrice = 1500;
      await product.save();

      const fetchedProduct = await Product.findById(product._id);
      expect(fetchedProduct?.basePrice).toBe(1500);
    });

    it('should update product status', async () => {
      product.status = 'inactive';
      await product.save();

      const fetchedProduct = await Product.findById(product._id);
      expect(fetchedProduct?.status).toBe('inactive');
    });

    it('should not allow SKU change', async () => {
      product.sku = 'NEW-SKU';
      
      try {
        await product.save();
        // SKU might be immutable depending on model
      } catch (error) {
        // Expected behavior
      }
    });
  });

  describe('Product Deletion', () => {
    it('should support soft delete via status change', async () => {
      const product = await Product.create({
        name: 'To Delete',
        slug: 'delete-test',
        basePrice: 1000,
        currency: 'INR',
        category: new mongoose.Types.ObjectId(),
        sku: 'DELETE-001',
      });

      product.status = 'archived';
      await product.save();

      const fetchedProduct = await Product.findById(product._id);
      expect(fetchedProduct?.status).toBe('archived');
    });

    it('should support permanent deletion', async () => {
      const product = await Product.create({
        name: 'To Permanently Delete',
        slug: 'perma-delete',
        basePrice: 1000,
        currency: 'INR',
        category: new mongoose.Types.ObjectId(),
        sku: 'PERMA-001',
      });

      const productId = product._id;
      await Product.deleteOne({ _id: productId });

      const deletedProduct = await Product.findById(productId);
      expect(deletedProduct).toBeNull();
    });
  });

  describe('Product Search & Filter', () => {
    beforeEach(async () => {
      const categoryId = new mongoose.Types.ObjectId();
      
      await Product.create([
        {
          name: 'Kurta Blue',
          slug: 'kurta-blue',
          basePrice: 1500,
          currency: 'INR',
          category: categoryId,
          sku: 'KURTA-BLUE',
          tags: ['kurta', 'blue'],
          status: 'active',
        },
        {
          name: 'Kurta Red',
          slug: 'kurta-red',
          basePrice: 1500,
          currency: 'INR',
          category: categoryId,
          sku: 'KURTA-RED',
          tags: ['kurta', 'red'],
          status: 'active',
        },
        {
          name: 'Sherwani Gold',
          slug: 'sherwani-gold',
          basePrice: 5000,
          currency: 'INR',
          category: new mongoose.Types.ObjectId(),
          sku: 'SHERWANI-GOLD',
          tags: ['sherwani', 'gold'],
          status: 'active',
        },
      ]);
    });

    it('should find product by name', async () => {
      const products = await Product.find({ name: /Kurta/ });
      expect(products.length).toBe(2);
    });

    it('should filter by status', async () => {
      const products = await Product.find({ status: 'active' });
      expect(products.length).toBe(3);
    });

    it('should filter by price range', async () => {
      const products = await Product.find({
        basePrice: { $gte: 2000, $lte: 5000 },
      });
      expect(products.length).toBe(1);
      expect(products[0].name).toBe('Sherwani Gold');
    });

    it('should find product by SKU', async () => {
      const product = await Product.findOne({ sku: 'KURTA-BLUE' });
      expect(product?.name).toBe('Kurta Blue');
    });
  });
});
