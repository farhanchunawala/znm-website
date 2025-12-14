import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/admin-auth';
import courierRateService from '@/lib/services/courierRateService';

/**
 * POST /api/courier-rates
 * Create new courier rate rule
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdminAuth(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { courierName, zones, weightSlabs, codExtraCharge, prepaidDiscount, minOrderValue } =
      body;

    // Validation
    if (!courierName || !zones || !weightSlabs) {
      return NextResponse.json(
        { error: 'Missing required fields: courierName, zones, weightSlabs' },
        { status: 400 }
      );
    }

    const rate = await courierRateService.createRate({
      courierName,
      zones,
      weightSlabs,
      codExtraCharge,
      prepaidDiscount,
      minOrderValue,
      createdBy: admin._id.toString(),
    });

    return NextResponse.json(
      {
        message: 'Courier rate created successfully',
        rate,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating courier rate:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

/**
 * GET /api/courier-rates
 * List all courier rates
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdminAuth(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const courierName = searchParams.get('courierName');
    const status = searchParams.get('status');
    const skip = parseInt(searchParams.get('skip') || '0');
    const limit = parseInt(searchParams.get('limit') || '50');

    const rates = await courierRateService.listRates({
      courierName: courierName || undefined,
      status: status || undefined,
      skip,
      limit,
    });

    return NextResponse.json(
      {
        message: 'Courier rates retrieved successfully',
        count: rates.length,
        rates,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error listing courier rates:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
