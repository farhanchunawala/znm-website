import { NextRequest, NextResponse } from 'next/server';
import { verifyCustomerAuth } from '@/lib/auth';
import courierRateService from '@/lib/services/courierRateService';

/**
 * POST /api/courier-rates/calculate
 * Calculate shipping cost for checkout
 * No admin auth required - used by customers during checkout
 */
export async function POST(request: NextRequest) {
  try {
    const customer = await verifyCustomerAuth(request);
    if (!customer) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { courierName, pincode, weight, orderValue, paymentMethod } = body;

    // Validation
    if (!courierName || !pincode || weight === undefined || !paymentMethod) {
      return NextResponse.json(
        {
          error: 'Missing required fields: courierName, pincode, weight, paymentMethod',
        },
        { status: 400 }
      );
    }

    if (weight <= 0) {
      return NextResponse.json(
        { error: 'Weight must be greater than 0' },
        { status: 400 }
      );
    }

    if (!['cod', 'paid'].includes(paymentMethod)) {
      return NextResponse.json(
        { error: 'Invalid payment method. Must be "cod" or "paid"' },
        { status: 400 }
      );
    }

    const result = await courierRateService.calculateShippingCost({
      courierName,
      pincode,
      weight,
      orderValue: orderValue || 0,
      paymentMethod,
    });

    return NextResponse.json(
      {
        message: 'Shipping cost calculated successfully',
        result,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error calculating shipping cost:', error);
    const errorMessage = String(error);

    // Return friendly error messages
    if (errorMessage.includes('No active rate found')) {
      return NextResponse.json(
        { error: 'Shipping not available for this courier' },
        { status: 400 }
      );
    }

    if (errorMessage.includes('not found in service zones')) {
      return NextResponse.json(
        { error: 'Shipping not available for your pincode' },
        { status: 400 }
      );
    }

    if (errorMessage.includes('not covered in slabs')) {
      return NextResponse.json(
        { error: 'Package weight not supported for this courier' },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
