import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/admin-auth';
import WorkerService from '@/lib/services/workerService';

/**
 * GET /api/admin/worker-assignments
 * List all worker assignments
 */
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const workerId = searchParams.get('workerId');
    const status = searchParams.get('status');
    const skip = parseInt(searchParams.get('skip') || '0', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    if (!workerId) {
      return NextResponse.json(
        { error: 'Missing required parameter: workerId' },
        { status: 400 }
      );
    }

    const assignments = await WorkerService.getWorkerJobs({
      workerId,
      status: status || undefined,
      skip,
      limit,
    });

    return NextResponse.json({
      success: true,
      data: assignments,
      count: assignments.length,
    });
  } catch (error) {
    console.error('Error fetching worker assignments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch worker assignments' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/worker-assignments
 * Assign an order to a worker
 */
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { orderId, workerId } = body;

    if (!orderId || !workerId) {
      return NextResponse.json(
        { error: 'Missing required fields: orderId, workerId' },
        { status: 400 }
      );
    }

    const assignment = await WorkerService.assignOrder({
      orderId,
      workerId,
    });

    return NextResponse.json(
      { success: true, data: assignment, message: 'Order assigned to worker' },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error assigning order:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to assign order' },
      { status: 400 }
    );
  }
}
