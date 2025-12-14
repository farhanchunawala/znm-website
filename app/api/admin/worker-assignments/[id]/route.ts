import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/admin-auth';
import WorkerService from '@/lib/services/workerService';

/**
 * GET /api/admin/worker-assignments/[id]
 * Get a specific worker assignment
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const workerId = searchParams.get('workerId');

    if (!workerId) {
      return NextResponse.json(
        { error: 'Missing required parameter: workerId' },
        { status: 400 }
      );
    }

    const assignments = await WorkerService.getWorkerJobs({
      workerId,
      limit: 1,
    });

    if (assignments.length === 0) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: assignments[0],
    });
  } catch (error) {
    console.error('Error fetching assignment:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assignment' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/worker-assignments/[id]
 * Update assignment status (picking, packing, QC)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = params;
    const body = await request.json();
    const { action, data } = body;

    if (!action) {
      return NextResponse.json(
        { error: 'Missing required field: action' },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case 'startPicking':
        result = await WorkerService.startPicking(id);
        break;
      case 'markItemPicked':
        result = await WorkerService.markItemPicked(id);
        break;
      case 'completePicking':
        result = await WorkerService.completePicking(id, data?.notes);
        break;
      case 'startPacking':
        result = await WorkerService.startPacking(id);
        break;
      case 'completePacking':
        result = await WorkerService.completePacking(id, data);
        break;
      case 'startQC':
        result = await WorkerService.startQC(id);
        break;
      case 'passQC':
        result = await WorkerService.passQC(id, data?.notes);
        break;
      case 'failQC':
        result = await WorkerService.failQC(id, data?.issues || [], data?.notes);
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    if (!result) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: `Assignment ${action} successful`,
    });
  } catch (error: any) {
    console.error('Error updating assignment:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update assignment' },
      { status: 400 }
    );
  }
}
