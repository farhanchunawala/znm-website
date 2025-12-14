# Invoice System - Quick Reference Card

## 🚀 Quick Start (Copy-Paste Ready)

### 1. Generate Invoice on Payment Success
```typescript
// In your payment success handler
import InvoiceService from '@/lib/services/invoiceService';

const invoice = await InvoiceService.generateInvoice(
  new mongoose.Types.ObjectId(orderId),
  { generatePDF: true }
);

console.log(`Invoice: ${invoice.invoiceNumber}`);
```

### 2. Admin UI - List Invoices
```typescript
// In /admin/invoices page
import { useInvoices } from '@/lib/invoice/hooks';

const { invoices, fetch } = useInvoices();

useEffect(() => {
  fetch({ status: 'generated', limit: 50 });
}, []);

// invoices is ready to display
```

### 3. Customer - Download Invoice
```typescript
// In order detail page
import { useInvoiceAction } from '@/lib/invoice/hooks';

const { downloadPDF } = useInvoiceAction();

<button onClick={() => downloadPDF(invoiceId)}>
  📥 Download Invoice
</button>
```

---

## 📊 Key API Endpoints

### Admin
```bash
# List invoices
GET /api/admin/invoices?status=generated&limit=50

# Create invoice
POST /api/admin/invoices
{ "orderId": "...", "generatePDF": true }

# Regenerate invoice
PATCH /api/admin/invoices/:id
{ "action": "regenerate" }

# Cancel invoice
PATCH /api/admin/invoices/:id
{ "action": "cancel", "reason": "..." }

# Download PDF
GET /api/admin/invoices/:id/pdf
```

### Customer
```bash
# View invoice
GET /api/invoices/:id

# Download PDF
GET /api/invoices/:id/pdf

# Get invoice for order
GET /api/orders/:orderId/invoice
```

---

## 🎯 Main Service Methods

```typescript
import InvoiceService from '@/lib/services/invoiceService';

// Generate
await InvoiceService.generateInvoice(orderId, { generatePDF: true })

// Get
await InvoiceService.getInvoice(invoiceId)
await InvoiceService.getInvoiceByNumber('INV-FY2025-0001')

// List
await InvoiceService.listInvoices({ status: 'generated' })

// Regenerate
await InvoiceService.regenerateInvoice(invoiceId)

// Cancel
await InvoiceService.cancelInvoice(invoiceId, 'Customer request')

// Tax
InvoiceService.calculateGST(1000, 'Maharashtra', 'Delhi')
// { cgst: 0, sgst: 0, igst: 180 }
```

---

## ⚙️ Database Schema (Quick View)

```typescript
Invoice {
  invoiceNumber: string,           // INV-FY2025-0001
  orderId: ObjectId,
  customerId: ObjectId,
  
  customerSnapshot: {
    name, email, phone, address
  },
  itemsSnapshot: [{
    productId, variantSku, qty, unitPrice, subtotal,
    taxRate, taxAmount, total
  }],
  totalsSnapshot: {
    subtotal, cgst, sgst, igst, totalTax,
    discount, shipping, grandTotal
  },
  
  paymentStatus: 'pending|paid|failed|refunded',
  status: 'generated|cancelled|regenerated',
  
  pdfUrl, pdfData,
  createdAt, updatedAt,
  expiresAt  // 3 months TTL
}
```

---

## 🧪 Test Your Setup

```bash
# Run invoice tests
npm test -- __tests__/invoiceService.test.ts

# Test API endpoint
curl -X GET "http://localhost:3000/api/admin/invoices" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Generate test invoice
curl -X POST "http://localhost:3000/api/admin/invoices" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"orderId": "...", "generatePDF": true}'
```

---

## 📁 File Locations

| File | Purpose |
|------|---------|
| `models/InvoiceModel.ts` | Data schema |
| `lib/services/invoiceService.ts` | Business logic |
| `lib/invoice/hooks.ts` | React hooks |
| `lib/invoice/generator.ts` | PDF generation |
| `app/api/admin/invoices/*` | Admin APIs |
| `app/api/invoices/*` | Customer APIs |
| `app/api/orders/:id/invoice/*` | Order invoice API |
| `app/admin/invoices/page.tsx` | Admin UI |
| `__tests__/invoiceService.test.ts` | Tests |
| `docs/INVOICE_SYSTEM_ARCHITECTURE.md` | Full docs |

