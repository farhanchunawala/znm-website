import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { verifyCustomerAuth } from '@/lib/auth';
import BillerService from '@/lib/services/billerService';
import { Order } from '@/models/OrderModel';

/**
 * GET /api/bills/order/:orderId
 * Customer view bill status for their order
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    await dbConnect();

    // Verify customer authorization
    const auth = await verifyCustomerAuth(request);
    if (!auth.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orderId } = params;

    // Verify order belongs to customer
    const order = await Order.findById(orderId);
    if (!order || order.customerId.toString() !== auth.userId) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Get bill for this order
    const bill = await BillerService.getBillForOrder(orderId);

    if (!bill) {
      return NextResponse.json(
        {
          success: true,
          message: 'No bill found for this order',
          data: null,
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        billId: bill._id,
        billType: bill.billType,
        amountToCollect: bill.amountToCollect,
        amountPaid: bill.amountPaid,
        status: bill.status,
        createdAt: bill.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Error fetching bill for order:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch bill' }, { status: 500 });
  }
}
