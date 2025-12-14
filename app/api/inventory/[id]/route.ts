import { NextRequest, NextResponse } from 'next/server';
import inventoryService from '@/lib/services/inventoryService';
import { InventoryUpdateSchema } from '@/lib/validations/inventoryValidation';
import { handleError } from '@/lib/utils/errors';

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/inventory/:id
 * Fetch inventory by ID
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const inventory = await inventoryService.getInventoryById(id);

    return NextResponse.json({
      success: true,
      data: {
        _id: inventory._id,
        productId: inventory.productId,
        variantSku: inventory.variantSku,
        stockOnHand: inventory.stockOnHand,
        reserved: inventory.reserved,
        available: inventory.getAvailable(),
        batches: inventory.batches.map((b) => ({
          batchId: b.batchId,
          qty: b.qty,
          receivedAt: b.receivedAt,
          expiry: b.expiry,
          location: b.location,
          supplier: b.supplier
        })),
        lowStockThreshold: inventory.lowStockThreshold,
        isLowStock: inventory.checkLowStock(),
        locationId: inventory.locationId,
        auditCount: inventory.audit.length,
        createdAt: inventory.createdAt,
        updatedAt: inventory.updatedAt
      }
    });
  } catch (error) {
    return handleError(error);
  }
}

/**
 * PATCH /api/inventory/:id
 * Update inventory settings
 * 
 * Body:
 *   {
 *     lowStockThreshold?: number,
 *     locationId?: string
 *   }
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json();
    const validated = InventoryUpdateSchema.parse(body);

    let inventory = await inventoryService.getInventoryById(id);

    if (validated.lowStockThreshold !== undefined) {
      inventory = await inventoryService.updateLowStockThreshold(id, validated.lowStockThreshold);
    }

    return NextResponse.json({
      success: true,
      data: {
        _id: inventory._id,
        variantSku: inventory.variantSku,
        stockOnHand: inventory.stockOnHand,
        reserved: inventory.reserved,
        available: inventory.getAvailable(),
        lowStockThreshold: inventory.lowStockThreshold,
        isLowStock: inventory.checkLowStock(),
        updatedAt: inventory.updatedAt
      }
    });
  } catch (error) {
    return handleError(error);
  }
}
