import { NextRequest, NextResponse } from 'next/server';
import inventoryService from '@/lib/services/inventoryService';
import { StockAdjustmentSchema } from '@/lib/validations/inventoryValidation';
import { handleError } from '@/lib/utils/errors';

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/inventory/:id/adjust
 * Manually adjust stock (add or remove)
 * 
 * Used for:
 * • Returns/refunds
 * • Damage/shrinkage writeoffs
 * • Physical count reconciliation
 * • Corrections
 * 
 * Body:
 *   {
 *     qty: number (positive to add, negative to remove),
 *     reason: string (required for audit),
 *     actor: string (user ID performing adjustment)
 *   }
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json();

    // Validate request
    const validated = StockAdjustmentSchema.parse({
      ...body,
      inventoryId: id
    });

    const inventory = await inventoryService.adjustStock(
      validated.inventoryId,
      validated.qty,
      validated.reason,
      validated.actor
    );

    return NextResponse.json({
      success: true,
      data: {
        _id: inventory._id,
        variantSku: inventory.variantSku,
        stockOnHand: inventory.stockOnHand,
        reserved: inventory.reserved,
        available: inventory.getAvailable(),
        adjustment: {
          qty: validated.qty,
          reason: validated.reason,
          actor: validated.actor,
          timestamp: new Date()
        },
        updatedAt: inventory.updatedAt
      }
    });
  } catch (error) {
    return handleError(error);
  }
}
