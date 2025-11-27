import mongoose, { Schema, Document } from 'mongoose';

export interface IShipment extends Document {
    shipmentId: string;
    orderId: Schema.Types.ObjectId;
    customerId: Schema.Types.ObjectId;
    status: 'pending' | 'shipped' | 'outForDelivery' | 'delivered';
    trackingId?: string;
    carrier?: string;
    fulfilledAt?: Date;
    shippedAt?: Date;
    outForDeliveryAt?: Date;
    deliveredAt?: Date;
    notes?: string;
    groups: Schema.Types.ObjectId[];
    archived: boolean;
    archivedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const ShipmentSchema = new mongoose.Schema(
    {
        shipmentId: { type: String, unique: true, required: true },
        orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
        customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
        status: {
            type: String,
            enum: ['pending', 'shipped', 'outForDelivery', 'delivered'],
            default: 'pending',
        },
        trackingId: { type: String, required: true },
        carrier: { type: String, required: true },
        fulfilledAt: Date,
        shippedAt: Date,
        outForDeliveryAt: Date,
        deliveredAt: Date,
        notes: String,
        groups: [{ type: Schema.Types.ObjectId, ref: 'Group' }],
        archived: { type: Boolean, default: false },
        archivedAt: Date,
    },
    { timestamps: true }
);

export default mongoose.models.Shipment || mongoose.model<IShipment>('Shipment', ShipmentSchema);
