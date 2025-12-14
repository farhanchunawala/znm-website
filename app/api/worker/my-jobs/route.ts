import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import WorkerService from '@/lib/services/workerService';

/**
 * GET /api/worker/my-jobs
 * Get current worker's assigned jobs
 * Workers use this to see their task queue
 */
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user || !user.roles?.includes('worker'))
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const skip = parseInt(searchParams.get('skip') || '0', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const jobs = await WorkerService.getWorkerJobs({
      workerId: user._id?.toString() || '',
      status: status || undefined,
      skip,
      limit,
    });

    return NextResponse.json({
      success: true,
      data: jobs,
      count: jobs.length,
    });
  } catch (error) {
    console.error('Error fetching worker jobs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}
