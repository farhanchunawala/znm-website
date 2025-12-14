import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/admin-auth';
import CourierService from '@/lib/services/courierService';
import CourierRate from '@/models/CourierModel';

/**
 * GET /api/admin/courier-rates
 * List all courier rates with filters
 */
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const serviceType = searchParams.get('serviceType') as 'express' | 'standard' | 'economy' | null;
    const isActive = searchParams.get('isActive') === 'true';
    const skip = parseInt(searchParams.get('skip') || '0', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const sortBy = searchParams.get('sortBy') || 'carrierName';

    const rates = await CourierService.listRates({
      serviceType: serviceType || undefined,
      isActive,
      skip,
      limit,
      sortBy: sortBy as any,
    });

    const total = await CourierRate.countDocuments({ isActive });

    return NextResponse.json({
      success: true,
      data: rates,
      total,
      skip,
      limit,
    });
  } catch (error) {
    console.error('Error fetching courier rates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch courier rates' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/courier-rates
 * Create a new courier rate
 */
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();

    // Validate required fields
    const requiredFields = ['courierId', 'carrierName', 'basePrice', 'weightSlab'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    const rate = await CourierService.createRate(body, user._id?.toString());

    return NextResponse.json(
      { success: true, data: rate, message: 'Courier rate created' },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating courier rate:', error);
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'Courier ID already exists' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create courier rate' },
      { status: 500 }
    );
  }
}
