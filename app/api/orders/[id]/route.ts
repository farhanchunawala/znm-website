import { NextRequest, NextResponse } from 'next/server';
import {
  getOrderById,
  updateOrderStatus,
  cancelOrder,
  addTimelineNote,
  getOrderTimeline,
} from '@/lib/services/orderService';
import {
  UpdateOrderStatusSchema,
  CancelOrderSchema,
  AddTimelineNoteSchema,
} from '@/lib/validations/orderValidation';

/**
 * GET /api/orders/:id
 * Retrieve full order details
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const order = await getOrderById(params.id);

    if (!order) {
      return NextResponse.json(
        {
          error: 'Order not found',
          code: 'ORDER_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    return NextResponse.json(order, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching order:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to fetch order',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/orders/:id
 * Update order (status, notes, etc.)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();

    // Route to appropriate handler based on request body
    if (body.orderStatus) {
      const validatedData = UpdateOrderStatusSchema.parse(body);
      const order = await updateOrderStatus(params.id, validatedData);
      return NextResponse.json(order, { status: 200 });
    } else if (body.note) {
      const validatedData = AddTimelineNoteSchema.parse(body);
      const order = await addTimelineNote(params.id, validatedData.note, validatedData.actor);
      return NextResponse.json(order, { status: 200 });
    }

    return NextResponse.json(
      {
        error: 'No valid update fields provided',
        code: 'VALIDATION_ERROR',
      },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error updating order:', error);

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
        error: error.error || error.message || 'Failed to update order',
        code: error.code || 'INTERNAL_ERROR',
      },
      { status: error.statusCode || 500 }
    );
  }
}

/**
 * DELETE /api/orders/:id (mapped to cancel)
 * Cancel order and release stock
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const validatedData = CancelOrderSchema.parse(body);

    const order = await cancelOrder(params.id, validatedData);

    return NextResponse.json(order, { status: 200 });
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
