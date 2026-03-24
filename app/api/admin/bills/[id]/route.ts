import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { verifyAdminAuth } from '@/lib/admin-auth';
import BillerService from '@/lib/services/billerService';

/**
 * GET /api/admin/bills/:id
 * Get bill by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();

    // Verify admin authorization
    const authenticated = await verifyAdminAuth();
    if (!authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Fetch bill
    const bill = await BillerService.getBiller(id);
    if (!bill) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: bill });
  } catch (error: any) {
    console.error('Error fetching bill:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch bill' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/bills/:id
 * Update bill (edit) or perform actions (print, cancel, regenerate)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();

    // Verify admin authorization
    const authenticated = await verifyAdminAuth();
    if (!authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const { action, amountToCollect, amountPaid, notes, reason } = body;

    let result;

    if (action === 'print') {
      // Print bill (increment print count)
      result = await BillerService.printBill(id);
    } else if (action === 'cancel') {
      // Cancel bill
      if (!reason) {
        return NextResponse.json({ error: 'Reason is required for cancellation' }, { status: 400 });
      }
      result = await BillerService.cancelBiller(id, reason);
    } else if (action === 'regenerate') {
      // Regenerate bill (create new, archive old)
      result = await BillerService.regenerateBiller(id);
    } else {
      result = await BillerService.updateBiller(id, {
        amountToCollect,
        amountPaid,
        notes,
      });
    }

    return NextResponse.json({
      success: true,
      message: action ? `Bill ${action} successful` : 'Bill updated successfully',
      data: result,
    });
  } catch (error: any) {
    console.error('Error updating bill:', error);
    return NextResponse.json({ error: error.message || 'Failed to update bill' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/bills/:id
 * Delete (archive) bill
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();

    // Verify admin authorization
    const authenticated = await verifyAdminAuth();
    if (!authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Delete bill
    const success = await BillerService.deleteBiller(id);

    if (!success) {
      return NextResponse.json({ error: 'Failed to delete bill' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Bill deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting bill:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete bill' }, { status: 500 });
  }
}
