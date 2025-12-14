import { NextRequest, NextResponse } from 'next/server';
import inventoryService from '@/lib/services/inventoryService';
import { LowStockReportSchema } from '@/lib/validations/inventoryValidation';
import { handleError } from '@/lib/utils/errors';

/**
 * GET /api/inventory/low-stock
 * Get low-stock alert report
 * 
 * Returns all inventories where:
 *   available <= lowStockThreshold
 * 
 * Sorted by critical (available = 0) first
 * 
 * Query params:
 *   - skip: Pagination offset
 *   - limit: Results per page
 *   - locationId: Warehouse filter
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const skip = parseInt(searchParams.get('skip') || '0');
    const limit = parseInt(searchParams.get('limit') || '50');
    const locationId = searchParams.get('locationId') || undefined;

    const validated = LowStockReportSchema.parse({ skip, limit, locationId });

    const report = await inventoryService.getLowStockReport(
      validated.skip,
      validated.limit,
      validated.locationId
    );

    return NextResponse.json({
      success: true,
      data: {
        total: report.total,
        critical: report.items.filter((i) => i.status === 'critical').length,
        low: report.items.filter((i) => i.status === 'low').length,
        items: report.items,
        pagination: {
          skip: validated.skip,
          limit: validated.limit,
          hasMore: validated.skip + validated.limit < report.total
        }
      }
    });
  } catch (error) {
    return handleError(error);
  }
}
