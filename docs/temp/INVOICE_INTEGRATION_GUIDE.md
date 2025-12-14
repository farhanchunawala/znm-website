# Invoice System - Integration Guide

## Quick Start (5 minutes)

### 1. Import and Use Service

```typescript
import InvoiceService from '@/lib/services/invoiceService';

// Generate invoice when payment succeeds
async function handlePaymentSuccess(orderId: string, paymentId: string) {
  const invoice = await InvoiceService.generateInvoice(
    new ObjectId(orderId),
    {
      generatePDF: true,
      paymentMethod: 'card',
      paymentId: new ObjectId(paymentId)
    }
  );
  
  console.log(`Invoice created: ${invoice.invoiceNumber}`);
  return invoice;
}
```

### 2. Add to Order Confirmation

```typescript
// In your order confirmation handler (e.g., payment success webhook)
import InvoiceService from '@/lib/services/invoiceService';

async function confirmOrder(orderId: string) {
  // Update order status
  const order = await Order.findByIdAndUpdate(orderId, {
    orderStatus: 'confirmed',
    paymentStatus: 'paid'
  });

  // Auto-generate invoice
  if (order.paymentMethod !== 'cod') {
    await InvoiceService.generateInvoice(new ObjectId(orderId), {
      generatePDF: true
    });
  }
}
```

### 3. Hook into Admin UI

```typescript
// In your admin dashboard or order detail page
import { useInvoices, useInvoiceAction } from '@/lib/invoice/hooks';

export function OrderInvoiceSection({ orderId }: { orderId: string }) {
  const { invoices, fetch } = useInvoices();
  const { downloadPDF } = useInvoiceAction();

  useEffect(() => {
    fetch({ orderId, limit: 1 });
  }, [orderId]);

  return (
    <div>
      {invoices.length > 0 ? (
        <>
          <p>Invoice: {invoices[0].invoiceNumber}</p>
          <button onClick={() => downloadPDF(invoices[0]._id)}>
            Download PDF
          </button>
        </>
      ) : (
        <p>No invoice generated yet</p>
      )}
    </div>
  );
}
```

### 4. Customer Invoice Access

```typescript
// In customer's order details page
import { useCustomerInvoice } from '@/lib/invoice/hooks';

export function CustomerOrderDetail({ orderId }: { orderId: string }) {
  const { invoice, fetch } = useCustomerInvoice(orderId);

  useEffect(() => {
    fetch();
  }, [orderId]);

  if (!invoice) return <p>Invoice not available</p>;

  return (
    <div>
      <h3>Invoice: {invoice.invoiceNumber}</h3>
      <p>Amount: ₹{invoice.totalsSnapshot.grandTotal}</p>
      <a href={`/api/invoices/${invoice._id}/pdf`} target="_blank">
        View PDF
      </a>
    </div>
  );
}
```

---

## Environment Variables

No new env vars required! Uses existing:
- `MONGODB_URI` - for invoice storage
- Auth tokens - existing auth middleware

Optional (future):
```
# For S3 integration
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=invoices

# Company details (can move to DB settings)
COMPANY_STATE=Maharashtra
COMPANY_GSTIN=27AAAAA0000A1Z5
```

---

## API Endpoints Reference

### List Invoices (Admin)
```bash
curl -X GET "http://localhost:3000/api/admin/invoices?status=generated&limit=50" \
  -H "Authorization: Bearer TOKEN"
```

### Create Invoice (Admin)
```bash
curl -X POST "http://localhost:3000/api/admin/invoices" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "orderId": "64a5b8c9d1e2f3g4h5i6j7k8",
    "generatePDF": true
  }'
```

### Get Invoice (Customer)
```bash
curl -X GET "http://localhost:3000/api/invoices/64a5b8c9d1e2f3g4h5i6j7k8" \
  -H "Authorization: Bearer CUSTOMER_TOKEN"
```

### Download PDF (Customer)
```bash
curl -X GET "http://localhost:3000/api/invoices/64a5b8c9d1e2f3g4h5i6j7k8/pdf" \
  -H "Authorization: Bearer CUSTOMER_TOKEN" \
  -o invoice.pdf
```

### View Order Invoice (Customer)
```bash
curl -X GET "http://localhost:3000/api/orders/64a5b8c9d1e2f3g4h5i6j7k8/invoice" \
  -H "Authorization: Bearer CUSTOMER_TOKEN"
```

---

## Integration Points

