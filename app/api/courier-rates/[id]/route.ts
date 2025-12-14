import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/admin-auth';
import courierRateService from '@/lib/services/courierRateService';

/**
 * GET /api/courier-rates/[id]
 * Get specific courier rate
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await verifyAdminAuth(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rate = await courierRateService.getRate(params.id);
    if (!rate) {
      return NextResponse.json({ error: 'Courier rate not found' }, { status: 404 });
    }

    return NextResponse.json(
      {
        message: 'Courier rate retrieved successfully',
        rate,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error getting courier rate:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

/**
 * PATCH /api/courier-rates/[id]
 * Update courier rate
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await verifyAdminAuth(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { zones, weightSlabs, codExtraCharge, prepaidDiscount, minOrderValue, status } = body;

    const rate = await courierRateService.updateRate(params.id, {
      zones,
      weightSlabs,
      codExtraCharge,
      prepaidDiscount,
      minOrderValue,
      status,
      updatedBy: admin._id.toString(),
    });

    return NextResponse.json(
      {
        message: 'Courier rate updated successfully',
        rate,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating courier rate:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

/**
 * DELETE /api/courier-rates/[id]
 * Delete courier rate
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await verifyAdminAuth(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await courierRateService.deleteRate(params.id);

    return NextResponse.json(
      {
        message: 'Courier rate deleted successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting courier rate:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
