import { NextRequest, NextResponse } from 'next/server';
import { verifyCustomerAuth } from '@/lib/auth';
import CourierService from '@/lib/services/courierService';

/**
 * POST /api/shipping/calculate-cost
 * Calculate shipping cost for customer
 * Used in checkout process
 */
export async function POST(request: NextRequest) {
  try {
    const user = await verifyCustomerAuth(request);
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { weight, sourcePin, destPin, courierId } = body;

    // Validate required fields
    if (!weight || !sourcePin || !destPin || !courierId) {
      return NextResponse.json(
        { error: 'Missing required fields: weight, sourcePin, destPin, courierId' },
        { status: 400 }
      );
    }

    const cost = await CourierService.calculateShippingCost({
      weight: parseFloat(weight),
      sourcePin,
      destPin,
      courierId,
    });

    return NextResponse.json({
      success: true,
      data: {
        cost,
        weight,
        courierId,
      },
    });
  } catch (error: any) {
    console.error('Error calculating shipping cost:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to calculate shipping cost' },
      { status: 400 }
    );
  }
}

/**
 * GET /api/shipping/available-couriers
 * Get all available couriers for a route
 */
export async function GET(request: NextRequest) {
  try {
    const user = await verifyCustomerAuth(request);
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const weight = parseFloat(searchParams.get('weight') || '0');
    const sourcePin = searchParams.get('sourcePin') || '';
    const destPin = searchParams.get('destPin') || '';

    if (!weight || !sourcePin || !destPin) {
      return NextResponse.json(
        { error: 'Missing required fields: weight, sourcePin, destPin' },
        { status: 400 }
      );
    }

    const available = await CourierService.getAvailableCouriers(
      weight,
      sourcePin,
      destPin
    );

    return NextResponse.json({
      success: true,
      data: available,
      count: available.length,
    });
  } catch (error) {
    console.error('Error fetching available couriers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available couriers' },
      { status: 500 }
    );
  }
}
