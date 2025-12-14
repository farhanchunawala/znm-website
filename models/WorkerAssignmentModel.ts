import mongoose, { Schema, Document } from 'mongoose';

export interface IWorkerAssignment extends Document {
  _id: Schema.Types.ObjectId;
  orderId: Schema.Types.ObjectId;
  workerId: Schema.Types.ObjectId; // Reference to User
  status: 'pending' | 'picking' | 'picked' | 'packing' | 'packed' | 'qc' | 'qc_pass' | 'qc_fail' | 'completed';
  
  // Workflow stages
  picking: {
    startedAt?: Date;
    completedAt?: Date;
    itemsPicked: number;
    itemsTotal: number;
    notes?: string;
  };
  
  packing: {
    startedAt?: Date;
    completedAt?: Date;
    boxSize?: string;
    weight?: number;
    notes?: string;
  };
  
  qualityControl: {
    startedAt?: Date;
    completedAt?: Date;
    status?: 'pass' | 'fail';
    notes?: string;
    issues?: string[];
  };
  
  // Performance tracking
  performance: {
    pickingTime?: number; // in minutes
    packingTime?: number; // in minutes
    qcTime?: number; // in minutes
    issues?: number;
  };
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

const WorkerAssignmentSchema = new mongoose.Schema(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    workerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: [
        'pending',
        'picking',
        'picked',
        'packing',
        'packed',
        'qc',
        'qc_pass',
        'qc_fail',
        'completed',
      ],
      default: 'pending',
    },
    picking: {
      startedAt: Date,
      completedAt: Date,
      itemsPicked: {
        type: Number,
        default: 0,
      },
      itemsTotal: {
        type: Number,
        required: true,
      },
      notes: String,
    },
    packing: {
      startedAt: Date,
      completedAt: Date,
      boxSize: String,
      weight: Number,
      notes: String,
    },
    qualityControl: {
      startedAt: Date,
      completedAt: Date,
      status: {
        type: String,
        enum: ['pass', 'fail'],
      },
      notes: String,
      issues: [String],
    },
    performance: {
      pickingTime: Number,
      packingTime: Number,
      qcTime: Number,
      issues: {
        type: Number,
        default: 0,
      },
    },
    completedAt: Date,
  },
  { timestamps: true }
);

// Indexes
WorkerAssignmentSchema.index({ orderId: 1 });
WorkerAssignmentSchema.index({ workerId: 1 });
WorkerAssignmentSchema.index({ status: 1 });
WorkerAssignmentSchema.index({ workerId: 1, status: 1 });
WorkerAssignmentSchema.index({ createdAt: -1 });

export default mongoose.models.WorkerAssignment ||
  mongoose.model<IWorkerAssignment>('WorkerAssignment', WorkerAssignmentSchema);
