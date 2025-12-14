import { NextRequest, NextResponse } from 'next/server';
import inventoryService from '@/lib/services/inventoryService';
import { ReleaseReservationSchema } from '@/lib/validations/inventoryValidation';
import { handleError } from '@/lib/utils/errors';

/**
 * POST /api/inventory/release
 * Release reserved stock
 * 
 * Called when:
 * • Order is cancelled
 * • Payment timeout (reservation expires)
 * • Customer abandons checkout
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
    const validated = ReleaseReservationSchema.parse(body);

    const inventory = await inventoryService.releaseReservedStock(
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
        release: {
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
