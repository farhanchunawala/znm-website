import { NextRequest, NextResponse } from 'next/server';
import inventoryService from '@/lib/services/inventoryService';
import { CommitReservationSchema } from '@/lib/validations/inventoryValidation';
import { handleError } from '@/lib/utils/errors';

/**
 * POST /api/inventory/commit
 * Commit reserved stock (payment success)
 * 
 * When payment succeeds:
 * 1. Reserved stock is finalized
 * 2. Both reserved and stockOnHand are decremented
 * 
 * Formula:
 *   Before: stockOnHand = 100, reserved = 10
 *   Commit 10:
 *   After:  stockOnHand = 90, reserved = 0
 * 
 * Body:
 *   {
 *     inventoryId: string,
 *     qty: number,
 *     orderId: string,
 *     actor?: string
 *   }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = CommitReservationSchema.parse(body);

    const inventory = await inventoryService.commitReservedStock(
      validated.inventoryId,
      validated.qty,
      validated.orderId,
      validated.actor
    );

    return NextResponse.json({
      success: true,
      data: {
        inventoryId: inventory._id.toString(),
        variantSku: inventory.variantSku,
        stockOnHand: inventory.stockOnHand,
        reserved: inventory.reserved,
        available: inventory.getAvailable(),
        commitment: {
          qty: validated.qty,
          orderId: validated.orderId,
          timestamp: new Date()
        }
      }
    });
  } catch (error) {
    return handleError(error);
  }
}
