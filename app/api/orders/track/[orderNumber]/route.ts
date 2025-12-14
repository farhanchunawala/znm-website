import { NextRequest, NextResponse } from 'next/server';
import { getOrderByOrderNumber } from '@/lib/services/orderService';

/**
 * GET /api/orders/track/:orderNumber
 * Public endpoint for customer order tracking
 * Returns order with timeline (no auth required)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { orderNumber: string } }
) {
  try {
    const order = await getOrderByOrderNumber(params.orderNumber);

    if (!order) {
      return NextResponse.json(
        {
          error: 'Order not found',
          code: 'ORDER_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Return order with public timeline (hide sensitive info like payment ref)
    const publicOrder = {
      orderNumber: order.orderNumber,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      items: order.items,
      totals: order.totals,
      address: order.address,
      trackingNumber: order.trackingNumber,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      // Include timeline but filter sensitive events
      timeline: order.timeline
        .filter((event) => !['payment.success', 'payment.failed'].includes(event.action))
        .map((event) => ({
          action: event.action,
          timestamp: event.timestamp,
          note: event.note,
        })),
    };

    // Add caching header for 15-30 seconds to reduce database load
    const headers = new Headers();
    headers.set('Cache-Control', 'public, max-age=30, s-maxage=30');

    return NextResponse.json(publicOrder, { status: 200, headers });
  } catch (error: any) {
    console.error('Error fetching order tracking:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to fetch order tracking',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
