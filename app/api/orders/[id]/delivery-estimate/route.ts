import { NextRequest, NextResponse } from 'next/server';
import { verifyCustomerAuth } from '@/lib/auth';
import DeliveryReminderService from '@/lib/services/deliveryReminderService';

/**
 * GET /api/orders/[orderId]/delivery-estimate
 * Get estimated delivery date for an order
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyCustomerAuth(request);
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = params;

    const estimate = await DeliveryReminderService.calculateEstimatedDelivery(id);

    if (!estimate) {
      return NextResponse.json(
        { error: 'Unable to calculate delivery estimate' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: estimate,
    });
  } catch (error: any) {
    console.error('Error fetching delivery estimate:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch delivery estimate' },
      { status: 500 }
    );
  }
}
