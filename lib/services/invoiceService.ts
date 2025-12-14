import mongoose from 'mongoose';
import Invoice from '@/models/InvoiceModel';
import Order from '@/models/OrderModel';
import Payment from '@/models/PaymentModel';
import Customer from '@/models/CustomerModel';
import { IInvoice, IInvoiceItem, IInvoiceTotals } from '@/models/InvoiceModel';
import { generateInvoicePDF } from '@/lib/invoice/generator';

/**
 * Invoice Service
 * Handles all invoice operations: generation, storage, retrieval, updates, and cancellation
 */
export class InvoiceService {
	/**
	 * Generate sequential invoice number
	 * Format: INV-FY2025-0001
	 */
	static async generateInvoiceNumber(): Promise<string> {
		const now = new Date();
		const fy = this.getFiscalYear(now);

		// Get the count of invoices for this fiscal year
		const count = await Invoice.countDocuments({
			createdAt: {
				$gte: new Date(`${fy.split('-')[0]}-04-01`),
				$lt: new Date(`${fy.split('-')[1]}-04-01`),
			},
		});

		const sequence = String(count + 1).padStart(4, '0');
		return `INV-${fy}-${sequence}`;
	}

	/**
	 * Get fiscal year (April-March in India)
	 */
	private static getFiscalYear(date: Date): string {
		const year = date.getFullYear();
		const month = date.getMonth();

		// April (month 3) to December (month 11) = current FY
		// January to March = previous FY
		if (month >= 3) {
			return `${year}-${year + 1}`;
		} else {
			return `${year - 1}-${year}`;
		}
	}

	/**
	 * Calculate GST distribution based on shipping address state
	 */
	static calculateGST(
		subtotal: number,
		companyState: string,
		customerState: string,
		taxRate: number = 18 // 18% GST default
	): { cgst: number; sgst: number; igst: number } {
		const gstAmount = subtotal * (taxRate / 100);

		if (companyState === customerState) {
			// Same state = CGST + SGST (9% each for 18% total)
			return {
				cgst: gstAmount / 2,
				sgst: gstAmount / 2,
				igst: 0,
			};
		} else {
			// Different state = IGST (18%)
			return {
				cgst: 0,
				sgst: 0,
				igst: gstAmount,
			};
		}
	}

	/**
	 * Build customer snapshot from order and customer data
	 */
	static async buildCustomerSnapshot(orderId: mongoose.Types.ObjectId) {
		const order = await Order.findById(orderId).lean();
		if (!order) throw new Error('Order not found');

		const customer = await Customer.findById(order.customerId).lean();
		if (!customer) throw new Error('Customer not found');

		return {
			name: customer.name || order.address.recipientName,
			email: customer.email || '',
			phone: customer.phone || order.address.phoneNumber,
			gstin: customer.meta?.gstin,
			address: {
				recipientName: order.address.recipientName,
				streetAddress: order.address.streetAddress,
				city: order.address.city,
				state: order.address.state,
				postalCode: order.address.postalCode,
				country: order.address.country || 'India',
			},
		};
	}

	/**
	 * Build items snapshot from order items
	 */
	static async buildItemsSnapshot(
		orderId: mongoose.Types.ObjectId,
		taxRate: number = 18
	): Promise<IInvoiceItem[]> {
		const order = await Order.findById(orderId).lean();
		if (!order) throw new Error('Order not found');

		return order.items.map((item: any) => {
			const itemSubtotal = item.subtotal;
			const itemTax = itemSubtotal * (taxRate / 100);

			return {
				productId: item.productId,
				variantSku: item.variantSku,
				title: item.title || 'Product',
				qty: item.qty,
				unitPrice: item.price,
				subtotal: itemSubtotal,
				taxRate,
				taxAmount: itemTax,
				total: itemSubtotal + itemTax,
			};
		});
	}

	/**
	 * Build totals snapshot from order
	 */
	static async buildTotalsSnapshot(
		orderId: mongoose.Types.ObjectId,
		companyState: string = 'Maharashtra',
		customerState?: string
	): Promise<IInvoiceTotals> {
		const order = await Order.findById(orderId).lean();
		if (!order) throw new Error('Order not found');

		const state = customerState || order.address.state;
		const gst = this.calculateGST(
			order.totals.subtotal,
			companyState,
			state,
			18
		);

		return {
			subtotal: order.totals.subtotal,
			cgst: gst.cgst,
			sgst: gst.sgst,
			igst: gst.igst,
			totalTax: gst.cgst + gst.sgst + gst.igst,
			discount: order.totals.discount || 0,
			shipping: order.totals.shipping || 0,
			grandTotal: order.totals.grandTotal,
		};
	}

