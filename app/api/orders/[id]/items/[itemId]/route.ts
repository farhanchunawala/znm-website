import { NextRequest, NextResponse } from 'next/server';
import {
  updateOrderItem,
  deleteOrderItem,
  getOrderItem,
} from '@/lib/services/orderItemService';
import {
  UpdateOrderItemSchema,
  DeleteOrderItemSchema,
} from '@/lib/validations/orderItemValidation';
import { connectDB } from '@/lib/mongodb';

/**
 * GET /api/orders/:id/items/:itemId
 * Get a specific item from an order
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  try {
    await connectDB();

    const item = await getOrderItem(params.id, params.itemId);

    return NextResponse.json(item, { status: 200 });
  } catch (error: any) {
    console.error('GET /orders/:id/items/:itemId error:', error);

    if (error.code === 'ITEM_NOT_FOUND' || error.code === 'ORDER_NOT_FOUND') {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch item', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/orders/:id/items/:itemId
 * Update item qty, price, or variant
 * Admin only
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  try {
    await connectDB();

    const body = await req.json();
    const data = UpdateOrderItemSchema.parse(body);

    // TODO: Add admin authentication check
    const adminId = req.headers.get('x-admin-id') || 'system';

    const item = await updateOrderItem(params.id, params.itemId, data, adminId);

    return NextResponse.json(
      { message: 'Item updated successfully', item },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('PATCH /orders/:id/items/:itemId error:', error);

    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { error: error.message, code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    if (error.code === 'ITEM_NOT_FOUND' || error.code === 'ORDER_NOT_FOUND') {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 404 }
      );
    }

    if (error.code === 'INSUFFICIENT_STOCK' || error.code === 'CANNOT_MODIFY_SHIPPED') {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update item', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/orders/:id/items/:itemId
 * Remove an item from an order
 * Admin only
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  try {
    await connectDB();

    const body = await req.json().catch(() => ({}));
    const data = DeleteOrderItemSchema.parse(body);

    // TODO: Add admin authentication check
    const adminId = req.headers.get('x-admin-id') || 'system';

    const result = await deleteOrderItem(params.id, params.itemId, data, adminId);

    return NextResponse.json(
      { message: 'Item deleted successfully', ...result },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('DELETE /orders/:id/items/:itemId error:', error);

    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { error: error.message, code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    if (error.code === 'ITEM_NOT_FOUND' || error.code === 'ORDER_NOT_FOUND') {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 404 }
      );
    }

    if (error.code === 'CANNOT_MODIFY_SHIPPED') {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to delete item', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}