### 1. Payment Success Handler
```typescript
// lib/services/paymentService.ts or webhook handler

async function handlePaymentSuccess(paymentId: string) {
  const payment = await Payment.findById(paymentId);
  const order = await Order.findById(payment.orderId);

  // Mark payment as paid
  await Payment.findByIdAndUpdate(paymentId, { status: 'paid' });

  // Generate invoice
  await InvoiceService.generateInvoice(order._id, {
    generatePDF: true,
    paymentMethod: 'card',
    paymentId: new ObjectId(paymentId)
  });
}
```

### 2. COD Order Confirmation
```typescript
// When admin confirms COD order

async function confirmCODOrder(orderId: string) {
  const order = await Order.findByIdAndUpdate(orderId, {
    orderStatus: 'confirmed',
    paymentStatus: 'pending'
  });

  // Generate invoice for COD
  await InvoiceService.generateInvoice(order._id, {
    generatePDF: true,
    paymentMethod: 'cod'
  });
}
```

### 3. Admin Panel Navigation
Add to your admin sidebar:
```typescript
{
  label: 'Invoices',
  href: '/admin/invoices',
  icon: '📄',
  roles: ['admin', 'accountant']
}
```

### 4. Order Timeline Display
```typescript
// In order detail view, show invoice events

order.timeline.forEach(event => {
  if (event.action === 'invoice.generated') {
    console.log(`Invoice created: ${event.meta.invoiceNumber}`);
  }
  if (event.action === 'invoice.regenerated') {
    console.log(`New invoice: ${event.meta.newInvoiceNumber}`);
  }
});
```

---

## Testing Integration

### Run Tests
```bash
npm test -- __tests__/invoiceService.test.ts
```

### Manual Testing

1. **Create Order**
   ```bash
   # Create test order via admin
   ```

2. **Generate Invoice**
   ```bash
   curl -X POST http://localhost:3000/api/admin/invoices \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer ADMIN_TOKEN" \
     -d '{"orderId": "ORDER_ID", "generatePDF": true}'
   ```

3. **Download PDF**
   ```bash
   curl -X GET http://localhost:3000/api/invoices/INVOICE_ID/pdf \
     -H "Authorization: Bearer CUSTOMER_TOKEN" \
     -o test-invoice.pdf
   ```

4. **View in Browser**
   - Open `/admin/invoices` to see list
   - Click "PDF" button to download

---

## Database Migration

No migration needed! Schema is self-contained:

```bash
# Just ensure MongoDB is running
# Collections will auto-create on first insert
```

If you want to add invoice tracking to existing orders:
```typescript
// Optional: Add invoiceId to Order schema
// orders.invoiceId = {type: ObjectId, ref: 'Invoice'}
```

---

## Troubleshooting

### Invoice not generating
1. Check order exists in DB
2. Verify no active invoice already exists
3. Look at server logs for errors
4. Test endpoint: `POST /api/admin/invoices`

### PDF download returns 404
1. Check invoice has `pdfData` populated
2. Verify auth token is valid
3. Check user ownership (customer routes)
4. Regenerate invoice if needed

### Tax calculation wrong
1. Verify `order.address.state` is set
2. Check fiscal year calculation
3. Confirm 18% default rate is correct
4. Review test: `calculateGST` in invoiceService.test.ts

### Timeline events not showing
1. Ensure Order collection has `timeline` field
2. Check invoice service calls `Order.findByIdAndUpdate(...timeline)`
3. Verify order fetch includes timeline

---

## Performance Tips

### Optimize Queries
```typescript
// Use lean() for read-only operations
const invoices = await Invoice.find().lean();

// Index on frequently filtered fields
db.invoices.createIndex({ customerId: 1, paymentStatus: 1 });

// Pagination for large lists
const page = 1;
const limit = 50;
const skip = (page - 1) * limit;
```

### Cache PDFs
```typescript
// Set browser cache headers
res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year

// TTL already set at DB level (3 months)
```

### Async PDF Generation
```typescript
// Don't wait for PDF generation
InvoiceService.generateInvoice(orderId, {
  generatePDF: true
  // PDF generates in background
});

// Customer can still view invoice data while PDF renders
```

---

## Next Steps

1. **Test the system** with test invoices
2. **Deploy to production** with database backup
3. **Monitor invoice generation** (check logs)
4. **Gather user feedback** from customers & admins
5. **Plan enhancements**: S3, email delivery, multi-currency, etc.

---

## Support

For issues:
1. Check `docs/INVOICE_SYSTEM_ARCHITECTURE.md`
2. Review test cases: `__tests__/invoiceService.test.ts`
3. Look at hooks: `lib/invoice/hooks.ts`
4. Check API routes: `app/api/admin/invoices/` and `app/api/invoices/`

---

**Ready to integrate?** Start with Step 1 above! 🚀
