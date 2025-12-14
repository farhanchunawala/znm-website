import { NextRequest, NextResponse } from 'next/server';
import PaymentService, { PaymentError } from '@/lib/services/paymentService';
import {
  ConfirmPaymentSchema,
  FailPaymentSchema,
  ConfirmCODPaymentSchema,
} from '@/lib/validations/paymentValidation';
import { connectDB } from '@/lib/mongodb';

/**
 * POST /api/payments/confirm
 * Confirm payment after gateway callback or COD collection
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { type } = body;

    // Handle COD confirmation
    if (type === 'COD') {
      const validated = ConfirmCODPaymentSchema.parse({
        paymentId: body.paymentId,
        receiptId: body.receiptId,
        confirmedBy: body.confirmedBy || request.headers.get('x-admin-id'),
        notes: body.notes,
      });

      if (!validated.confirmedBy) {
        return NextResponse.json(
          {
            success: false,
            code: 'UNAUTHORIZED',
            message: 'Admin authorization required',
          },
          { status: 401 }
        );
      }

      const payment = await PaymentService.confirmCODPayment(validated);

      return NextResponse.json(
        {
          success: true,
          data: payment,
          message: 'COD payment confirmed',
        },
        { status: 200 }
      );
    }

    // Handle online payment confirmation (after gateway)
    const validated = ConfirmPaymentSchema.parse({
      paymentId: body.paymentId,
      orderId: body.orderId,
      txnId: body.txnId,
      signature: body.signature,
      meta: body.meta,
    });

    const payment = await PaymentService.confirmPayment(validated);

    return NextResponse.json(
      {
        success: true,
        data: payment,
        message: 'Payment confirmed successfully',
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Confirm payment error:', error);

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

    if (error.name === 'ZodError') {
      return NextResponse.json(
        {
          success: false,
          code: 'VALIDATION_ERROR',
          message: 'Invalid request payload',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        code: 'INTERNAL_ERROR',
        message: 'Failed to confirm payment',
      },
      { status: 500 }
    );
  }
}
