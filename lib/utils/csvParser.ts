export interface CSVOrderRow {
    orderId?: string;
    customerId: string;
    customerEmail: string;
    customerPhone: string;
    firstName: string;
    lastName: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    itemTitle: string;
    itemQuantity: number;
    itemSize: string;
    itemPrice: number;
    paymentStatus: 'prepaid' | 'unpaid';
    notes?: string;
}

export function parseCSV(csvContent: string): CSVOrderRow[] {
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) {
        throw new Error('CSV file is empty or invalid');
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const rows: CSVOrderRow[] = [];

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length !== headers.length) {
            console.warn(`Row ${i + 1} has mismatched columns, skipping`);
            continue;
        }

        const row: any = {};
        headers.forEach((header, index) => {
            row[header] = values[index];
        });

        rows.push({
            orderId: row.orderid || row.order_id,
            customerId: row.customerid || row.customer_id,
            customerEmail: row.customeremail || row.customer_email || row.email,
            customerPhone: row.customerphone || row.customer_phone || row.phone,
            firstName: row.firstname || row.first_name,
            lastName: row.lastname || row.last_name,
            address: row.address,
            city: row.city,
            state: row.state,
            zipCode: row.zipcode || row.zip_code || row.zip,
            country: row.country || 'India',
            itemTitle: row.itemtitle || row.item_title || row.item || row.product,
            itemQuantity: parseInt(row.itemquantity || row.item_quantity || row.quantity || '1'),
            itemSize: row.itemsize || row.item_size || row.size || 'M',
            itemPrice: parseFloat(row.itemprice || row.item_price || row.price || '0'),
            paymentStatus: (row.paymentstatus || row.payment_status || 'unpaid').toLowerCase() as 'prepaid' | 'unpaid',
            notes: row.notes,
        });
    }

    return rows;
}

export function validateOrderRow(row: CSVOrderRow): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!row.customerId) errors.push('Customer ID is required');
    if (!row.customerEmail) errors.push('Customer email is required');
    if (!row.firstName) errors.push('First name is required');
    if (!row.lastName) errors.push('Last name is required');
    if (!row.address) errors.push('Address is required');
    if (!row.city) errors.push('City is required');
    if (!row.state) errors.push('State is required');
    if (!row.itemTitle) errors.push('Item title is required');
    if (!row.itemPrice || row.itemPrice <= 0) errors.push('Valid item price is required');
    if (!row.itemQuantity || row.itemQuantity <= 0) errors.push('Valid item quantity is required');

    return {
        valid: errors.length === 0,
        errors,
    };
}

export function groupOrdersByCustomer(rows: CSVOrderRow[]): Map<string, CSVOrderRow[]> {
    const grouped = new Map<string, CSVOrderRow[]>();

    rows.forEach(row => {
        const key = row.orderId || `${row.customerId}-${Date.now()}`;
        if (!grouped.has(key)) {
            grouped.set(key, []);
        }
        grouped.get(key)!.push(row);
    });

    return grouped;
}

export function generateCSVTemplate(): string {
    const headers = [
        'customerId',
        'customerEmail',
        'customerPhone',
        'firstName',
        'lastName',
        'address',
        'city',
        'state',
        'zipCode',
        'country',
        'itemTitle',
        'itemQuantity',
        'itemSize',
        'itemPrice',
        'paymentStatus',
        'notes'
    ];

    const sampleRow = [
        'CUST001',
        'customer@example.com',
        '+919876543210',
        'John',
        'Doe',
        '123 Main Street',
        'Mumbai',
        'Maharashtra',
        '400001',
        'India',
        'Premium Kurta',
        '2',
        'L',
        '2500',
        'prepaid',
        'Gift wrapping required'
    ];

    return [headers.join(','), sampleRow.join(',')].join('\n');
}
