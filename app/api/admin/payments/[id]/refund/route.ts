import { NextRequest, NextResponse } from 'next/server';
import PaymentService, { PaymentError } from '@/lib/services/paymentService';
import { InitiateRefundSchema } from '@/lib/validations/paymentValidation';
import { connectDB } from '@/lib/mongodb';

/**
 * POST /api/admin/payments/[id]/refund
 * Admin initiates a refund for a payment
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    // Verify admin authorization
    const adminId = request.headers.get('x-admin-id');
    if (!adminId) {
      return NextResponse.json(
        {
          success: false,
          code: 'UNAUTHORIZED',
          message: 'Admin authorization required',
        },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate refund request
    const validated = InitiateRefundSchema.parse({
      paymentId: params.id,
      amount: body.amount,
      reason: body.reason,
      initiatedBy: adminId,
      meta: body.meta,
    });

    const payment = await PaymentService.initiateRefund(validated);

    return NextResponse.json(
      {
        success: true,
        data: payment,
        message: 'Refund initiated successfully',
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Initiate refund error:', error);

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
        message: 'Failed to initiate refund',
      },
      { status: 500 }
    );
  }
}
