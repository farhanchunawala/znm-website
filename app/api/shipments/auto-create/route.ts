import { NextRequest, NextResponse } from 'next/server';
import ShipmentService from '@/lib/services/shipmentService';

/**
 * POST /api/shipments/auto-create
 * Internal system endpoint for auto-creating shipments
 * Called when order is confirmed
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'orderId required' },
        { status: 400 }
      );
    }

    const shipment = await ShipmentService.autoCreateShipment(orderId);

    return NextResponse.json({
      success: true,
      data: shipment,
    });
  } catch (error: any) {
    console.error('Error auto-creating shipment:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
}
