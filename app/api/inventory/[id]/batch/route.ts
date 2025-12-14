import { NextRequest, NextResponse } from 'next/server';
import inventoryService from '@/lib/services/inventoryService';
import { AddBatchSchema } from '@/lib/validations/inventoryValidation';
import { handleError } from '@/lib/utils/errors';

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/inventory/:id/batch
 * Add batch/lot to inventory
 * 
 * Called when:
 * • Goods received from supplier
 * • New stock batch arrives
 * 
 * Body:
 *   {
 *     batch: {
 *       batchId: string,
 *       qty: number,
 *       receivedAt: ISO timestamp,
 *       expiry?: ISO timestamp,
 *       location?: string,
 *       supplier?: string
 *     },
 *     actor?: string
 *   }
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json();

    const validated = AddBatchSchema.parse({
      ...body,
      inventoryId: id
    });

    const inventory = await inventoryService.addBatch(
      validated.inventoryId,
      validated.batch,
      validated.actor
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          _id: inventory._id.toString(),
          variantSku: inventory.variantSku,
          stockOnHand: inventory.stockOnHand,
          batchAdded: {
            batchId: validated.batch.batchId,
            qty: validated.batch.qty,
            receivedAt: validated.batch.receivedAt
          },
          totalBatches: inventory.batches.length,
          updatedAt: inventory.updatedAt
        }
      },
      { status: 201 }
    );
  } catch (error) {
    return handleError(error);
  }
}

/**
 * GET /api/inventory/:id/batch
 * Get batches for inventory
 * 
 * Query params:
 *   - expiring: bool (only show expiring soon)
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const expiring = searchParams.get('expiring') === 'true';

    const inventory = await inventoryService.getInventoryById(id);

    let batches = inventory.batches;
    if (expiring) {
      const thirtyDaysOut = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      batches = batches.filter((b) => b.expiry && b.expiry < thirtyDaysOut);
    }

    return NextResponse.json({
      success: true,
      data: {
        variantSku: inventory.variantSku,
        totalBatches: batches.length,
        batches: batches.map((b) => ({
          batchId: b.batchId,
          qty: b.qty,
          receivedAt: b.receivedAt,
          expiry: b.expiry,
          location: b.location,
          supplier: b.supplier
        }))
      }
    });
  } catch (error) {
    return handleError(error);
  }
}
