import { NextRequest, NextResponse } from 'next/server';
import { markPaymentSuccess } from '@/lib/services/orderService';
import { PaymentSuccessSchema } from '@/lib/validations/orderValidation';

/**
 * POST /api/orders/payment-success
 * Webhook endpoint for payment gateway
 * Called when payment is confirmed
 * 
 * This commits reserved stock and updates order status
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = PaymentSuccessSchema.parse(body);

    const order = await markPaymentSuccess(
      validatedData.orderId,
      validatedData.paymentGatewayRef,
      validatedData.amount
    );

    return NextResponse.json(
      {
        success: true,
        message: `Payment confirmed for order ${order.orderNumber}`,
        order,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error processing payment success:', error);

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
        error: error.error || error.message || 'Failed to process payment',
        code: error.code || 'INTERNAL_ERROR',
      },
      { status: error.statusCode || 500 }
    );
  }
}
