import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { verifyAdminAuth } from '@/lib/admin-auth';
import BillerService from '@/lib/services/billerService';

/**
 * GET /api/admin/bills
 * List bills with filters (billType, status, pagination)
 */
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    // Verify admin authorization
    const auth = await verifyAdminAuth(request);
    if (!auth.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const billType = searchParams.get('billType') as 'COD' | 'PAID' | null;
    const status = searchParams.get('status') as 'active' | 'cancelled' | null;
    const skip = parseInt(searchParams.get('skip') || '0');
    const limit = parseInt(searchParams.get('limit') || '50');
    const sortBy = (searchParams.get('sortBy') || 'createdAt') as 'createdAt' | 'billType' | 'amountToCollect';

    // Fetch bills
    const { bills, total } = await BillerService.listBillers({
      billType: billType || undefined,
      status: status || undefined,
      skip,
      limit,
      sortBy,
    });

    return NextResponse.json({
      success: true,
      data: bills,
      pagination: {
        total,
        skip,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error listing bills:', error);
    return NextResponse.json({ error: error.message || 'Failed to list bills' }, { status: 500 });
  }
}

/**
 * POST /api/admin/bills
 * Create bill manually (admin override)
 */
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    // Verify admin authorization
    const auth = await verifyAdminAuth(request);
    if (!auth.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { orderId, paymentId, notes } = body;

    // Validate required fields
    if (!orderId || !paymentId) {
      return NextResponse.json(
        { error: 'orderId and paymentId are required' },
        { status: 400 }
      );
    }

    // Create bill
    const bill = await BillerService.createBiller({
      orderId,
      paymentId,
      createdBy: 'admin',
      createdById: auth.userId,
      notes,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Bill created successfully',
        data: bill,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating bill:', error);
    return NextResponse.json({ error: error.message || 'Failed to create bill' }, { status: 500 });
  }
}
