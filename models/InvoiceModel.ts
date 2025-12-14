import mongoose, { Schema, Document } from 'mongoose';

/**
 * Invoice Item Snapshot
 * Immutable snapshot of order items at invoice time
 */
export interface IInvoiceItem {
	productId: Schema.Types.ObjectId;
	variantSku: string;
	title: string;
	qty: number;
	unitPrice: number;
	subtotal: number; // qty * unitPrice
	taxRate: number; // tax percentage (0-100)
	taxAmount: number; // calculated tax
	total: number; // subtotal + taxAmount
}

/**
 * Invoice Totals Snapshot
 * Complete financial breakdown at invoice time
 */
export interface IInvoiceTotals {
	subtotal: number;
	cgst: number; // Central GST
	sgst: number; // State GST
	igst: number; // Integrated GST
	totalTax: number; // cgst + sgst or igst
	discount: number;
	shipping: number;
	grandTotal: number;
}

/**
 * Customer Snapshot at Invoice Time
 */
export interface IInvoiceCustomerSnapshot {
	name: string;
	email: string;
	phone: string;
	gstin?: string;
	address: {
		recipientName: string;
		streetAddress: string;
		city: string;
		state: string;
		postalCode: string;
		country: string;
	};
}

/**
 * Invoice Document Interface
 */
export interface IInvoice extends Document {
	// Identification
	invoiceNumber: string; // Unique, sequential (INV-FY2024-0001)
	orderId: Schema.Types.ObjectId;
	customerId: Schema.Types.ObjectId;

	// Snapshots (immutable)
	customerSnapshot: IInvoiceCustomerSnapshot;
	itemsSnapshot: IInvoiceItem[];
	totalsSnapshot: IInvoiceTotals;

	// Payment & Order Integration
	paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
	paymentMethod?: 'cod' | 'card' | 'upi' | 'wallet';
	paymentId?: Schema.Types.ObjectId;

	// Storage
	pdfUrl?: string; // URL to stored PDF (S3 or local)
	pdfData?: string; // Fallback: base64 encoded PDF
	expiresAt?: Date; // Retention period (3 months default)

	// Status Tracking
	status: 'generated' | 'cancelled' | 'regenerated';
	previousInvoiceId?: Schema.Types.ObjectId; // Link to old invoice if regenerated
	cancelledAt?: Date;
	cancelledBy?: Schema.Types.ObjectId;
	cancelReason?: string;

	// Audit
	createdAt: Date;
	updatedAt: Date;
	regeneratedAt?: Date;
}

const InvoiceItemSchema = new Schema<IInvoiceItem>(
	{
		productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
		variantSku: { type: String, required: true },
		title: { type: String, required: true },
		qty: { type: Number, required: true },
		unitPrice: { type: Number, required: true },
		subtotal: { type: Number, required: true },
		taxRate: { type: Number, required: true },
		taxAmount: { type: Number, required: true },
		total: { type: Number, required: true },
	},
	{ _id: false }
);

const InvoiceTotalsSchema = new Schema<IInvoiceTotals>(
	{
		subtotal: { type: Number, required: true },
		cgst: { type: Number, default: 0 },
		sgst: { type: Number, default: 0 },
		igst: { type: Number, default: 0 },
		totalTax: { type: Number, required: true },
		discount: { type: Number, default: 0 },
		shipping: { type: Number, default: 0 },
		grandTotal: { type: Number, required: true },
	},
	{ _id: false }
);

const InvoiceCustomerSnapshotSchema = new Schema<IInvoiceCustomerSnapshot>(
	{
		name: { type: String, required: true },
		email: { type: String, required: true },
		phone: { type: String, required: true },
		gstin: { type: String, sparse: true },
		address: {
			recipientName: { type: String, required: true },
			streetAddress: { type: String, required: true },
			city: { type: String, required: true },
			state: { type: String, required: true },
			postalCode: { type: String, required: true },
			country: { type: String, default: 'India' },
		},
	},
	{ _id: false }
);

const InvoiceSchema = new Schema<IInvoice>(
	{
		invoiceNumber: {
			type: String,
			unique: true,
			required: true,
			index: true,
		},
		orderId: {
			type: Schema.Types.ObjectId,
			ref: 'Order',
			required: true,
			index: true,
		},
		customerId: {
			type: Schema.Types.ObjectId,
			ref: 'Customer',
			required: true,
			index: true,
		},

		// Snapshots
		customerSnapshot: {
			type: InvoiceCustomerSnapshotSchema,
			required: true,
		},
		itemsSnapshot: [InvoiceItemSchema],
		totalsSnapshot: {
			type: InvoiceTotalsSchema,
			required: true,
		},

		// Payment
		paymentStatus: {
			type: String,
			enum: ['pending', 'paid', 'failed', 'refunded'],
			default: 'pending',
			index: true,
		},
		paymentMethod: {
			type: String,
			enum: ['cod', 'card', 'upi', 'wallet'],
		},
		paymentId: {
			type: Schema.Types.ObjectId,
			ref: 'Payment',
		},

		// Storage
		pdfUrl: String,
		pdfData: String,
		expiresAt: {
			type: Date,
			default: () => {
				const d = new Date();
				d.setMonth(d.getMonth() + 3);
				return d;
			},
			index: true,
		},

		// Status
		status: {
			type: String,
			enum: ['generated', 'cancelled', 'regenerated'],
			default: 'generated',
			index: true,
		},
		previousInvoiceId: {
			type: Schema.Types.ObjectId,
			ref: 'Invoice',
		},
		cancelledAt: Date,
		cancelledBy: Schema.Types.ObjectId,
		cancelReason: String,

		// Audit
		regeneratedAt: Date,
	},
	{
		timestamps: true,
		collection: 'invoices',
	}
);

// Indexes for efficient queries
InvoiceSchema.index({ orderId: 1, status: 1 });
InvoiceSchema.index({ customerId: 1, paymentStatus: 1 });
InvoiceSchema.index({ createdAt: -1 });
InvoiceSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Ensure only one active invoice per order
InvoiceSchema.index(
	{ orderId: 1, status: 1 },
	{ unique: true, sparse: true, partialFilterExpression: { status: 'generated' } }
);

export default mongoose.models.Invoice ||
	mongoose.model<IInvoice>('Invoice', InvoiceSchema);
