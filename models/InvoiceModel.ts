import mongoose, { Schema, Document } from 'mongoose';

export interface IInvoice extends Document {
    invoiceNumber: string;
    orderId: Schema.Types.ObjectId;
    customerId: Schema.Types.ObjectId;
    pdfData: string; // base64 encoded PDF
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const InvoiceSchema = new mongoose.Schema(
    {
        invoiceNumber: { type: String, unique: true, required: true },
        orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
        customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
        pdfData: { type: String, required: true }, // base64 encoded PDF
        expiresAt: { type: Date, required: true, index: true }, // 3 months from creation
    },
    { timestamps: true }
);

// Index for auto-deletion of expired invoices
InvoiceSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.Invoice || mongoose.model<IInvoice>('Invoice', InvoiceSchema);
