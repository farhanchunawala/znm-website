import mongoose, { Schema, Document } from 'mongoose';

export interface IGroup extends Document {
    name: string;
    type: 'customer' | 'order';
    color: string;
    description?: string;
    createdAt: Date;
    updatedAt: Date;
}

const GroupSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        type: { type: String, enum: ['customer', 'order'], required: true },
        color: { type: String, default: '#000000' },
        description: String,
    },
    { timestamps: true }
);

export default mongoose.models.Group || mongoose.model<IGroup>('Group', GroupSchema);
