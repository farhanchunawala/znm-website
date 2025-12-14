import dbConnect from '@/lib/mongodb';
import InventoryModel from '@/models/InventoryModel';
import inventoryService from '@/lib/services/inventoryService';

/**
 * BACKGROUND JOB: Release Stuck Reservations
 * 
 * Monitors and releases reservations that have expired.
 * Useful for carts abandoned for 30+ minutes or payment timeouts.
 * 
 * Runs as:
 *   node -r ts-node/register lib/workers/stuckReservationCleaner.ts
 * 
 * Or as part of a cron job scheduler (e.g., every 15 minutes)
 */

const RESERVATION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const CLEANUP_INTERVAL_MS = 15 * 60 * 1000; // Check every 15 minutes

interface CleanupStats {
  checked: number;
  released: number;
  failedReleases: number;
  timestamp: Date;
}

class StuckReservationCleaner {
  private intervalId: NodeJS.Timeout | null = null;
  private stats: CleanupStats = {
    checked: 0,
    released: 0,
    failedReleases: 0,
    timestamp: new Date()
  };

  /**
   * Start monitoring for stuck reservations
   */
  async start(intervalMs: number = CLEANUP_INTERVAL_MS): Promise<void> {
    console.log('🔄 Starting stuck reservation cleaner...');

    // Run immediately on startup
    await this.cleanup();

    // Then run periodically
    this.intervalId = setInterval(async () => {
      try {
        await this.cleanup();
      } catch (error) {
        console.error('❌ Cleanup error:', error);
      }
    }, intervalMs);

    console.log(`✅ Cleaner started. Checking every ${intervalMs / 60000} minutes`);
  }

  /**
   * Stop the background job
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('🛑 Cleaner stopped');
    }
  }

  /**
   * Run cleanup once
   */
  private async cleanup(): Promise<void> {
    console.log(`\n⏰ [${new Date().toLocaleTimeString()}] Running cleanup...`);

    await dbConnect();

    try {
      const cutoffTime = new Date(Date.now() - RESERVATION_TIMEOUT_MS);
      this.stats.timestamp = new Date();
      this.stats.checked = 0;
      this.stats.released = 0;
      this.stats.failedReleases = 0;

      // Find all inventories with active reservations
      const inventoriesWithReserved = await InventoryModel.find({
        reserved: { $gt: 0 }
      }).select('_id variantSku stockOnHand reserved audit').exec();

      console.log(`📦 Found ${inventoriesWithReserved.length} inventories with reservations`);

      for (const inventory of inventoriesWithReserved) {
        this.stats.checked++;

        // Check audit trail for stuck reservations older than timeout
        const lastReservation = inventory.audit
          .filter((a) => a.action === 'reserve')
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];

        if (!lastReservation) {
          continue; // No reservations in audit
        }

        if (lastReservation.timestamp > cutoffTime) {
          continue; // Reservation is still recent
        }

        // This is a stuck reservation - need to check if there's a corresponding commit
        const orderId = lastReservation.metadata?.orderId;
        if (!orderId) {
          continue;
        }

        // Check if order was committed (payment success)
        const committed = inventory.audit.find(
          (a) => a.action === 'commit' && a.metadata?.orderId === orderId
        );

        if (committed) {
          continue; // Order was processed normally
        }

        // Check if it was released already
        const released = inventory.audit.find(
          (a) => a.action === 'release' && a.metadata?.orderId === orderId
        );

        if (released) {
          continue; // Already released
        }

        // This is a stuck reservation - release it
        try {
          console.log(
            `  🔓 Releasing stuck reservation for ${inventory.variantSku} (${lastReservation.qty} units, order: ${orderId})`
          );

          await inventoryService.releaseReservedStock(
            inventory._id,
            lastReservation.qty,
            orderId,
            'stuck-reservation-cleaner'
          );

          this.stats.released++;
          console.log(`    ✅ Released successfully`);
        } catch (error) {
          this.stats.failedReleases++;
          console.error(
            `    ❌ Failed to release:`,
            error instanceof Error ? error.message : error
          );
        }
      }

      this.logStats();
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
    }
  }

  /**
   * Get current statistics
   */
  getStats(): CleanupStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      checked: 0,
      released: 0,
      failedReleases: 0,
      timestamp: new Date()
    };
  }

  /**
   * Log cleanup statistics
   */
  private logStats(): void {
    console.log(`\n📊 Cleanup Report (${this.stats.timestamp.toLocaleTimeString()})`);
    console.log(`  • Inventories checked: ${this.stats.checked}`);
    console.log(`  • Stuck reservations released: ${this.stats.released}`);
    console.log(`  • Failed releases: ${this.stats.failedReleases}`);
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let instance: StuckReservationCleaner | null = null;

export function getStuckReservationCleaner(): StuckReservationCleaner {
  if (!instance) {
    instance = new StuckReservationCleaner();
  }
  return instance;
}

// ============================================================================
// CLI SUPPORT
// ============================================================================

if (require.main === module) {
  const cleaner = new StuckReservationCleaner();

  const command = process.argv[2];

  if (command === 'run-once') {
    // Run cleanup once and exit
    cleaner['cleanup']().then(() => {
      console.log('\n✅ Done. Exiting...');
      process.exit(0);
    });
  } else if (command === 'stats') {
    // Show current stats and exit
    cleaner.start(60000).then(() => {
      setTimeout(() => {
        const stats = cleaner.getStats();
        console.log('\n📊 Current Stats:', stats);
        cleaner.stop();
        process.exit(0);
      }, 2000);
    });
  } else {
    // Run continuous background job
    cleaner.start();

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n\n🛑 Shutdown signal received');
      cleaner.stop();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log('\n\n🛑 Termination signal received');
      cleaner.stop();
      process.exit(0);
    });
  }
}

export default StuckReservationCleaner;
