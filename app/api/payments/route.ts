import { NextRequest, NextResponse } from 'next/server';
import PaymentService, { PaymentError } from '@/lib/services/paymentService';
import {
  InitiatePaymentSchema,
  ConfirmPaymentSchema,
  FailPaymentSchema,
} from '@/lib/validations/paymentValidation';
import { connectDB } from '@/lib/mongodb';

/**
 * POST /api/payments/initiate
 * Customer initiates a payment for an order
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();

    // Validate request
    const validated = InitiatePaymentSchema.parse(body);

    // Get customer ID from auth context
    const customerId = body.customerId; // In production, extract from JWT token

    const payment = await PaymentService.initiatePayment({
      ...validated,
      customerId,
      meta: {
        ...validated.meta,
        ipAddress: request.ip,
        userAgent: request.headers.get('user-agent') || undefined,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: payment,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Initiate payment error:', error);

    if (error instanceof PaymentError) {
      return NextResponse.json(
        {
          success: false,
          code: error.code,
          message: error.message,
          details: error.details,
        },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      {
        success: false,
        code: 'INTERNAL_ERROR',
        message: 'Failed to initiate payment',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/payments?orderId=xxx&status=xxx
 * Get payment details for a customer
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    const status = searchParams.get('status');

    if (!orderId) {
      return NextResponse.json(
        {
          success: false,
          code: 'INVALID_REQUEST',
          message: 'orderId is required',
        },
        { status: 400 }
      );
    }

    const payment = await PaymentService.getPaymentByOrderId(orderId);

    if (!payment) {
      return NextResponse.json(
        {
          success: false,
          code: 'PAYMENT_NOT_FOUND',
          message: 'No payment found for this order',
        },
        { status: 404 }
      );
    }

    if (status && payment.status !== status) {
      return NextResponse.json(
        {
          success: false,
          code: 'INVALID_STATUS',
          message: `Payment status is ${payment.status}, not ${status}`,
        },
        { status: 400 }
      );
    }

    // Return safe payment response (exclude sensitive gateway data)
    return NextResponse.json(
      {
        success: true,
        data: {
          id: payment._id,
          orderId: payment.orderId,
          amount: payment.amount,
          currency: payment.currency,
          method: payment.method,
          status: payment.status,
          txnId: payment.txnId,
          createdAt: payment.createdAt,
          updatedAt: payment.updatedAt,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Get payment error:', error);

    return NextResponse.json(
      {
        success: false,
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch payment',
      },
      { status: 500 }
    );
  }
}
