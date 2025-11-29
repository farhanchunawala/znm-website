import mongoose, { Schema, Document } from 'mongoose';

export interface IFeedback extends Document {
    orderId: Schema.Types.ObjectId;
    customerId: Schema.Types.ObjectId;
    fittingRating: number;
    fabricRating: number;
    serviceRating: number;
    deliveryPartnerRating: number;
    fittingComment?: string;
    fabricComment?: string;
    serviceComment?: string;
    deliveryComment?: string;
    createdAt: Date;
    updatedAt: Date;
}

const FeedbackSchema = new mongoose.Schema(
    {
        orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
        customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
        fittingRating: { type: Number, min: 1, max: 5, required: true },
        fabricRating: { type: Number, min: 1, max: 5, required: true },
        serviceRating: { type: Number, min: 1, max: 5, required: true },
        deliveryPartnerRating: { type: Number, min: 1, max: 5, required: true },
        fittingComment: String,
        fabricComment: String,
        serviceComment: String,
        deliveryComment: String,
    },
    { timestamps: true }
);

export default mongoose.models.Feedback || mongoose.model<IFeedback>('Feedback', FeedbackSchema);
