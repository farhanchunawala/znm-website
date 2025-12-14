import { NextRequest, NextResponse } from 'next/server';
import ShipmentService from '@/lib/services/shipmentService';
import { verifyAdminAuth } from '@/lib/admin-auth';

/**
 * POST /api/shipments - List or create shipment
 * GET  /api/shipments - List shipments with filters
 */
export async function GET(request: NextRequest) {
  try {
    await verifyAdminAuth(request);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const courierName = searchParams.get('courierName') || undefined;
    const skip = parseInt(searchParams.get('skip') || '0');
    const limit = parseInt(searchParams.get('limit') || '50');

    const shipments = await ShipmentService.listShipments({
      status,
      courierName,
      skip,
      limit,
    });

    return NextResponse.json({
      success: true,
      data: shipments,
      count: shipments.length,
    });
  } catch (error: any) {
    console.error('Error listing shipments:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await verifyAdminAuth(request);

    const body = await request.json();
    const {
      orderId,
      courierName,
      trackingNumber,
      trackingUrl,
      adminId,
      meta,
    } = body;

    if (!orderId || !courierName) {
      return NextResponse.json(
        { success: false, error: 'orderId and courierName required' },
        { status: 400 }
      );
    }

    const shipment = await ShipmentService.createShipment({
      orderId,
      courierName,
      trackingNumber,
      trackingUrl,
      createdBy: 'admin',
      adminId,
      meta,
    });

    return NextResponse.json({
      success: true,
      data: shipment,
    });
  } catch (error: any) {
    console.error('Error creating shipment:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
}
