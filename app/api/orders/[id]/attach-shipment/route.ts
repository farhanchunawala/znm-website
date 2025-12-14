import { NextRequest, NextResponse } from 'next/server';
import { attachShipment } from '@/lib/services/orderService';
import { AttachShipmentSchema } from '@/lib/validations/orderValidation';

/**
 * POST /api/orders/:id/attach-shipment
 * Link shipmentId and tracking number to order
 * Called when order is packed and handed to logistics
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const validatedData = AttachShipmentSchema.parse(body);

    const order = await attachShipment(params.id, validatedData.shipmentId, validatedData.trackingNumber);

    return NextResponse.json(
      {
        success: true,
        message: `Shipment attached to order ${order.orderNumber}`,
        order,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error attaching shipment:', error);

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
        error: error.error || error.message || 'Failed to attach shipment',
        code: error.code || 'INTERNAL_ERROR',
      },
      { status: error.statusCode || 500 }
    );
  }
}
