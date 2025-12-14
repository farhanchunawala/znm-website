import { NextRequest, NextResponse } from 'next/server';
import inventoryService from '@/lib/services/inventoryService';
import { ReservationRequestSchema } from '@/lib/validations/inventoryValidation';
import { handleError } from '@/lib/utils/errors';

/**
 * POST /api/inventory/reserve
 * ATOMIC: Reserve stock for an order
 * 
 * This prevents overselling by checking available stock atomically.
 * Called when:
 * • Order is created
 * • Customer starts checkout
 * 
 * Body:
 *   {
 *     variantSku: string,
 *     qty: number,
 *     orderId: string,
 *     actor?: string (defaults to "system")
 *   }
 * 
 * Response on success:
 *   {
 *     success: true,
 *     data: {
 *       inventoryId: string,
 *       available: number,
 *       reserved: number,
 *       timestamp: ISO timestamp
 *     }
 *   }
 * 
 * Response on insufficient stock:
 *   {
 *     success: false,
 *     error: {
 *       code: "INSUFFICIENT_STOCK",
 *       message: "...",
 *       details: { available: number, requested: number }
 *     }
 *   }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = ReservationRequestSchema.parse(body);

    const inventory = await inventoryService.reserveStock(
      validated.variantSku,
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
        reservation: {
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
