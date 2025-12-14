import { NextRequest, NextResponse } from 'next/server';
import ShipmentService from '@/lib/services/shipmentService';
import { verifyAdminAuth } from '@/lib/admin-auth';

/**
 * GET    /api/shipments/:id - Get shipment detail
 * PATCH  /api/shipments/:id - Update shipment
 * DELETE /api/shipments/:id - Delete shipment
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await verifyAdminAuth(request);

    const shipment = await ShipmentService.getShipment(params.id);

    if (!shipment) {
      return NextResponse.json(
        { success: false, error: 'Shipment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: shipment,
    });
  } catch (error: any) {
    console.error('Error getting shipment:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await verifyAdminAuth(request);

    const body = await request.json();
    const { courierName, trackingNumber, trackingUrl, status, meta } = body;

    const shipment = await ShipmentService.updateShipment(params.id, {
      courierName,
      trackingNumber,
      trackingUrl,
      status,
      meta,
    });

    return NextResponse.json({
      success: true,
      data: shipment,
    });
  } catch (error: any) {
    console.error('Error updating shipment:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await verifyAdminAuth(request);

    await ShipmentService.deleteShipment(params.id);

    return NextResponse.json({
      success: true,
      message: 'Shipment deleted',
    });
  } catch (error: any) {
    console.error('Error deleting shipment:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
}