---

## 🔑 Key Concepts

### Snapshots
Immutable copies of order/customer data at invoice time. Cannot be changed - regenerate to create new invoice.

### Fiscal Year
India format: April-March (INV-FY2025 = April 2024 - March 2025)

### GST Calculation
- **Same State** (Maha → Maha): CGST 9% + SGST 9% = 18%
- **Interstate** (Maha → Delhi): IGST 18%

### Invoice Status
- **generated** - Active invoice
- **cancelled** - Soft deleted
- **regenerated** - Replaced by new invoice

---

## 🐛 Common Issues & Fixes

### Issue: Invoice not generating
**Solution**:
```typescript
// Check order exists and no active invoice
const order = await Order.findById(orderId);
if (!order) throw new Error('Order not found');

const existing = await Invoice.findOne({
  orderId,
  status: 'generated'
});
if (existing) throw new Error('Active invoice exists');
```

### Issue: PDF download 404
**Solution**: Check `pdfData` is populated
```typescript
const invoice = await Invoice.findById(invoiceId);
if (!invoice.pdfData) {
  // Regenerate PDF
  await InvoiceService.generateAndStorePDF(invoiceId);
}
```

### Issue: Wrong tax calculation
**Solution**: Verify state in order address
```typescript
// Check order.address.state is set
const order = await Order.findById(orderId);
console.log(order.address.state); // Should be valid state
```

---

## 📈 Performance Tips

```typescript
// Use lean() for read-only
const invoices = await Invoice.find().lean();

// Pagination for large lists
const page = 1;
const { invoices } = await InvoiceService.listInvoices(
  {},
  { limit: 50, skip: (page - 1) * 50 }
);

// Index on filter fields
await Invoice.collection.createIndex({ customerId: 1, paymentStatus: 1 });
```

---

## 🔐 Security Checklist

- [ ] Verify auth token on all endpoints
- [ ] Check customer ownership: `verifyOwnership(invoiceId, customerId)`
- [ ] Use HTTPS in production
- [ ] Rate limit API endpoints
- [ ] Log all invoice operations
- [ ] Backup database regularly

---

## 📚 Documentation

| Doc | Content |
|-----|---------|
| INVOICE_SYSTEM_ARCHITECTURE.md | Complete architecture (1000+ lines) |
| INVOICE_INTEGRATION_GUIDE.md | Integration examples (300+ lines) |
| INVOICE_IMPLEMENTATION_SUMMARY.md | Summary & checklist |
| This file | Quick reference |

---

## 🚀 Deployment Commands

```bash
# Test everything
npm test -- invoiceService.test.ts

# Deploy to production
npm run build && npm start

# Monitor logs
tail -f /var/log/app.log | grep invoice

# Backup database
mongodump --uri "mongodb://..." -o backup/
```

---

## ✨ Feature Flags (For Future)

```typescript
// Feature: S3 integration
if (process.env.USE_S3 === 'true') {
  // Store PDF in S3 instead of DB
}

// Feature: Email delivery
if (process.env.EMAIL_INVOICES === 'true') {
  // Auto-send PDF to customer
}

// Feature: Multiple invoice templates
const template = process.env.INVOICE_TEMPLATE || 'default';
```

---

## 📞 Support Resources

1. **Need API reference?** → `INVOICE_SYSTEM_ARCHITECTURE.md`
2. **How to integrate?** → `INVOICE_INTEGRATION_GUIDE.md`
3. **Something broken?** → Check "Common Issues & Fixes" above
4. **See code examples?** → Check `__tests__/invoiceService.test.ts`
5. **Query examples?** → Check service methods in this file

---

## ⭐ Pro Tips

1. **Generate PDF async**: Don't wait for PDF to complete
2. **Cache invoice PDFs**: Set 1-year browser cache
3. **Batch operations**: Generate multiple invoices in loop
4. **Monitor generation**: Track time taken for PDFs
5. **Archive old invoices**: Use TTL for auto-cleanup

---

**Version**: 1.0 | **Status**: Production Ready | **Last Updated**: Dec 2025
