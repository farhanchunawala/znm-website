import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import ProductModel from '@/models/ProductModel';
import InventoryModel from '@/models/InventoryModel';
import inventoryService from '@/lib/services/inventoryService';

/**
 * SEED SCRIPT: Inventory Test Data
 * 
 * Creates test inventory records with various stock levels and batches
 * for development and testing.
 * 
 * Run with:
 *   node -r ts-node/register scripts/seedInventory.ts
 */

async function seedInventory() {
  try {
    await dbConnect();

    console.log('\n🌱 Seeding inventory data...\n');

    // Clear existing inventories
    await InventoryModel.deleteMany({});
    console.log('✅ Cleared existing inventory');

    // Get or create products
    // For now we'll create with dummy product IDs
    // In production, you'd fetch real product IDs

    const fixtures = [
      {
        name: 'Kurta - XL - Blue',
        sku: 'KRT-XL-BLU',
        productId: new mongoose.Types.ObjectId(),
        stockOnHand: 150,
        lowStockThreshold: 20,
        batches: [
          {
            batchId: 'LOT-2025-001',
            qty: 50,
            receivedAt: new Date('2025-10-15'),
            supplier: 'Supplier A',
            location: 'Shelf-A1'
          },
          {
            batchId: 'LOT-2025-002',
            qty: 100,
            receivedAt: new Date('2025-11-01'),
            supplier: 'Supplier B',
            location: 'Shelf-A2'
          }
        ]
      },
      {
        name: 'Kurta - M - Red',
        sku: 'KRT-M-RED',
        productId: new mongoose.Types.ObjectId(),
        stockOnHand: 8, // LOW STOCK
        lowStockThreshold: 20,
        batches: [
          {
            batchId: 'LOT-2025-003',
            qty: 8,
            receivedAt: new Date('2025-11-08'),
            supplier: 'Supplier C',
            location: 'Shelf-B1'
          }
        ]
      },
      {
        name: 'Shirt - L - White',
        sku: 'SHR-L-WHT',
        productId: new mongoose.Types.ObjectId(),
        stockOnHand: 0, // OUT OF STOCK
        lowStockThreshold: 15,
        batches: []
      },
      {
        name: 'Suit - 40 - Black',
        sku: 'SUI-40-BLK',
        productId: new mongoose.Types.ObjectId(),
        stockOnHand: 25,
        lowStockThreshold: 10,
        batches: [
          {
            batchId: 'LOT-2025-005',
            qty: 25,
            receivedAt: new Date('2025-11-01'),
            supplier: 'Supplier D',
            location: 'Shelf-C1',
            expiry: new Date('2026-11-01') // 1 year shelf life
          }
        ]
      },
      {
        name: 'Sherwani - XL - Gold',
        sku: 'SHW-XL-GLD',
        productId: new mongoose.Types.ObjectId(),
        stockOnHand: 1200, // HIGH STOCK
        lowStockThreshold: 50,
        batches: [
          {
            batchId: 'LOT-2025-006',
            qty: 400,
            receivedAt: new Date('2025-09-01'),
            supplier: 'Supplier A'
          },
          {
            batchId: 'LOT-2025-007',
            qty: 400,
            receivedAt: new Date('2025-10-15'),
            supplier: 'Supplier B'
          },
          {
            batchId: 'LOT-2025-008',
            qty: 400,
            receivedAt: new Date('2025-11-01'),
            supplier: 'Supplier C'
          }
        ]
      },
      {
        name: 'Waistcoat - M - Maroon',
        sku: 'WSC-M-MAR',
        productId: new mongoose.Types.ObjectId(),
        stockOnHand: 42,
        lowStockThreshold: 10,
        batches: [
          {
            batchId: 'LOT-2025-009',
            qty: 42,
            receivedAt: new Date('2025-11-05'),
            supplier: 'Supplier E',
            location: 'Shelf-D1'
          }
        ]
      },
      {
        name: 'Trouser - 32 - Navy',
        sku: 'TRS-32-NAV',
        productId: new mongoose.Types.ObjectId(),
        stockOnHand: 3, // CRITICAL
        lowStockThreshold: 10,
        batches: [
          {
            batchId: 'LOT-2025-010',
            qty: 3,
            receivedAt: new Date('2025-11-10'),
            supplier: 'Supplier F'
          }
        ]
      }
    ];

    let createdCount = 0;

    for (const fixture of fixtures) {
      try {
        const inventory = await inventoryService.createInventory(
          fixture.productId,
          fixture.sku,
          fixture.stockOnHand,
          fixture.lowStockThreshold
        );

        // Add batches
        for (const batch of fixture.batches) {
          await inventoryService.addBatch(inventory._id, batch, 'seed-script');
        }

        console.log(`✅ Created: ${fixture.name}`);
        console.log(`   SKU: ${fixture.sku}, Stock: ${fixture.stockOnHand}, Batches: ${fixture.batches.length}`);

        createdCount++;
      } catch (error) {
        console.error(`❌ Failed to create ${fixture.name}:`, error);
      }
    }

    console.log(`\n📊 Seeding complete: ${createdCount}/${fixtures.length} items created`);

    // Create some test scenarios
    console.log('\n🧪 Creating test scenarios...\n');

    // Scenario 1: Item with reservations
    const scenario1 = await inventoryService.createInventory(
      new mongoose.Types.ObjectId(),
      'TEST-RESERVED',
      100,
      10
    );

    await inventoryService.reserveStock('TEST-RESERVED', 30, 'order-12345');
    await inventoryService.reserveStock('TEST-RESERVED', 20, 'order-12346');

    console.log(`✅ Scenario 1: Item with reservations (30 + 20 of 100)`);

    // Scenario 2: Item with reserve + commit history
    const scenario2 = await inventoryService.createInventory(
      new mongoose.Types.ObjectId(),
      'TEST-PROCESSED',
      200,
      15
    );

    await inventoryService.reserveStock('TEST-PROCESSED', 50, 'order-99999');
    await inventoryService.commitReservedStock(scenario2._id, 50, 'order-99999');

    console.log(`✅ Scenario 2: Item with completed order (50 committed)`);

    // Scenario 3: Item with adjustments
    const scenario3 = await inventoryService.createInventory(
      new mongoose.Types.ObjectId(),
      'TEST-ADJUSTED',
      100,
      10
    );

    await inventoryService.adjustStock(scenario3._id, 25, 'Recount correction', 'seed-script');
    await inventoryService.adjustStock(scenario3._id, -10, 'Damage writeoff', 'seed-script');

    console.log(`✅ Scenario 3: Item with manual adjustments`);

    console.log('\n🎉 All test data seeded successfully!\n');

    // Summary stats
    const allInventories = await InventoryModel.find({});
    const totalStock = allInventories.reduce((sum, inv) => sum + inv.stockOnHand, 0);
    const totalReserved = allInventories.reduce((sum, inv) => sum + inv.reserved, 0);
    const lowStockCount = allInventories.filter((inv) => inv.getAvailable() <= inv.lowStockThreshold).length;

    console.log('📈 Inventory Summary:');
    console.log(`  • Total Items: ${allInventories.length}`);
    console.log(`  • Total Stock: ${totalStock}`);
    console.log(`  • Total Reserved: ${totalReserved}`);
    console.log(`  • Low Stock Items: ${lowStockCount}`);
    console.log(`  • Out of Stock: ${allInventories.filter((inv) => inv.getAvailable() === 0).length}`);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  }
}

seedInventory();