	/**
	 * Generate invoice when order is confirmed or payment is made
	 */
	static async generateInvoice(
		orderId: mongoose.Types.ObjectId,
		options: {
			paymentMethod?: 'cod' | 'card' | 'upi' | 'wallet';
			paymentId?: mongoose.Types.ObjectId;
			generatePDF?: boolean;
		} = {}
	): Promise<IInvoice> {
		// Check if invoice already exists for this order
		const existing = await Invoice.findOne({
			orderId,
			status: 'generated',
		});

		if (existing) {
			throw new Error('Active invoice already exists for this order');
		}

		const order = await Order.findById(orderId);
		if (!order) throw new Error('Order not found');

		// Generate invoice number
		const invoiceNumber = await this.generateInvoiceNumber();

		// Build snapshots
		const customerSnapshot = await this.buildCustomerSnapshot(orderId);
		const itemsSnapshot = await this.buildItemsSnapshot(orderId);
		const totalsSnapshot = await this.buildTotalsSnapshot(
			orderId,
			'Maharashtra',
			order.address.state
		);

		// Create invoice record
		const invoice = await Invoice.create({
			invoiceNumber,
			orderId,
			customerId: order.customerId,
			customerSnapshot,
			itemsSnapshot,
			totalsSnapshot,
			paymentStatus: order.paymentStatus,
			paymentMethod: options.paymentMethod,
			paymentId: options.paymentId,
			status: 'generated',
		});

		// Generate PDF if requested
		if (options.generatePDF) {
			await this.generateAndStorePDF(invoice._id as mongoose.Types.ObjectId);
		}

		// Add timeline event
		await Order.findByIdAndUpdate(orderId, {
			$push: {
				timeline: {
					actor: 'system',
					action: 'invoice.generated',
					timestamp: new Date(),
					meta: { invoiceNumber, invoiceId: invoice._id },
				},
			},
		});

		return invoice;
	}

	/**
	 * Generate and store PDF for invoice
	 */
	static async generateAndStorePDF(
		invoiceId: mongoose.Types.ObjectId
	): Promise<{ pdfBuffer: Buffer; pdfUrl: string }> {
		const invoice = await Invoice.findById(invoiceId).populate('orderId');
		if (!invoice) throw new Error('Invoice not found');

		// Prepare order data for PDF generator
		const order = invoice.orderId as any;
		const pdfData = {
			orderId: order.orderNumber,
			invoiceNumber: invoice.invoiceNumber,
			items: invoice.itemsSnapshot,
			total: invoice.totalsSnapshot.grandTotal,
			paymentStatus: invoice.paymentStatus,
			createdAt: invoice.createdAt,
			shippingInfo: {
				firstName: invoice.customerSnapshot.address.recipientName,
				lastName: '',
				address: invoice.customerSnapshot.address.streetAddress,
				city: invoice.customerSnapshot.address.city,
				state: invoice.customerSnapshot.address.state,
				zipCode: invoice.customerSnapshot.address.postalCode,
				phone: invoice.customerSnapshot.phone,
				email: invoice.customerSnapshot.email,
			},
		};

		const { pdfBuffer } = await generateInvoicePDF(pdfData, {
			saveToDatabase: false,
		});

		// Store PDF (base64 for now, can integrate S3 later)
		const base64PDF = pdfBuffer.toString('base64');
		const pdfUrl = `/api/invoices/${invoice._id}/pdf`;

		// Update invoice with PDF
		await Invoice.findByIdAndUpdate(invoiceId, {
			pdfData: base64PDF,
			pdfUrl,
		});

		return { pdfBuffer, pdfUrl };
	}

	/**
	 * Regenerate invoice (create new version, archive old)
	 */
	static async regenerateInvoice(
		invoiceId: mongoose.Types.ObjectId
	): Promise<IInvoice> {
		const oldInvoice = await Invoice.findById(invoiceId);
		if (!oldInvoice) throw new Error('Invoice not found');

		// Generate new invoice number
		const newInvoiceNumber = await this.generateInvoiceNumber();

		// Create new invoice with same data
		const newInvoice = await Invoice.create({
			invoiceNumber: newInvoiceNumber,
			orderId: oldInvoice.orderId,
			customerId: oldInvoice.customerId,
			customerSnapshot: oldInvoice.customerSnapshot,
			itemsSnapshot: oldInvoice.itemsSnapshot,
			totalsSnapshot: oldInvoice.totalsSnapshot,
			paymentStatus: oldInvoice.paymentStatus,
			paymentMethod: oldInvoice.paymentMethod,
			paymentId: oldInvoice.paymentId,
			status: 'generated',
			previousInvoiceId: invoiceId,
		});

		// Mark old invoice as regenerated
		await Invoice.findByIdAndUpdate(invoiceId, {
			status: 'regenerated',
			regeneratedAt: new Date(),
		});

		// Generate PDF for new invoice
		await this.generateAndStorePDF(newInvoice._id as mongoose.Types.ObjectId);

		// Add timeline event
		await Order.findByIdAndUpdate(oldInvoice.orderId, {
			$push: {
				timeline: {
					actor: 'system',
					action: 'invoice.regenerated',
					timestamp: new Date(),
					meta: {
						oldInvoiceNumber: oldInvoice.invoiceNumber,
						newInvoiceNumber: newInvoice.invoiceNumber,
					},
				},
			},
		});

		return newInvoice;
	}

