import { NextRequest, NextResponse } from 'next/server';
import PaymentService, { PaymentError } from '@/lib/services/paymentService';
import {
  CreatePaymentAdminSchema,
  ListPaymentsQuerySchema,
} from '@/lib/validations/paymentValidation';
import { connectDB } from '@/lib/mongodb';

/**
 * POST /api/admin/payments
 * Admin creates a payment record (manual override)
 */
export async function POST(request: NextRequest) {
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

    // Validate request
    const validated = CreatePaymentAdminSchema.parse({
      ...body,
      createdBy: adminId,
    });

    const payment = await PaymentService.initiatePayment({
      orderId: validated.orderId,
      customerId: validated.customerId,
      amount: validated.amount,
      currency: 'INR',
      method: validated.method,
      provider: validated.provider,
      meta: {
        notes: validated.notes,
        adminOverride: true,
        overriddenBy: adminId,
        overriddenAt: new Date(),
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
    console.error('Create payment error:', error);

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
        message: 'Failed to create payment',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/payments
 * List all payments with filters
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const queryData = {
      status: searchParams.get('status') || undefined,
      method: searchParams.get('method') || undefined,
      provider: searchParams.get('provider') || undefined,
      customerId: searchParams.get('customerId') || undefined,
      orderId: searchParams.get('orderId') || undefined,
      startDate: searchParams.get('startDate')
        ? new Date(searchParams.get('startDate')!)
        : undefined,
      endDate: searchParams.get('endDate')
        ? new Date(searchParams.get('endDate')!)
        : undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
      sortBy: searchParams.get('sortBy') || 'createdAt',
      sortOrder: searchParams.get('sortOrder') || 'desc',
    };

    // Validate query parameters
    const validated = ListPaymentsQuerySchema.parse(queryData);

    const { payments, pagination } = await PaymentService.listPayments(
      {
        status: validated.status,
        method: validated.method,
        provider: validated.provider,
        customerId: validated.customerId,
        orderId: validated.orderId,
        startDate: validated.startDate,
        endDate: validated.endDate,
      },
      validated.page,
      validated.limit,
      validated.sortBy,
      validated.sortOrder
    );

    return NextResponse.json(
      {
        success: true,
        data: payments,
        pagination,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('List payments error:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        {
          success: false,
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch payments',
      },
      { status: 500 }
    );
  }
}
