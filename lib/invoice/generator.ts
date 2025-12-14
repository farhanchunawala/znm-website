import puppeteer from 'puppeteer';

interface Order {
	orderId: string;
	invoiceNumber?: string;
	items: Array<{
		title: string;
		quantity: number;
		size: string;
		price: number;
	}>;
	total: number;
	paymentStatus: string;
	createdAt: string;
	fulfilledAt?: Date;
	shippingInfo: {
		firstName: string;
		lastName: string;
		address: string;
		city: string;
		state: string;
		zipCode: string;
		phone: string;
		email: string;
	};
}

export function generateInvoiceNumber(): string {
	const date = new Date();
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const random = Math.floor(Math.random() * 10000)
		.toString()
		.padStart(4, '0');
	return `INV-${year}${month}-${random}`;
}

export function generateInvoiceHTML(
	order: Order,
	options?: {
		courierName?: string;
		packagingProvider?: 'we' | 'courier';
	}
): string {
	const invoiceDate = order.fulfilledAt
		? new Date(order.fulfilledAt)
		: new Date();
	const invoiceNumber = order.invoiceNumber || generateInvoiceNumber();

	// Calculate subtotal and GST
	const subtotal = order.total;
	const gstRate = 0; // 0% for now, ready for future
	const gstAmount = subtotal * gstRate;
	const grandTotal = subtotal + gstAmount;

	return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Invoice ${invoiceNumber}</title>
    <style>
        @page {
            size: A4;
            margin: 0;
        }
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Helvetica Neue', Arial, sans-serif;
            color: #333;
            line-height: 1.6;
            padding: 40px;
            background: #fff;
        }
        .invoice-header {
            display: flex;
            justify-content: space-between;
            align-items: start;
            margin-bottom: 50px;
            padding-bottom: 30px;
            border-bottom: 3px solid #000;
        }
        .company-logo {
            width: 200px;
        }
        .company-info h1 {
            font-size: 36px;
            font-weight: 700;
            color: #000;
            margin-bottom: 10px;
            letter-spacing: -1px;
        }
        .company-info p {
            font-size: 11px;
            color: #666;
            margin: 2px 0;
        }
        .invoice-meta {
            text-align: right;
        }
        .invoice-meta h2 {
            font-size: 28px;
            color: #000;
            margin-bottom: 10px;
            font-weight: 700;
        }
        .invoice-meta table {
            border-collapse: collapse;
            margin-left: auto;
        }
        .invoice-meta td {
            padding: 4px 0;
            font-size: 12px;
        }
        .invoice-meta td:first-child {
            color: #666;
            padding-right: 15px;
            font-weight: 500;
        }
        .invoice-meta td:last-child {
            font-weight: 600;
            color: #000;
        }
        .payment-badge {
            display: inline-block;
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .payment-badge.prepaid {
            background: #d1fae5;
            color: #065f46;
        }
        .payment-badge.unpaid {
            background: #fee2e2;
            color: #991b1b;
        }
        .billing-shipping {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-bottom: 50px;
        }
        .section h3 {
            font-size: 14px;
            color: #000;
            margin-bottom: 12px;
            text-transform: uppercase;
            letter-spacing: 1px;
            font-weight: 700;
        }
        .section p {
            font-size: 12px;
            line-height: 1.8;
            color: #333;
        }
        .section p strong {
            color: #000;
            font-weight: 600;
        }
        table.items {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 40px;
        }
        table.items thead {
            background: #000;
            color: #fff;
        }
        table.items th {
            padding: 15px 12px;
            text-align: left;
            font-weight: 600;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        table.items th.text-right {
            text-align: right;
        }
        table.items td {
            padding: 15px 12px;
            border-bottom: 1px solid #e5e5e5;
            font-size: 12px;
        }
        table.items td.text-right {
            text-align: right;
        }
        table.items tbody tr:last-child td {
            border-bottom: 2px solid #000;
        }
        table.items .item-name {
            font-weight: 600;
            color: #000;
        }
        .totals-section {
            margin-left: auto;
            width: 350px;
            margin-bottom: 50px;
        }
        .totals-row {
            display: flex;
            justify-content: space-between;
            padding: 12px 0;
            border-bottom: 1px solid #e5e5e5;
            font-size: 13px;
        }
        .totals-row span:first-child {
            color: #666;
            font-weight: 500;
        }
        .totals-row span:last-child {
            font-weight: 600;
            color: #000;
        }
        .totals-row.grand-total {
            border-top: 2px solid #000;
            border-bottom: 3px double #000;
            padding: 20px 0;
            margin-top: 10px;
            font-size: 18px;
        }
        .totals-row.grand-total span {
            font-weight: 700;
            color: #000;
        }
        .gst-note {
            background: #f9fafb;
            padding: 15px;
            border-left: 4px solid #000;
            margin-bottom: 40px;
            font-size: 11px;
            color: #666;
        }
        .footer {
            margin-top: 80px;
            padding-top: 30px;
            border-top: 1px solid #e5e5e5;
            text-align: center;
        }
        .footer p {
            font-size: 11px;
            color: #999;
            margin: 5px 0;
        }
        .footer .company-name {
            font-size: 14px;
            font-weight: 700;
            color: #000;
            margin-bottom: 10px;
        }
        .terms {
            margin-top: 50px;
            padding: 20px;
            background: #f9fafb;
            border-radius: 8px;
        }
        .terms h4 {
            font-size: 12px;
            margin-bottom: 10px;
            color: #000;
            font-weight: 700;
        }
        .terms p {
            font-size: 10px;
            color: #666;
            line-height: 1.6;
        }
    </style>
</head>
<body>
    <div class="invoice-header">
        <div class="company-info">
            <h1>ZOLL & METER</h1>
            <p>Premium Fashion & Tailoring</p>
            <p>Shop no. 10, Abba Apartment</p>
            <p>Jogeshwari West, Mumbai - 400102</p>
            <p>Phone: +91 7718819099</p>
            <p>Email: zollandmeter@gmail.com</p>
        </div>
        <div class="invoice-meta">
            <h2>INVOICE</h2>
            <table>
                <tr>
                    <td>Invoice #:</td>
                    <td>${invoiceNumber}</td>
                </tr>
                <tr>
                    <td>Order #:</td>
                    <td>${order.orderId}</td>
                </tr>
                <tr>
                    <td>Date:</td>
                    <td>${invoiceDate.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
                </tr>
                <tr>
                    <td>Status:</td>
                    <td><span class="payment-badge ${order.paymentStatus}">${order.paymentStatus}</span></td>
                </tr>
            </table>
        </div>
    </div>

    <div class="billing-shipping">
        <div class="section">
            <h3>Bill To</h3>
            <p>
                <strong>${order.shippingInfo.firstName} ${order.shippingInfo.lastName}</strong><br>
                ${order.shippingInfo.address}<br>
                ${order.shippingInfo.city}, ${order.shippingInfo.state} ${order.shippingInfo.zipCode}<br>
                Phone: ${order.shippingInfo.phone}<br>
                Email: ${order.shippingInfo.email}
            </p>
        </div>
        <div class="section">
            <h3>Ship To</h3>
            <p>
                <strong>${order.shippingInfo.firstName} ${order.shippingInfo.lastName}</strong><br>
                ${order.shippingInfo.address}<br>
                ${order.shippingInfo.city}, ${order.shippingInfo.state} ${order.shippingInfo.zipCode}
            </p>
        </div>
    </div>

    <table class="items">
        <thead>
            <tr>
                <th style="width: 50%;">Item Description</th>
                <th style="width: 15%;">Size</th>
                <th style="width: 10%;" class="text-right">Qty</th>
                <th style="width: 12.5%;" class="text-right">Unit Price</th>
                <th style="width: 12.5%;" class="text-right">Amount</th>
            </tr>
        </thead>
        <tbody>
            ${order.items
				.map(
					(item) => `
                <tr>
                    <td class="item-name">${item.title}</td>
                    <td>${item.size}</td>
                    <td class="text-right">${item.quantity}</td>
                    <td class="text-right">₹${item.price.toLocaleString('en-IN')}</td>
                    <td class="text-right">₹${(item.price * item.quantity).toLocaleString('en-IN')}</td>
                </tr>
            `
				)
				.join('')}
        </tbody>
    </table>

    <div class="totals-section">
        <div class="totals-row">
            <span>Subtotal</span>
            <span>₹${subtotal.toLocaleString('en-IN')}</span>
        </div>
        <div class="totals-row">
            <span>GST (${gstRate * 100}%)</span>
            <span>₹${gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div class="totals-row grand-total">
            <span>TOTAL</span>
            <span>₹${grandTotal.toLocaleString('en-IN')}</span>
        </div>
    </div>

    ${
		gstRate === 0
			? `
    <div class="gst-note">
        <strong>Note:</strong> GST is currently not applicable. The GST structure is ready and will be applied as per government regulations when applicable.
    </div>
    `
			: ''
	}

    <div class="terms">
        <h4>Terms & Conditions</h4>
        <p>
            Payment is due within 15 days of invoice date. Please make all payments to Zoll & Meter. 
            For any queries regarding this invoice, please contact us at zollandmeter@gmail.com or call +91 7718819099.
            Thank you for your business!
        </p>
    </div>

    <div class="footer">
        <p class="company-name">ZOLL & METER</p>
        <p>This is a computer-generated invoice and does not require a signature.</p>
        <p>For queries: zollandmeter@gmail.com | +91 7718819099</p>
    </div>
</body>
</html>
    `;
}

export async function generateInvoicePDF(
	order: any,
	options?: {
		courierName?: string;
		packagingProvider?: 'we' | 'courier';
		saveToDatabase?: boolean;
	}
): Promise<{ pdfBuffer: Buffer; invoiceNumber: string }> {
	const browser = await puppeteer.launch({
		headless: true,
		args: ['--no-sandbox', '--disable-setuid-sandbox'],
	});

	try {
		const page = await browser.newPage();

		// Generate invoice number if not exists
		const invoiceNumber = order.invoiceNumber || generateInvoiceNumber();

		const htmlContent = generateInvoiceHTML(order, {
			courierName: options?.courierName,
			packagingProvider: options?.packagingProvider,
		});

		await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

		const pdfBuffer = await page.pdf({
			format: 'A4',
			printBackground: true,
			margin: {
				top: '20mm',
				right: '15mm',
				bottom: '20mm',
				left: '15mm',
			},
		});

		// Save to MongoDB if requested
		if (options?.saveToDatabase) {
			const Invoice = (await import('@/models/InvoiceModel')).default;
			const Customer = (await import('@/models/CustomerModel')).default;

			// Get customer ID
			const customer: any = await Customer.findOne({
				customerId: order.customerId,
			}).lean();

			if (customer) {
				// Set expiry to 3 months from now
				const expiresAt = new Date();
				expiresAt.setMonth(expiresAt.getMonth() + 3);

				// Check if invoice already exists
				const existingInvoice: any = await Invoice.findOne({
					invoiceNumber,
				});

				if (existingInvoice) {
					// Update existing
					existingInvoice.pdfData = pdfBuffer.toString('base64');
					existingInvoice.expiresAt = expiresAt;
					await existingInvoice.save();
				} else {
					// Create new
					await Invoice.create({
						invoiceNumber,
						orderId: order._id,
						customerId: customer._id,
						pdfData: pdfBuffer.toString('base64'),
						expiresAt,
					});
				}
			}
		}

		return { pdfBuffer: Buffer.from(pdfBuffer), invoiceNumber };
	} finally {
		await browser.close();
	}
}

/**
 * Enhanced Invoice HTML Generator with GST Support
 * Used for new invoice system with full tax breakdown
 */
export function generateEnhancedInvoiceHTML(data: {
	orderId: string;
	invoiceNumber: string;
	customerSnapshot: any;
	itemsSnapshot: any[];
	totalsSnapshot: {
		subtotal: number;
		cgst: number;
		sgst: number;
		igst: number;
		totalTax: number;
		discount: number;
		shipping: number;
		grandTotal: number;
	};
	paymentStatus: string;
	paymentMethod?: string;
	createdAt: Date;
}): string {
	const invoiceDate = new Date(data.createdAt);
	const dueDate = new Date(invoiceDate);
	dueDate.setDate(dueDate.getDate() + 30);

	const gstType =
		data.totalsSnapshot.igst > 0
			? 'IGST'
			: data.totalsSnapshot.cgst > 0
				? 'CGST/SGST'
				: 'No GST';

	return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice ${data.invoiceNumber}</title>
    <style>
        @page {
            size: A4;
            margin: 0;
        }
        @media print {
            body {
                margin: 0;
                padding: 0;
            }
            .invoice-container {
                box-shadow: none;
                margin: 0;
            }
        }
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #333;
            background: #f5f5f5;
            padding: 20px;
        }
        .invoice-container {
            background: white;
            max-width: 900px;
            margin: 0 auto;
            padding: 40px;
            box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
        }
        .invoice-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 3px solid #2c3e50;
        }
        .company-info h1 {
            font-size: 32px;
            font-weight: 700;
            color: #2c3e50;
            margin-bottom: 5px;
        }
        .company-info p {
            font-size: 12px;
            color: #7f8c8d;
            margin: 2px 0;
        }
        .invoice-details {
            text-align: right;
        }
        .invoice-details h2 {
            font-size: 28px;
            font-weight: 700;
            color: #2c3e50;
            margin-bottom: 15px;
        }
        .detail-row {
            display: flex;
            justify-content: space-between;
            gap: 30px;
            margin-bottom: 8px;
            font-size: 12px;
        }
        .detail-label {
            color: #7f8c8d;
            font-weight: 500;
            min-width: 80px;
        }
        .detail-value {
            color: #2c3e50;
            font-weight: 600;
        }
        .status-badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .status-badge.paid {
            background: #d4edda;
            color: #155724;
        }
        .status-badge.pending {
            background: #fff3cd;
            color: #856404;
        }
        .status-badge.failed {
            background: #f8d7da;
            color: #721c24;
        }
        .parties-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-bottom: 40px;
        }
        .party {
            font-size: 12px;
        }
        .party h3 {
            font-size: 12px;
            font-weight: 700;
            color: #2c3e50;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .party-content {
            color: #333;
            line-height: 1.8;
        }
        .party-content strong {
            color: #2c3e50;
            font-weight: 600;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
            font-size: 12px;
        }
        .items-table thead {
            background: #2c3e50;
            color: white;
        }
        .items-table th {
            padding: 12px;
            text-align: left;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }
        .items-table th.text-right {
            text-align: right;
        }
        .items-table tbody tr {
            border-bottom: 1px solid #ecf0f1;
        }
        .items-table tbody tr:hover {
            background: #f8f9fa;
        }
        .items-table td {
            padding: 12px;
        }
        .items-table td.text-right {
            text-align: right;
        }
        .item-name {
            font-weight: 600;
            color: #2c3e50;
        }
        .item-sku {
            font-size: 11px;
            color: #95a5a6;
        }
        .totals-section {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 40px;
        }
        .totals-box {
            width: 100%;
            max-width: 400px;
            font-size: 12px;
            border: 1px solid #ecf0f1;
            border-radius: 4px;
            overflow: hidden;
        }
        .total-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 15px;
            border-bottom: 1px solid #ecf0f1;
        }
        .total-row.total-amount {
            background: #f8f9fa;
        }
        .total-row.grand-total {
            background: #2c3e50;
            color: white;
            font-size: 14px;
            font-weight: 700;
            border: none;
            padding: 15px;
        }
        .total-label {
            color: #7f8c8d;
            font-weight: 500;
        }
        .total-row.grand-total .total-label {
            color: white;
        }
        .total-value {
            font-weight: 600;
            color: #2c3e50;
        }
        .total-row.grand-total .total-value {
            color: white;
        }
        .gst-breakdown {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 4px;
            margin-bottom: 30px;
            font-size: 11px;
        }
        .gst-breakdown h4 {
            font-size: 11px;
            font-weight: 700;
            color: #2c3e50;
            margin-bottom: 10px;
        }
        .gst-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 6px;
            color: #555;
        }
        .notes-section {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 4px;
            margin-bottom: 30px;
            font-size: 11px;
            color: #666;
            line-height: 1.6;
        }
        .notes-section h4 {
            font-size: 11px;
            font-weight: 700;
            color: #2c3e50;
            margin-bottom: 8px;
        }
        .footer {
            border-top: 2px solid #ecf0f1;
            padding-top: 20px;
            text-align: center;
            font-size: 11px;
            color: #95a5a6;
        }
        .footer-content {
            margin-bottom: 10px;
        }
        .company-name {
            font-weight: 700;
            color: #2c3e50;
        }
    </style>
</head>
<body>
    <div class="invoice-container">
        <!-- Header -->
        <div class="invoice-header">
            <div class="company-info">
                <h1>ZOLL & METER</h1>
                <p>Premium Fashion & Tailoring</p>
                <p>Shop no. 10, Abba Apartment, Jogeshwari West</p>
                <p>Mumbai - 400102, India</p>
                <p>GST: 27AAAAA0000A1Z5 | Phone: +91 7718819099</p>
                <p>Email: zollandmeter@gmail.com</p>
            </div>
            <div class="invoice-details">
                <h2>INVOICE</h2>
                <div class="detail-row">
                    <span class="detail-label">Invoice #:</span>
                    <span class="detail-value">${data.invoiceNumber}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Order #:</span>
                    <span class="detail-value">${data.orderId}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Invoice Date:</span>
                    <span class="detail-value">${invoiceDate.toLocaleDateString('en-IN')}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Due Date:</span>
                    <span class="detail-value">${dueDate.toLocaleDateString('en-IN')}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Status:</span>
                    <span class="detail-value">
                        <span class="status-badge ${data.paymentStatus.toLowerCase()}">
                            ${data.paymentStatus}
                        </span>
                    </span>
                </div>
            </div>
        </div>

        <!-- Bill To / Ship To -->
        <div class="parties-section">
            <div class="party">
                <h3>Bill To</h3>
                <div class="party-content">
                    <strong>${data.customerSnapshot.name}</strong><br>
                    ${data.customerSnapshot.address.streetAddress}<br>
                    ${data.customerSnapshot.address.city}, ${data.customerSnapshot.address.state} ${data.customerSnapshot.address.postalCode}<br>
                    <br>
                    Phone: ${data.customerSnapshot.phone}<br>
                    Email: ${data.customerSnapshot.email}
                    ${data.customerSnapshot.gstin ? `<br>GSTIN: ${data.customerSnapshot.gstin}` : ''}
                </div>
            </div>
            <div class="party">
                <h3>Ship To</h3>
                <div class="party-content">
                    <strong>${data.customerSnapshot.address.recipientName}</strong><br>
                    ${data.customerSnapshot.address.streetAddress}<br>
                    ${data.customerSnapshot.address.city}, ${data.customerSnapshot.address.state} ${data.customerSnapshot.address.postalCode}
                </div>
            </div>
        </div>

        <!-- Items Table -->
        <table class="items-table">
            <thead>
                <tr>
                    <th style="width: 40%;">Item Description</th>
                    <th style="width: 10%;" class="text-right">Qty</th>
                    <th style="width: 15%;" class="text-right">Unit Price</th>
                    <th style="width: 12%;" class="text-right">Tax %</th>
                    <th style="width: 23%;" class="text-right">Amount</th>
                </tr>
            </thead>
            <tbody>
                ${data.itemsSnapshot
					.map(
						(item: any) => `
                    <tr>
                        <td>
                            <div class="item-name">${item.title}</div>
                            <div class="item-sku">${item.variantSku}</div>
                        </td>
                        <td class="text-right">${item.qty}</td>
                        <td class="text-right">₹${item.unitPrice.toLocaleString('en-IN', {
							minimumFractionDigits: 2,
							maximumFractionDigits: 2,
						})}</td>
                        <td class="text-right">${item.taxRate}%</td>
                        <td class="text-right">₹${item.total.toLocaleString('en-IN', {
							minimumFractionDigits: 2,
							maximumFractionDigits: 2,
						})}</td>
                    </tr>
                `
					)
					.join('')}
            </tbody>
        </table>

        <!-- Totals -->
        <div class="totals-section">
            <div class="totals-box">
                <div class="total-row">
                    <span class="total-label">Subtotal</span>
                    <span class="total-value">₹${data.totalsSnapshot.subtotal.toLocaleString('en-IN', {
						minimumFractionDigits: 2,
						maximumFractionDigits: 2,
					})}</span>
                </div>
                ${
					data.totalsSnapshot.discount > 0
						? `
                <div class="total-row">
                    <span class="total-label">Discount</span>
                    <span class="total-value">-₹${data.totalsSnapshot.discount.toLocaleString('en-IN', {
							minimumFractionDigits: 2,
							maximumFractionDigits: 2,
						})}</span>
                </div>
                `
						: ''
				}
                ${
					data.totalsSnapshot.shipping > 0
						? `
                <div class="total-row">
                    <span class="total-label">Shipping</span>
                    <span class="total-value">₹${data.totalsSnapshot.shipping.toLocaleString('en-IN', {
							minimumFractionDigits: 2,
							maximumFractionDigits: 2,
						})}</span>
                </div>
                `
						: ''
				}
                ${
					data.totalsSnapshot.cgst > 0
						? `
                <div class="total-row">
                    <span class="total-label">CGST (9%)</span>
                    <span class="total-value">₹${data.totalsSnapshot.cgst.toLocaleString('en-IN', {
							minimumFractionDigits: 2,
							maximumFractionDigits: 2,
						})}</span>
                </div>
                `
						: ''
				}
                ${
					data.totalsSnapshot.sgst > 0
						? `
                <div class="total-row">
                    <span class="total-label">SGST (9%)</span>
                    <span class="total-value">₹${data.totalsSnapshot.sgst.toLocaleString('en-IN', {
							minimumFractionDigits: 2,
							maximumFractionDigits: 2,
						})}</span>
                </div>
                `
						: ''
				}
                ${
					data.totalsSnapshot.igst > 0
						? `
                <div class="total-row">
                    <span class="total-label">IGST (18%)</span>
                    <span class="total-value">₹${data.totalsSnapshot.igst.toLocaleString('en-IN', {
							minimumFractionDigits: 2,
							maximumFractionDigits: 2,
						})}</span>
                </div>
                `
						: ''
				}
                <div class="total-row grand-total">
                    <span class="total-label">TOTAL AMOUNT</span>
                    <span class="total-value">₹${data.totalsSnapshot.grandTotal.toLocaleString('en-IN', {
						minimumFractionDigits: 2,
						maximumFractionDigits: 2,
					})}</span>
                </div>
            </div>
        </div>

        <!-- GST Breakdown -->
        ${
			data.totalsSnapshot.cgst > 0 || data.totalsSnapshot.sgst > 0 || data.totalsSnapshot.igst > 0
				? `
        <div class="gst-breakdown">
            <h4>Tax Summary (${gstType})</h4>
            ${
				data.totalsSnapshot.igst > 0
					? `<div class="gst-row"><span>IGST (Integrated GST @ 18%)</span><span>₹${data.totalsSnapshot.igst.toLocaleString('en-IN', {
							minimumFractionDigits: 2,
							maximumFractionDigits: 2,
						})}</span></div>`
					: `
            <div class="gst-row"><span>CGST (Central GST @ 9%)</span><span>₹${data.totalsSnapshot.cgst.toLocaleString('en-IN', {
				minimumFractionDigits: 2,
				maximumFractionDigits: 2,
			})}</span></div>
            <div class="gst-row"><span>SGST (State GST @ 9%)</span><span>₹${data.totalsSnapshot.sgst.toLocaleString('en-IN', {
				minimumFractionDigits: 2,
				maximumFractionDigits: 2,
			})}</span></div>
            `
			}
            <div class="gst-row"><strong><span>Total Tax</span><span>₹${data.totalsSnapshot.totalTax.toLocaleString('en-IN', {
				minimumFractionDigits: 2,
				maximumFractionDigits: 2,
			})}</span></strong></div>
        </div>
        `
				: ''
		}

        <!-- Notes -->
        <div class="notes-section">
            <h4>Payment Terms & Notes</h4>
            <p>
                Thank you for your business! Payment is due within 30 days of invoice date.
                Please make cheques payable to "Zoll & Meter". For online payments, please contact us.
                This is a computer-generated invoice and does not require a signature.
            </p>
        </div>

        <!-- Footer -->
        <div class="footer">
            <div class="footer-content">
                <span class="company-name">ZOLL & METER</span>
            </div>
            <div class="footer-content">
                <p>For queries: zollandmeter@gmail.com | Phone: +91 7718819099</p>
            </div>
            <div class="footer-content" style="margin-top: 10px; border-top: 1px solid #ecf0f1; padding-top: 10px;">
                <p>Invoice generated on: ${invoiceDate.toLocaleString('en-IN')}</p>
            </div>
        </div>
    </div>
</body>
</html>
    `;
}

