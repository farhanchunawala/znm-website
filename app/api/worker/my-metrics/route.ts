import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import WorkerService from '@/lib/services/workerService';

/**
 * GET /api/worker/my-metrics
 * Get current worker's performance metrics
 */
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user || !user.roles?.includes('worker'))
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const metrics = await WorkerService.getWorkerMetrics(user._id?.toString() || '');

    return NextResponse.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    console.error('Error fetching worker metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}
