import { NextRequest, NextResponse } from 'next/server';
import {
  CreateOrderSchema,
  OrderListQuerySchema,
} from '@/lib/validations/orderValidation';
import {
  createOrder,
  listOrders,
} from '@/lib/services/orderService';

/**
 * GET /api/orders
 * Admin: List all orders with filters
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    
    const filters = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
      orderStatus: searchParams.get('orderStatus') || undefined,
      paymentStatus: searchParams.get('paymentStatus') || undefined,
      customerId: searchParams.get('customerId') || undefined,
      dateFrom: searchParams.get('dateFrom') ? new Date(searchParams.get('dateFrom')!) : undefined,
      dateTo: searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')!) : undefined,
      searchOrderNumber: searchParams.get('searchOrderNumber') || undefined,
      tags: searchParams.getAll('tags'),
      isOverdue: searchParams.get('isOverdue') === 'true',
    };

    // Validate filters
    const validatedFilters = OrderListQuerySchema.parse(filters);
    const result = await listOrders(validatedFilters);

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('Error listing orders:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to list orders',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/orders
 * Create new order from checkout
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = CreateOrderSchema.parse(body);

    const order = await createOrder(validatedData);

    return NextResponse.json(order, { status: 201 });
  } catch (error: any) {
    console.error('Error creating order:', error);

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
        error: error.error || error.message || 'Failed to create order',
        code: error.code || 'INTERNAL_ERROR',
      },
      { status: error.statusCode || 500 }
    );
  }
}
