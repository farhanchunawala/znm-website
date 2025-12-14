/**
 * UNPAID ORDER CLEANER
 * Background worker: Auto-cancels unpaid orders after X minutes
 * Releases reserved inventory stock
 * 
 * Usage (CLI):
 * node -r ts-node/register lib/workers/unpaidOrderCleaner.ts --minutes 1440
 * 
 * Or as cron job:
 * 0 */6 * * * node -r ts-node/register lib/workers/unpaidOrderCleaner.ts
 */

import { autoCancelUnpaidOrders, getOrderStatistics } from '@/lib/services/orderService';
import { connectDB } from '@/lib/mongodb';

async function cleanupUnpaidOrders() {
  try {
    await connectDB();

    // Parse command line arguments
    const args = process.argv.slice(2);
    const minutesThreshold = args.includes('--minutes')
      ? parseInt(args[args.indexOf('--minutes') + 1])
      : 1440; // Default: 24 hours

    console.log(`⏳ Starting unpaid order cleanup (threshold: ${minutesThreshold} minutes)...`);

    const cancelled = await autoCancelUnpaidOrders(minutesThreshold);

    console.log(`✅ Auto-cancelled ${cancelled} unpaid orders`);

    // Get statistics
    const stats = await getOrderStatistics();
    console.log('📊 Order Statistics:');
    console.log(`   Total orders: ${stats.totalOrders}`);
    console.log(`   Total revenue: ₹${stats.totalRevenue.toLocaleString()}`);
    console.log(`   Average order value: ₹${stats.averageOrderValue.toFixed(2)}`);
    console.log(`   Shipped: ${stats.ordersShipped}`);
    console.log(`   Pending: ${stats.pendingOrders}`);
    console.log(`   Cancelled: ${stats.cancelledOrders}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error in unpaid order cleanup:', error);
    process.exit(1);
  }
}

cleanupUnpaidOrders();
