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
    const authenticated = await verifyAdminAuth();
    if (!authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;

    // Support for pre-generating the next ID
    if (searchParams.get('nextId') === 'true') {
      const nextId = await BillerService.generateBillId();
      return NextResponse.json({ success: true, nextId });
    }

    const lookupCustomerId = searchParams.get('lookupCustomerId');
    if (lookupCustomerId) {
      const details = await BillerService.findCustomerByCustomId(lookupCustomerId);
      return NextResponse.json({ success: true, details });
    }

    const customerSearchName = searchParams.get('customerSearchName');
    if (customerSearchName) {
      const results = await BillerService.searchCustomers(customerSearchName);
      return NextResponse.json({ success: true, suggestions: results });
    }

    const nextInitial = searchParams.get('nextCustomerId');
    if (nextInitial) {
      const nextId = await BillerService.generateNextCustomerId(nextInitial);
      return NextResponse.json({ success: true, nextId });
    }
    const billType = searchParams.get('billType') as 'COD' | 'PAID' | null;
    const status = searchParams.get('status') as 'active' | 'cancelled' | 'completed' | null;
    const search = searchParams.get('search') || '';
    const skip = parseInt(searchParams.get('skip') || '0');
    const limit = parseInt(searchParams.get('limit') || '50');
    const sortBy = (searchParams.get('sortBy') || 'createdAt') as 'createdAt' | 'billType' | 'amountToCollect';

    // Fetch bills
    const { bills, total } = await BillerService.listBillers({
      billType: billType || undefined,
      status: status || undefined,
      search: search || undefined,
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
    const authenticated = await verifyAdminAuth();
    if (!authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      orderId, 
      paymentId, 
      notes, 
      items, 
      paymentStatus, 
      rate, 
      advancePaid, 
      balanceAmount,
      customerName,
      customerPhone,
      customerPhones,
      customerCustomId,
      trialDate,
      deliveryDate
    } = body;

    // Create bill
    const bill = await BillerService.createBiller({
      orderId: orderId || 'manual',
      paymentId: paymentId || 'manual',
      createdBy: 'admin',
      createdById: undefined,
      notes,
      items,
      paymentStatus,
      rate,
      advancePaid,
      balanceAmount,
      customerName,
      customerPhone,
      customerPhones,
      customerCustomId,
      trialDate,
      deliveryDate
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
