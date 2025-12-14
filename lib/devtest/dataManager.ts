import Order from '@/models/OrderModel';
import Payment from '@/models/PaymentModel';
import User from '@/models/UserModel';
import Product from '@/models/ProductModel';
import Category from '@/models/CategoryModel';
import Inventory from '@/models/InventoryModel';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';

/**
 * Test Data Manager
 * Handles seeding, cleanup, and management of test data
 */

export interface TestDataSeed {
  users?: Array<Record<string, any>>;
  products?: Array<Record<string, any>>;
  categories?: Array<Record<string, any>>;
  orders?: Array<Record<string, any>>;
  payments?: Array<Record<string, any>>;
  inventory?: Array<Record<string, any>>;
}

export class TestDataManager {
  private static createdIds: Map<string, string[]> = new Map();
  
  /**
   * Initialize test data
   */
  static async initializeTestData(): Promise<void> {
    await connectDB();
    
    // Clear previous test data
    await this.clearAllTestData();
    
    // Seed base test data
    const seed = this.getDefaultSeed();
    await this.seedData(seed);
  }
  
  /**
   * Get default seed data
   */
  private static getDefaultSeed(): TestDataSeed {
    const adminId = new mongoose.Types.ObjectId();
    const customerId = new mongoose.Types.ObjectId();
    const categoryId = new mongoose.Types.ObjectId();
    const productId = new mongoose.Types.ObjectId();
    
    return {
      users: [
        {
          _id: adminId,
          email: 'admin.devtest@test.com',
          password: 'hashed_password_here',
          name: 'Admin User',
          role: 'admin',
          isAdmin: true,
        },
        {
          _id: customerId,
          email: 'customer.devtest@test.com',
          password: 'hashed_password_here',
          name: 'Test Customer',
          role: 'customer',
          isAdmin: false,
        },
      ],
      categories: [
        {
          _id: categoryId,
          name: 'Test Category',
          slug: 'test-category',
          description: 'Category for testing',
          status: 'active',
        },
      ],
      products: [
        {
          _id: productId,
          name: 'Test Product',
          slug: 'test-product',
          description: 'Test product for devtest',
          category: categoryId,
          basePrice: 1000,
          variants: [
            {
              sku: 'TEST-VARIANT-1',
              name: 'Test Variant 1',
              price: 1000,
              costPrice: 500,
              stock: 100,
              options: { size: 'M', color: 'Red' },
            },
          ],
          status: 'active',
          visibility: 'public',
        },
      ],
      inventory: [
        {
          productId,
          variantSku: 'TEST-VARIANT-1',
          totalStock: 100,
          reservedStock: 0,
          committedStock: 0,
          availableStock: 100,
        },
      ],
    };
  }
  
  /**
   * Seed test data
   */
  static async seedData(seed: TestDataSeed): Promise<Record<string, any>> {
    const created: Record<string, any> = {};
    
    try {
      if (seed.users?.length) {
        const users = await User.insertMany(seed.users);
        created.users = users.map(u => u._id.toString());
        this.trackCreated('users', users.map(u => u._id.toString()));
      }
      
      if (seed.categories?.length) {
        const categories = await Category.insertMany(seed.categories);
        created.categories = categories.map(c => c._id.toString());
        this.trackCreated('categories', categories.map(c => c._id.toString()));
      }
      
      if (seed.products?.length) {
        const products = await Product.insertMany(seed.products);
        created.products = products.map(p => p._id.toString());
        this.trackCreated('products', products.map(p => p._id.toString()));
      }
      
      if (seed.inventory?.length) {
        const inventory = await Inventory.insertMany(seed.inventory);
        created.inventory = inventory.map(i => i._id.toString());
        this.trackCreated('inventory', inventory.map(i => i._id.toString()));
      }
      
      if (seed.orders?.length) {
        const orders = await Order.insertMany(seed.orders);
        created.orders = orders.map(o => o._id.toString());
        this.trackCreated('orders', orders.map(o => o._id.toString()));
      }
      
      if (seed.payments?.length) {
        const payments = await Payment.insertMany(seed.payments);
        created.payments = payments.map(p => p._id.toString());
        this.trackCreated('payments', payments.map(p => p._id.toString()));
      }
      
      return created;
    } catch (error: any) {
      console.error('Error seeding test data:', error);
      // Cleanup on error
      await this.cleanupTrackedData();
      throw error;
    }
  }
  
  /**
   * Create a single test document
   */
  static async createTestDocument(
    model: string,
    data: Record<string, any>
  ): Promise<any> {
    let collection;
    
    switch (model) {
      case 'User':
        collection = User;
        break;
      case 'Product':
        collection = Product;
        break;
      case 'Category':
        collection = Category;
        break;
      case 'Order':
        collection = Order;
        break;
      case 'Payment':
        collection = Payment;
        break;
      case 'Inventory':
        collection = Inventory;
        break;
      default:
        throw new Error(`Unknown model: ${model}`);
    }
    
    const doc = new collection(data);
    await doc.save();
    
    this.trackCreated(model, [doc._id.toString()]);
    
    return doc;
  }
  
