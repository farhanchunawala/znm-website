import { NextRequest, NextResponse } from 'next/server';
import {
  addOrderItem,
  updateOrderItem,
  deleteOrderItem,
  listOrderItems,
  getOrderItem,
} from '@/lib/services/orderItemService';
import {
  AddOrderItemSchema,
  UpdateOrderItemSchema,
  DeleteOrderItemSchema,
  ListOrderItemsQuerySchema,
} from '@/lib/validations/orderItemValidation';
import { connectDB } from '@/lib/mongodb';

/**
 * GET /api/orders/:id/items
 * List all items in an order with pagination
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const searchParams = new URL(req.url).searchParams;
    const query = ListOrderItemsQuerySchema.parse({
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
    });

    const result = await listOrderItems(params.id, query.page, query.limit);

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('GET /orders/:id/items error:', error);

    if (error.code === 'ORDER_NOT_FOUND') {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to list items', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/orders/:id/items
 * Add a new item to an order
 * Admin only
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const body = await req.json();
    const data = AddOrderItemSchema.parse(body);

    // TODO: Add admin authentication check
    const adminId = req.headers.get('x-admin-id') || 'system';

    const item = await addOrderItem(params.id, data, adminId);

    return NextResponse.json(
      { message: 'Item added successfully', item },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('POST /orders/:id/items error:', error);

    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { error: error.message, code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    if (error.code === 'ORDER_NOT_FOUND') {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 404 }
      );
    }

    if (error.code === 'INSUFFICIENT_STOCK') {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 400 }
      );
    }

    if (error.code === 'CANNOT_MODIFY_SHIPPED') {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to add item', code: 'SERVER_ERROR', details: error.details },
      { status: 500 }
    );
  }
}
