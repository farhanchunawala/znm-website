import { NextRequest, NextResponse } from 'next/server';
import { cancelOrder } from '@/lib/services/orderService';
import { CancelOrderSchema } from '@/lib/validations/orderValidation';

/**
 * POST /api/orders/:id/cancel
 * Dedicated endpoint for order cancellation
 * Releases reserved stock back to inventory
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const validatedData = CancelOrderSchema.parse(body);

    const order = await cancelOrder(params.id, validatedData);

    return NextResponse.json(
      {
        success: true,
        message: `Order ${order.orderNumber} cancelled successfully`,
        order,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error cancelling order:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        {
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: error.error || error.message || 'Failed to cancel order',
        code: error.code || 'INTERNAL_ERROR',
      },
      { status: error.statusCode || 500 }
    );
  }
}