  /**
   * Get test document by ID
   */
  static async getTestDocument(model: string, id: string): Promise<any> {
    let collection;
    
    switch (model) {
      case 'User':
        collection = User;
        break;
      case 'Product':
        collection = Product;
        break;
      case 'Category':
        collection = Category;
        break;
      case 'Order':
        collection = Order;
        break;
      case 'Payment':
        collection = Payment;
        break;
      case 'Inventory':
        collection = Inventory;
        break;
      default:
        throw new Error(`Unknown model: ${model}`);
    }
    
    return await collection.findById(id);
  }
  
  /**
   * Update test document
   */
  static async updateTestDocument(
    model: string,
    id: string,
    data: Record<string, any>
  ): Promise<any> {
    let collection;
    
    switch (model) {
      case 'User':
        collection = User;
        break;
      case 'Product':
        collection = Product;
        break;
      case 'Category':
        collection = Category;
        break;
      case 'Order':
        collection = Order;
        break;
      case 'Payment':
        collection = Payment;
        break;
      case 'Inventory':
        collection = Inventory;
        break;
      default:
        throw new Error(`Unknown model: ${model}`);
    }
    
    return await collection.findByIdAndUpdate(id, data, { new: true });
  }
  
  /**
   * Cleanup specific test data
   */
  static async cleanupTestData(model: string, id: string): Promise<void> {
    let collection;
    
    switch (model) {
      case 'User':
        collection = User;
        break;
      case 'Product':
        collection = Product;
        break;
      case 'Category':
        collection = Category;
        break;
      case 'Order':
        collection = Order;
        break;
      case 'Payment':
        collection = Payment;
        break;
      case 'Inventory':
        collection = Inventory;
        break;
      default:
        throw new Error(`Unknown model: ${model}`);
    }
    
    await collection.findByIdAndDelete(id);
    this.untrackCreated(model, id);
  }
  
  /**
   * Clear all test data
   */
  static async clearAllTestData(): Promise<void> {
    await this.cleanupTrackedData();
  }
  
  /**
   * Get test data snapshot
   */
  static async getTestDataSnapshot(model: string, id: string): Promise<Record<string, any>> {
    const doc = await this.getTestDocument(model, id);
    return doc ? doc.toObject() : {};
  }
  
  /**
   * Compare test data before/after
   */
  static compareSnapshots(before: Record<string, any>, after: Record<string, any>) {
    const changes: Record<string, any> = {};
    
    // Check for changes
    for (const key in before) {
      if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
        changes[key] = {
          before: before[key],
          after: after[key],
        };
      }
    }
    
    // Check for new fields
    for (const key in after) {
      if (!(key in before)) {
        changes[key] = {
          before: undefined,
          after: after[key],
        };
      }
    }
    
    return changes;
  }
  
  /**
   * Track created IDs for cleanup
   */
  private static trackCreated(model: string, ids: string[]): void {
    if (!this.createdIds.has(model)) {
      this.createdIds.set(model, []);
    }
    this.createdIds.get(model)!.push(...ids);
  }
  
  /**
   * Untrack created ID
   */
  private static untrackCreated(model: string, id: string): void {
    const ids = this.createdIds.get(model);
    if (ids) {
      const index = ids.indexOf(id);
      if (index > -1) {
        ids.splice(index, 1);
      }
    }
  }
  
  /**
   * Cleanup all tracked data
   */
  private static async cleanupTrackedData(): Promise<void> {
    for (const [model, ids] of this.createdIds.entries()) {
      for (const id of ids) {
        try {
          await this.cleanupTestData(model, id);
        } catch (error: any) {
          console.warn(`Failed to cleanup ${model} ${id}:`, error.message);
        }
      }
    }
    
    this.createdIds.clear();
  }
  
  /**
   * Reset to baseline state (keep seed data, remove test data)
   */
  static async resetToBaseline(): Promise<void> {
    // Clear all non-seed data
    await this.clearAllTestData();
    
    // Reinitialize seed data
    await this.initializeTestData();
  }
  
  /**
   * Get current state summary
   */
  static async getStateSummary(): Promise<Record<string, any>> {
    return {
      users: await User.countDocuments(),
      products: await Product.countDocuments(),
      categories: await Category.countDocuments(),
      orders: await Order.countDocuments(),
      payments: await Payment.countDocuments(),
      inventory: await Inventory.countDocuments(),
      trackedCreatedData: Object.fromEntries(
        Array.from(this.createdIds.entries()).map(([model, ids]) => [
          model,
          ids.length,
        ])
      ),
    };
  }
}

export default TestDataManager;
