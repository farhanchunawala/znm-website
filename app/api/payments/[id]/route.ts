import { NextRequest, NextResponse } from 'next/server';
import PaymentService, { PaymentError } from '@/lib/services/paymentService';
import {
  ConfirmPaymentSchema,
  FailPaymentSchema,
  ConfirmCODPaymentSchema,
  InitiateRefundSchema,
} from '@/lib/validations/paymentValidation';
import { connectDB } from '@/lib/mongodb';

/**
 * GET /api/payments/[id]
 * Get payment details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const payment = await PaymentService.getPaymentById(params.id);

    return NextResponse.json(
      {
        success: true,
        data: payment,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Get payment detail error:', error);

    if (error instanceof PaymentError) {
      return NextResponse.json(
        {
          success: false,
          code: error.code,
          message: error.message,
        },
        { status: error.statusCode }
      );
    }

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

/**
 * PATCH /api/payments/[id]
 * Update payment details (admin only)
 */
export async function PATCH(
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

    // Only allow status, amount, and notes updates
    const updates = {
      amount: body.amount,
      status: body.status,
      notes: body.notes,
    };

    const payment = await PaymentService.updatePayment(
      params.id,
      updates,
      adminId,
      body.reason
    );

    return NextResponse.json(
      {
        success: true,
        data: payment,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Update payment error:', error);

    if (error instanceof PaymentError) {
      return NextResponse.json(
        {
          success: false,
          code: error.code,
          message: error.message,
        },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      {
        success: false,
        code: 'INTERNAL_ERROR',
        message: 'Failed to update payment',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/payments/[id]
 * Delete payment (admin only, only for pending payments)
 */
export async function DELETE(
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

    await PaymentService.deletePayment(params.id, adminId);

    return NextResponse.json(
      {
        success: true,
        message: 'Payment deleted successfully',
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Delete payment error:', error);

    if (error instanceof PaymentError) {
      return NextResponse.json(
        {
          success: false,
          code: error.code,
          message: error.message,
        },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      {
        success: false,
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete payment',
      },
      { status: 500 }
    );
  }
}