	/**
	 * Cancel invoice
	 */
	static async cancelInvoice(
		invoiceId: mongoose.Types.ObjectId,
		reason: string,
		cancelledBy?: mongoose.Types.ObjectId
	): Promise<IInvoice> {
		const invoice = await Invoice.findByIdAndUpdate(
			invoiceId,
			{
				status: 'cancelled',
				cancelledAt: new Date(),
				cancelledBy,
				cancelReason: reason,
			},
			{ new: true }
		);

		if (!invoice) throw new Error('Invoice not found');

		// Add timeline event
		await Order.findByIdAndUpdate(invoice.orderId, {
			$push: {
				timeline: {
					actor: 'system',
					action: 'invoice.cancelled',
					timestamp: new Date(),
					meta: {
						invoiceNumber: invoice.invoiceNumber,
						reason,
					},
				},
			},
		});

		return invoice;
	}

	/**
	 * Get invoice by ID
	 */
	static async getInvoice(invoiceId: mongoose.Types.ObjectId): Promise<IInvoice | null> {
		return Invoice.findById(invoiceId)
			.populate('orderId')
			.populate('customerId')
			.populate('paymentId');
	}

	/**
	 * Get invoice by number
	 */
	static async getInvoiceByNumber(invoiceNumber: string): Promise<IInvoice | null> {
		return Invoice.findOne({ invoiceNumber })
			.populate('orderId')
			.populate('customerId');
	}

	/**
	 * List invoices with filters
	 */
	static async listInvoices(
		filters: {
			customerId?: mongoose.Types.ObjectId;
			status?: string;
			paymentStatus?: string;
			startDate?: Date;
			endDate?: Date;
		} = {},
		options: { limit?: number; skip?: number; sort?: any } = {}
	) {
		const query: any = {};

		if (filters.customerId) query.customerId = filters.customerId;
		if (filters.status) query.status = filters.status;
		if (filters.paymentStatus) query.paymentStatus = filters.paymentStatus;

		if (filters.startDate || filters.endDate) {
			query.createdAt = {};
			if (filters.startDate) query.createdAt.$gte = filters.startDate;
			if (filters.endDate) query.createdAt.$lte = filters.endDate;
		}

		const limit = options.limit || 50;
		const skip = options.skip || 0;
		const sort = options.sort || { createdAt: -1 };

		const [invoices, total] = await Promise.all([
			Invoice.find(query)
				.populate('orderId')
				.populate('customerId')
				.limit(limit)
				.skip(skip)
				.sort(sort),
			Invoice.countDocuments(query),
		]);

		return { invoices, total, limit, skip };
	}

	/**
	 * Verify invoice ownership (security check)
	 */
	static async verifyOwnership(
		invoiceId: mongoose.Types.ObjectId,
		customerId: mongoose.Types.ObjectId
	): Promise<boolean> {
		const invoice = await Invoice.findById(invoiceId);
		if (!invoice) return false;
		return invoice.customerId.equals(customerId);
	}

	/**
	 * Update invoice payment status
	 */
	static async updatePaymentStatus(
		invoiceId: mongoose.Types.ObjectId,
		paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded'
	): Promise<IInvoice | null> {
		return Invoice.findByIdAndUpdate(
			invoiceId,
			{ paymentStatus },
			{ new: true }
		);
	}

	/**
	 * Sync invoice with payment status
	 */
	static async syncWithPayment(
		invoiceId: mongoose.Types.ObjectId,
		paymentId: mongoose.Types.ObjectId
	): Promise<IInvoice | null> {
		const payment = await Payment.findById(paymentId).lean();
		if (!payment) throw new Error('Payment not found');

		return Invoice.findByIdAndUpdate(
			invoiceId,
			{
				paymentStatus: payment.status,
				paymentId,
			},
			{ new: true }
		);
	}
}

export default InvoiceService;
