import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/admin-auth';
import WorkerService from '@/lib/services/workerService';

/**
 * GET /api/admin/worker-metrics/[workerId]
 * Get performance metrics for a worker
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { workerId: string } }
) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { workerId } = params;

    const metrics = await WorkerService.getWorkerMetrics(workerId);

    return NextResponse.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    console.error('Error fetching worker metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch worker metrics' },
      { status: 500 }
    );
  }
}
