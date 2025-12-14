import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/admin-auth';
import CourierService from '@/lib/services/courierService';

/**
 * PATCH /api/admin/courier-rates/[id]
 * Update a courier rate
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = params;
    const body = await request.json();

    const rate = await CourierService.updateRate(
      id,
      body,
      user._id?.toString()
    );

    if (!rate) {
      return NextResponse.json(
        { error: 'Courier rate not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: rate,
      message: 'Courier rate updated',
    });
  } catch (error) {
    console.error('Error updating courier rate:', error);
    return NextResponse.json(
      { error: 'Failed to update courier rate' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/courier-rates/[id]
 * Delete (soft delete) a courier rate
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = params;

    const deleted = await CourierService.deleteRate(id);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Courier rate not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Courier rate deleted',
    });
  } catch (error) {
    console.error('Error deleting courier rate:', error);
    return NextResponse.json(
      { error: 'Failed to delete courier rate' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/courier-rates/[id]
 * Get a specific courier rate
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = params;

    const rate = await CourierService.getRate(id);

    if (!rate) {
      return NextResponse.json(
        { error: 'Courier rate not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: rate,
    });
  } catch (error) {
    console.error('Error fetching courier rate:', error);
    return NextResponse.json(
      { error: 'Failed to fetch courier rate' },
      { status: 500 }
    );
  }
}
