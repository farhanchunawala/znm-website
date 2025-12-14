import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import BillerService from '@/lib/services/billerService';

/**
 * POST /api/bills/auto-generate
 * System endpoint for auto-generating bills
 * Called internally after order confirmation or payment success
 * 
 * Security: Internal system calls only (no public access)
 */
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const body = await request.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
    }

    // Auto-generate bill
    const bill = await BillerService.autoGenerateBill(orderId);

    if (!bill) {
      return NextResponse.json(
        {
          success: false,
          message: 'Bill already exists or order not in billable state',
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Bill auto-generated successfully',
        data: bill,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error auto-generating bill:', error);
    return NextResponse.json({ error: error.message || 'Failed to auto-generate bill' }, { status: 500 });
  }
}
