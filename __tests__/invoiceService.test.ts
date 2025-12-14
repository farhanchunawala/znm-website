import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Order from '@/models/OrderModel';
import Payment from '@/models/PaymentModel';
import Customer from '@/models/CustomerModel';
import Invoice from '@/models/InvoiceModel';
import InvoiceService from '@/lib/services/invoiceService';
import { connectDB, mongoose as mongooseExport } from '@/lib/mongodb';

let mongoServer: MongoMemoryServer;

describe('Invoice System', () => {
	beforeAll(async () => {
		mongoServer = await MongoMemoryServer.create();
		const mongoUri = mongoServer.getUri();
		await mongoose.connect(mongoUri);
	});

	afterAll(async () => {
		await mongoose.disconnect();
		await mongoServer.stop();
	});

	beforeEach(async () => {
		// Clear collections
		await Order.deleteMany({});
		await Payment.deleteMany({});
		await Customer.deleteMany({});
		await Invoice.deleteMany({});
	});

	describe('Invoice Generation', () => {
		let customer: any;
		let order: any;

		beforeEach(async () => {
			// Create customer
			customer = await Customer.create({
				name: 'John Doe',
				email: 'john@example.com',
				phone: '9999999999',
				status: 'active',
				tags: [],
				addresses: [
					{
						id: '1',
						label: 'home',
						name: 'John Doe',
						phone: '9999999999',
						pincode: '400001',
						state: 'Maharashtra',
						city: 'Mumbai',
						locality: 'Downtown',
						addressLine1: '123 Main St',
					},
				],
			});

			// Create order
			order = await Order.create({
				orderNumber: 'ORD-001',
				customerId: customer._id,
				items: [
					{
						productId: new mongoose.Types.ObjectId(),
						variantSku: 'SKU-001',
						qty: 2,
						price: 500,
						subtotal: 1000,
					},
				],
				totals: {
					subtotal: 1000,
					tax: 180,
					discount: 0,
					shipping: 100,
					grandTotal: 1280,
				},
				paymentStatus: 'pending',
				orderStatus: 'pending',
				address: {
					recipientName: 'John Doe',
					phoneNumber: '9999999999',
					streetAddress: '123 Main St',
					city: 'Mumbai',
					state: 'Maharashtra',
					postalCode: '400001',
					country: 'India',
				},
				timeline: [],
			});
		});

		it('should generate invoice number in correct format', async () => {
			const invoiceNumber = await InvoiceService.generateInvoiceNumber();
			expect(invoiceNumber).toMatch(/^INV-\d{4}-\d{4}$/);
		});

		it('should generate invoice with correct snapshots', async () => {
			const invoice = await InvoiceService.generateInvoice(order._id, {
				generatePDF: false,
			});

			expect(invoice.invoiceNumber).toBeDefined();
			expect(invoice.orderId.equals(order._id)).toBe(true);
			expect(invoice.customerId.equals(customer._id)).toBe(true);
			expect(invoice.customerSnapshot.name).toBe('John Doe');
			expect(invoice.itemsSnapshot).toHaveLength(1);
			expect(invoice.totalsSnapshot.subtotal).toBe(1000);
			expect(invoice.status).toBe('generated');
		});

		it('should prevent duplicate active invoices for same order', async () => {
			await InvoiceService.generateInvoice(order._id, { generatePDF: false });

			try {
				await InvoiceService.generateInvoice(order._id, { generatePDF: false });
				fail('Should have thrown error');
			} catch (error: any) {
				expect(error.message).toContain('Active invoice already exists');
			}
		});

		it('should calculate GST correctly for same state', () => {
			const gst = InvoiceService.calculateGST(1000, 'Maharashtra', 'Maharashtra', 18);
			expect(gst.cgst).toBe(90);
			expect(gst.sgst).toBe(90);
			expect(gst.igst).toBe(0);
		});

		it('should calculate GST correctly for different state', () => {
			const gst = InvoiceService.calculateGST(1000, 'Maharashtra', 'Delhi', 18);
			expect(gst.cgst).toBe(0);
			expect(gst.sgst).toBe(0);
			expect(gst.igst).toBe(180);
		});
	});

	describe('Invoice Operations', () => {
		let customer: any;
		let order: any;
		let invoice: any;

		beforeEach(async () => {
			customer = await Customer.create({
				name: 'Jane Smith',
				email: 'jane@example.com',
				phone: '9999999998',
				status: 'active',
				tags: [],
				addresses: [
					{
						id: '1',
						label: 'home',
						name: 'Jane Smith',
						phone: '9999999998',
						pincode: '400001',
						state: 'Maharashtra',
						city: 'Mumbai',
						locality: 'Downtown',
						addressLine1: '456 Oak Ave',
					},
				],
			});

			order = await Order.create({
				orderNumber: 'ORD-002',
				customerId: customer._id,
				items: [
					{
						productId: new mongoose.Types.ObjectId(),
						variantSku: 'SKU-002',
						qty: 1,
						price: 2000,
						subtotal: 2000,
					},
				],
				totals: {
					subtotal: 2000,
					tax: 360,
					discount: 0,
					shipping: 50,
					grandTotal: 2410,
				},
				paymentStatus: 'pending',
				orderStatus: 'confirmed',
				address: {
					recipientName: 'Jane Smith',
					phoneNumber: '9999999998',
					streetAddress: '456 Oak Ave',
					city: 'Mumbai',
					state: 'Maharashtra',
					postalCode: '400001',
					country: 'India',
				},
				timeline: [],
			});

			invoice = await InvoiceService.generateInvoice(order._id, {
				generatePDF: false,
			});
		});

		it('should regenerate invoice with new number', async () => {
			const oldNumber = invoice.invoiceNumber;
			const newInvoice = await InvoiceService.regenerateInvoice(invoice._id);

			expect(newInvoice.invoiceNumber).not.toBe(oldNumber);
			expect(newInvoice.previousInvoiceId.equals(invoice._id)).toBe(true);
			expect(newInvoice.status).toBe('generated');

			// Old invoice should be marked as regenerated
			const oldInvoiceCheck = await Invoice.findById(invoice._id);
			expect(oldInvoiceCheck?.status).toBe('regenerated');
		});

		it('should cancel invoice', async () => {
			const adminId = new mongoose.Types.ObjectId();
			const cancelled = await InvoiceService.cancelInvoice(
				invoice._id,
				'Customer requested cancellation',
				adminId
			);

			expect(cancelled.status).toBe('cancelled');
			expect(cancelled.cancelReason).toBe('Customer requested cancellation');
			expect(cancelled.cancelledBy.equals(adminId)).toBe(true);
		});

		it('should fetch invoice by ID', async () => {
			const fetched = await InvoiceService.getInvoice(invoice._id);
			expect(fetched?.invoiceNumber).toBe(invoice.invoiceNumber);
		});

		it('should fetch invoice by number', async () => {
			const fetched = await InvoiceService.getInvoiceByNumber(invoice.invoiceNumber);
			expect(fetched?._id.equals(invoice._id)).toBe(true);
		});

		it('should verify invoice ownership', async () => {
			const result = await InvoiceService.verifyOwnership(invoice._id, customer._id);
			expect(result).toBe(true);

			const otherId = new mongoose.Types.ObjectId();
			const resultFalse = await InvoiceService.verifyOwnership(invoice._id, otherId);
			expect(resultFalse).toBe(false);
		});

		it('should list invoices with filters', async () => {
			const result = await InvoiceService.listInvoices({
				customerId: customer._id,
				status: 'generated',
			});

			expect(result.invoices).toHaveLength(1);
			expect(result.total).toBe(1);
			expect(result.invoices[0].invoiceNumber).toBe(invoice.invoiceNumber);
		});

		it('should update payment status', async () => {
			const updated = await InvoiceService.updatePaymentStatus(
				invoice._id,
				'paid'
			);
			expect(updated?.paymentStatus).toBe('paid');
		});
	});

	describe('Invoice Timeline Events', () => {
		let customer: any;
		let order: any;

		beforeEach(async () => {
			customer = await Customer.create({
				name: 'Test User',
				email: 'test@example.com',
				phone: '9999999997',
				status: 'active',
				tags: [],
				addresses: [
					{
						id: '1',
						label: 'home',
						name: 'Test User',
						phone: '9999999997',
						pincode: '400001',
						state: 'Maharashtra',
						city: 'Mumbai',
						locality: 'Downtown',
						addressLine1: '789 Elm St',
					},
				],
			});

			order = await Order.create({
				orderNumber: 'ORD-003',
				customerId: customer._id,
				items: [],
				totals: {
					subtotal: 1000,
					tax: 180,
					discount: 0,
					shipping: 0,
					grandTotal: 1180,
				},
				paymentStatus: 'pending',
				orderStatus: 'pending',
				address: {
					recipientName: 'Test User',
					phoneNumber: '9999999997',
					streetAddress: '789 Elm St',
					city: 'Mumbai',
					state: 'Maharashtra',
					postalCode: '400001',
					country: 'India',
				},
				timeline: [],
			});
		});

		it('should add invoice.generated event to order timeline', async () => {
			await InvoiceService.generateInvoice(order._id, { generatePDF: false });

			const updatedOrder = await Order.findById(order._id);
			const timelineEvent = updatedOrder?.timeline.find(
				(e: any) => e.action === 'invoice.generated'
			);

			expect(timelineEvent).toBeDefined();
			expect(timelineEvent?.actor).toBe('system');
			expect(timelineEvent?.meta?.invoiceNumber).toBeDefined();
		});

		it('should add invoice.regenerated event to order timeline', async () => {
			const invoice = await InvoiceService.generateInvoice(order._id, {
				generatePDF: false,
			});
			await InvoiceService.regenerateInvoice(invoice._id);

			const updatedOrder = await Order.findById(order._id);
			const timelineEvent = updatedOrder?.timeline.find(
				(e: any) => e.action === 'invoice.regenerated'
			);

			expect(timelineEvent).toBeDefined();
			expect(timelineEvent?.meta?.newInvoiceNumber).toBeDefined();
		});

		it('should add invoice.cancelled event to order timeline', async () => {
			const invoice = await InvoiceService.generateInvoice(order._id, {
				generatePDF: false,
			});
			await InvoiceService.cancelInvoice(invoice._id, 'Test cancellation');

			const updatedOrder = await Order.findById(order._id);
			const timelineEvent = updatedOrder?.timeline.find(
				(e: any) => e.action === 'invoice.cancelled'
			);

			expect(timelineEvent).toBeDefined();
			expect(timelineEvent?.meta?.reason).toBe('Test cancellation');
		});
	});

	describe('Invoice Security', () => {
		let customer1: any;
		let customer2: any;
		let order: any;
		let invoice: any;

		beforeEach(async () => {
			customer1 = await Customer.create({
				name: 'Customer 1',
				email: 'cust1@example.com',
				phone: '1111111111',
				status: 'active',
				tags: [],
				addresses: [
					{
						id: '1',
						label: 'home',
						name: 'Customer 1',
						phone: '1111111111',
						pincode: '400001',
						state: 'Maharashtra',
						city: 'Mumbai',
						locality: 'Downtown',
						addressLine1: '111 First St',
					},
				],
			});

			customer2 = await Customer.create({
				name: 'Customer 2',
				email: 'cust2@example.com',
				phone: '2222222222',
				status: 'active',
				tags: [],
				addresses: [
					{
						id: '1',
						label: 'home',
						name: 'Customer 2',
						phone: '2222222222',
						pincode: '400001',
						state: 'Maharashtra',
						city: 'Mumbai',
						locality: 'Downtown',
						addressLine1: '222 Second St',
					},
				],
			});

			order = await Order.create({
				orderNumber: 'ORD-SEC-001',
				customerId: customer1._id,
				items: [],
				totals: {
					subtotal: 1000,
					tax: 180,
					discount: 0,
					shipping: 0,
					grandTotal: 1180,
				},
				paymentStatus: 'pending',
				orderStatus: 'pending',
				address: {
					recipientName: 'Customer 1',
					phoneNumber: '1111111111',
					streetAddress: '111 First St',
					city: 'Mumbai',
					state: 'Maharashtra',
					postalCode: '400001',
					country: 'India',
				},
				timeline: [],
			});

			invoice = await InvoiceService.generateInvoice(order._id, {
				generatePDF: false,
			});
		});

		it('should prevent access to other customers invoices', async () => {
			const isOwner = await InvoiceService.verifyOwnership(
				invoice._id,
				customer2._id
			);
			expect(isOwner).toBe(false);
		});

		it('should allow access to own invoices', async () => {
			const isOwner = await InvoiceService.verifyOwnership(
				invoice._id,
				customer1._id
			);
			expect(isOwner).toBe(true);
		});
	});
});
