import mongoose from 'mongoose';
import WorkerAssignment, { IWorkerAssignment } from '@/models/WorkerAssignmentModel';
import Order, { IOrder } from '@/models/OrderModel';
import User, { IUser } from '@/models/UserModel';

interface AssignOrderOptions {
  orderId: string;
  workerId: string;
}

interface WorkerJobsOptions {
  workerId: string;
  status?: string;
  skip?: number;
  limit?: number;
}

interface WorkerMetrics {
  workerId: string;
  totalOrders: number;
  completedOrders: number;
  qcPassRate: number;
  avgPickingTime: number;
  avgPackingTime: number;
  avgQcTime: number;
  totalIssues: number;
  performanceScore: number;
}

/**
 * WorkerService
 * Manages worker assignments, job tracking, and performance metrics
 */
class WorkerService {
  /**
   * Assign an order to a worker
   */
  async assignOrder(options: AssignOrderOptions): Promise<IWorkerAssignment> {
    try {
      const { orderId, workerId } = options;

      // Verify order exists
      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error(`Order not found: ${orderId}`);
      }

      // Verify worker exists
      const worker = await User.findById(workerId);
      if (!worker || !worker.roles?.includes('worker')) {
        throw new Error(`Invalid worker: ${workerId}`);
      }

      // Check if assignment already exists
      const existing = await WorkerAssignment.findOne({
        orderId: new mongoose.Types.ObjectId(orderId),
        status: { $ne: 'completed' },
      });

      if (existing) {
        throw new Error(`Order ${orderId} is already assigned`);
      }

      // Create assignment
      // Calculate total items to pick (sum of quantities)
      const itemsTotal = order.items.reduce((total, item) => total + (item.qty || 1), 0);

      const assignment = new WorkerAssignment({
        orderId: new mongoose.Types.ObjectId(orderId),
        workerId: new mongoose.Types.ObjectId(workerId),
        status: 'pending',
        picking: {
          itemsTotal,
          itemsPicked: 0,
        },
      });

      await assignment.save();
      return assignment;
    } catch (error) {
      console.error('Error assigning order:', error);
      throw error;
    }
  }

  /**
   * Get all jobs for a worker
   */
  async getWorkerJobs(options: WorkerJobsOptions): Promise<IWorkerAssignment[]> {
    try {
      const { workerId, status, skip = 0, limit = 50 } = options;

      const query: any = {
        workerId: new mongoose.Types.ObjectId(workerId),
      };

      if (status) {
        query.status = status;
      }

      const jobs = await WorkerAssignment.find(query)
        .populate('orderId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      return jobs;
    } catch (error) {
      console.error('Error fetching worker jobs:', error);
      throw error;
    }
  }

  /**
   * Start picking for an assignment
   */
  async startPicking(assignmentId: string): Promise<IWorkerAssignment | null> {
    try {
      const assignment = await WorkerAssignment.findByIdAndUpdate(
        assignmentId,
        {
          status: 'picking',
          'picking.startedAt': new Date(),
        },
        { new: true }
      );

      return assignment;
    } catch (error) {
      console.error('Error starting picking:', error);
      throw error;
    }
  }

  /**
   * Mark an item as picked
   */
  async markItemPicked(assignmentId: string): Promise<IWorkerAssignment | null> {
    try {
      const assignment = await WorkerAssignment.findById(assignmentId);
      if (!assignment) {
        throw new Error(`Assignment not found: ${assignmentId}`);
      }

      // Increment picked items
      if (assignment.picking.itemsPicked < assignment.picking.itemsTotal) {
        assignment.picking.itemsPicked += 1;
      }

      await assignment.save();
      return assignment;
    } catch (error) {
      console.error('Error marking item picked:', error);
      throw error;
    }
  }

  /**
   * Complete picking stage
   */
  async completePicking(assignmentId: string, notes?: string): Promise<IWorkerAssignment | null> {
    try {
      const now = new Date();
      const assignment = await WorkerAssignment.findById(assignmentId);
      if (!assignment) {
        throw new Error(`Assignment not found: ${assignmentId}`);
      }

      const pickingStartTime = assignment.picking.startedAt || now;
      const pickingTimeMinutes = Math.round(
        (now.getTime() - pickingStartTime.getTime()) / (1000 * 60)
      );

      const updated = await WorkerAssignment.findByIdAndUpdate(
        assignmentId,
        {
          status: 'picked',
          'picking.completedAt': now,
          'picking.notes': notes || '',
          'performance.pickingTime': pickingTimeMinutes,
        },
        { new: true }
      );

      return updated;
    } catch (error) {
      console.error('Error completing picking:', error);
      throw error;
    }
  }

  /**
   * Start packing
   */
  async startPacking(assignmentId: string): Promise<IWorkerAssignment | null> {
    try {
      const assignment = await WorkerAssignment.findByIdAndUpdate(
        assignmentId,
        {
          status: 'packing',
          'packing.startedAt': new Date(),
        },
        { new: true }
      );

      return assignment;
    } catch (error) {
      console.error('Error starting packing:', error);
      throw error;
    }
  }

  /**
   * Complete packing stage
   */
  async completePacking(
    assignmentId: string,
    data: { boxSize?: string; weight?: number; notes?: string }
  ): Promise<IWorkerAssignment | null> {
    try {
      const now = new Date();
      const assignment = await WorkerAssignment.findById(assignmentId);
      if (!assignment) {
        throw new Error(`Assignment not found: ${assignmentId}`);
      }

      const packingStartTime = assignment.packing.startedAt || now;
      const packingTimeMinutes = Math.round(
        (now.getTime() - packingStartTime.getTime()) / (1000 * 60)
      );

      const updated = await WorkerAssignment.findByIdAndUpdate(
        assignmentId,
        {
          status: 'packed',
          'packing.completedAt': now,
          'packing.boxSize': data.boxSize,
          'packing.weight': data.weight,
          'packing.notes': data.notes,
          'performance.packingTime': packingTimeMinutes,
        },
        { new: true }
      );

      return updated;
    } catch (error) {
      console.error('Error completing packing:', error);
      throw error;
    }
  }

  /**
   * Start quality control
   */
  async startQC(assignmentId: string): Promise<IWorkerAssignment | null> {
    try {
      const assignment = await WorkerAssignment.findByIdAndUpdate(
        assignmentId,
        {
          status: 'qc',
          'qualityControl.startedAt': new Date(),
        },
        { new: true }
      );

      return assignment;
    } catch (error) {
      console.error('Error starting QC:', error);
      throw error;
    }
  }

  /**
   * Mark QC as passed
   */
  async passQC(
    assignmentId: string,
    notes?: string
  ): Promise<IWorkerAssignment | null> {
    try {
      const now = new Date();
      const assignment = await WorkerAssignment.findById(assignmentId);
      if (!assignment) {
        throw new Error(`Assignment not found: ${assignmentId}`);
      }

      const qcStartTime = assignment.qualityControl.startedAt || now;
      const qcTimeMinutes = Math.round(
        (now.getTime() - qcStartTime.getTime()) / (1000 * 60)
      );

      const updated = await WorkerAssignment.findByIdAndUpdate(
        assignmentId,
        {
          status: 'qc_pass',
          'qualityControl.completedAt': now,
          'qualityControl.status': 'pass',
          'qualityControl.notes': notes,
          'performance.qcTime': qcTimeMinutes,
          completedAt: now,
        },
        { new: true }
      );

      return updated;
    } catch (error) {
      console.error('Error passing QC:', error);
      throw error;
    }
  }

  /**
   * Mark QC as failed
   */
  async failQC(
    assignmentId: string,
    issues: string[],
    notes?: string
  ): Promise<IWorkerAssignment | null> {
    try {
      const now = new Date();
      const assignment = await WorkerAssignment.findById(assignmentId);
      if (!assignment) {
        throw new Error(`Assignment not found: ${assignmentId}`);
      }

      const qcStartTime = assignment.qualityControl.startedAt || now;
      const qcTimeMinutes = Math.round(
        (now.getTime() - qcStartTime.getTime()) / (1000 * 60)
      );

      const updated = await WorkerAssignment.findByIdAndUpdate(
        assignmentId,
        {
          status: 'qc_fail',
          'qualityControl.completedAt': now,
          'qualityControl.status': 'fail',
          'qualityControl.issues': issues,
          'qualityControl.notes': notes,
          'performance.qcTime': qcTimeMinutes,
          'performance.issues': issues.length,
        },
        { new: true }
      );

      return updated;
    } catch (error) {
      console.error('Error failing QC:', error);
      throw error;
    }
  }

  /**
   * Get worker performance metrics
   */
  async getWorkerMetrics(workerId: string): Promise<WorkerMetrics> {
    try {
      const assignments = await WorkerAssignment.find({
        workerId: new mongoose.Types.ObjectId(workerId),
      });

      const completedAssignments = assignments.filter(
        (a) => a.status === 'qc_pass' || a.status === 'qc_fail'
      );
      const qcPassedAssignments = assignments.filter((a) => a.status === 'qc_pass');

      const totalOrders = assignments.length;
      const completedOrders = completedAssignments.length;
      const qcPassRate = totalOrders > 0 ? (qcPassedAssignments.length / completedOrders) * 100 : 0;

      // Calculate average times
      const pickingTimes = assignments
        .filter((a) => a.performance.pickingTime)
        .map((a) => a.performance.pickingTime!);
      const packingTimes = assignments
        .filter((a) => a.performance.packingTime)
        .map((a) => a.performance.packingTime!);
      const qcTimes = assignments
        .filter((a) => a.performance.qcTime)
        .map((a) => a.performance.qcTime!);

      const avgPickingTime =
        pickingTimes.length > 0
          ? Math.round(pickingTimes.reduce((a, b) => a + b, 0) / pickingTimes.length)
          : 0;
      const avgPackingTime =
        packingTimes.length > 0
          ? Math.round(packingTimes.reduce((a, b) => a + b, 0) / packingTimes.length)
          : 0;
      const avgQcTime =
        qcTimes.length > 0
          ? Math.round(qcTimes.reduce((a, b) => a + b, 0) / qcTimes.length)
          : 0;

      const totalIssues = assignments.reduce(
        (sum, a) => sum + (a.performance.issues || 0),
        0
      );

      // Performance score (0-100)
      // Based on: completion rate (50%), QC pass rate (30%), speed (20%)
      const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;
      const speedScore = Math.min(100, (avgPickingTime + avgPackingTime) / 2);
      const performanceScore = Math.round(
        completionRate * 0.5 + qcPassRate * 0.3 + (100 - speedScore) * 0.2
      );

      return {
        workerId,
        totalOrders,
        completedOrders,
        qcPassRate: Math.round(qcPassRate),
        avgPickingTime,
        avgPackingTime,
        avgQcTime,
        totalIssues,
        performanceScore,
      };
    } catch (error) {
      console.error('Error fetching worker metrics:', error);
      throw error;
    }
  }

  /**
   * Auto-assign order to least busy worker
   * Called periodically (every 30 minutes)
   */
  async autoAssignPendingOrders(): Promise<{ assigned: number; failed: number }> {
    try {
      // Find orders without assignments
      const ordersWithoutAssignments = await Order.find({
        status: 'confirmed',
      }).populate('fulfillmentStatus');

      let assigned = 0;
      let failed = 0;

      for (const order of ordersWithoutAssignments) {
        try {
          // Find least busy worker
          const leastBusyWorker = await this.findLeastBusyWorker();
          if (!leastBusyWorker) {
            failed++;
            continue;
          }

          // Assign order
          await this.assignOrder({
            orderId: order._id.toString(),
            workerId: leastBusyWorker._id.toString(),
          });

          assigned++;
        } catch (error) {
          console.error(`Failed to assign order ${order._id}:`, error);
          failed++;
        }
      }

      return { assigned, failed };
    } catch (error) {
      console.error('Error in auto-assignment:', error);
      throw error;
    }
  }

  // === HELPER METHODS ===

  /**
   * Find the least busy worker (worker with fewest active assignments)
   */
  private async findLeastBusyWorker(): Promise<IUser | null> {
    try {
      // Get all workers
      const workers = await User.find({ role: 'worker' });
      if (workers.length === 0) return null;

      let leastBusyWorker = workers[0];
      let leastAssignments = Infinity;

      for (const worker of workers) {
        const activeAssignments = await WorkerAssignment.countDocuments({
          workerId: worker._id,
          status: { $ne: 'completed' },
        });

        if (activeAssignments < leastAssignments) {
          leastAssignments = activeAssignments;
          leastBusyWorker = worker;
        }
      }

      return leastBusyWorker;
    } catch (error) {
      console.error('Error finding least busy worker:', error);
      return null;
    }
  }
}

export default new WorkerService();
