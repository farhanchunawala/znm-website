import { NextRequest, NextResponse } from 'next/server';
import inventoryService from '@/lib/services/inventoryService';
import { InventoryCreateSchema } from '@/lib/validations/inventoryValidation';
import { handleError } from '@/lib/utils/errors';

/**
 * GET /api/inventory
 * List inventories by product or location
 * 
 * Query params:
 *   - productId: Product ID filter
 *   - locationId: Warehouse filter
 *   - skip: Pagination offset
 *   - limit: Results per page
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId');
    const locationId = searchParams.get('locationId') || undefined;

    if (!productId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'productId query parameter is required'
          }
        },
        { status: 400 }
      );
    }

    const inventories = await inventoryService.getInventoriesByProduct(productId, locationId);

    return NextResponse.json({
      success: true,
      data: inventories.map((inv) => ({
        _id: inv._id,
        variantSku: inv.variantSku,
        stockOnHand: inv.stockOnHand,
        reserved: inv.reserved,
        available: inv.getAvailable(),
        batches: inv.batches,
        lowStockThreshold: inv.lowStockThreshold,
        isLowStock: inv.checkLowStock(),
        locationId: inv.locationId,
        createdAt: inv.createdAt,
        updatedAt: inv.updatedAt
      }))
    });
  } catch (error) {
    return handleError(error);
  }
}

/**
 * POST /api/inventory
 * Create new inventory record
 * 
 * Body:
 *   {
 *     productId: string,
 *     variantSku: string,
 *     stockOnHand?: number,
 *     lowStockThreshold?: number,
 *     locationId?: string
 *   }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = InventoryCreateSchema.parse(body);

    const inventory = await inventoryService.createInventory(
      validated.productId,
      validated.variantSku,
      validated.stockOnHand || 0,
      validated.lowStockThreshold || 10
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          _id: inventory._id,
          variantSku: inventory.variantSku,
          stockOnHand: inventory.stockOnHand,
          reserved: inventory.reserved,
          available: inventory.getAvailable(),
          lowStockThreshold: inventory.lowStockThreshold
        }
      },
      { status: 201 }
    );
  } catch (error) {
    return handleError(error);
  }
}
