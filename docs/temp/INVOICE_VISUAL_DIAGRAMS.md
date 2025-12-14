# Invoice System - Visual Architecture & Flows

## System Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────┐  │
│  │   Admin Portal   │  │  Customer Portal │  │  Mobile App    │  │
│  │  /admin/invoices │  │  Order Details   │  │  (Future)      │  │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬────────┘  │
│           │                     │                      │           │
└───────────┼─────────────────────┼──────────────────────┼───────────┘
            │                     │                      │
            ├─────────────────────┼──────────────────────┤
            │                     │                      │
┌───────────▼───────────────────────────────────────────▼───────────┐
│                      API LAYER (Next.js)                           │
│                                                                     │
│  ┌─────────────────────────┐    ┌──────────────────────────────┐  │
│  │    ADMIN ENDPOINTS      │    │   CUSTOMER ENDPOINTS         │  │
│  │                         │    │                              │  │
│  │ GET /api/admin/invoices │    │ GET /api/invoices/:id       │  │
│  │ POST /api/admin/        │    │ GET /api/invoices/:id/pdf   │  │
│  │       invoices          │    │ GET /api/orders/:id/invoice │  │
│  │ GET /api/admin/invoices │    │                              │  │
│  │     /:id                │    │                              │  │
│  │ PATCH /api/admin/       │    │ (All protected by Auth)     │  │
│  │       invoices/:id      │    │                              │  │
│  │ DELETE /api/admin/      │    └──────────────────────────────┘  │
│  │        invoices/:id     │                                       │
│  │ GET /api/admin/invoices │    ┌──────────────────────────────┐  │
│  │     /:id/pdf            │    │   PDF ENDPOINTS              │  │
│  │                         │    │                              │  │
│  │ (Protected by Admin     │    │ GET .../pdf (download PDF)  │  │
│  │  Auth Middleware)       │    │                              │  │
│  └────────────┬────────────┘    └──────────────────────────────┘  │
│               │                                                     │
└───────────────┼─────────────────────────────────────────────────────┘
                │
┌───────────────▼─────────────────────────────────────────────────────┐
│                    SERVICE LAYER (Business Logic)                    │
│                                                                       │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                  InvoiceService                               │  │
│  │                                                                │  │
│  │  ┌──────────────────┐  ┌──────────────────┐                 │  │
│  │  │  Generation      │  │  Operations      │                 │  │
│  │  │  ─────────────   │  │  ────────────    │                 │  │
│  │  │• generateInvoice │  │• regenerate      │                 │  │
│  │  │• invoiceNumber   │  │• cancel          │                 │  │
│  │  │• buildSnapshots  │  │• updateStatus    │                 │  │
│  │  │• generatePDF     │  │                  │                 │  │
│  │  └──────────────────┘  └──────────────────┘                 │  │
│  │                                                                │  │
│  │  ┌──────────────────┐  ┌──────────────────┐                 │  │
│  │  │  Retrieval       │  │  Tax Calculation │                 │  │
│  │  │  ────────────    │  │  ──────────────  │                 │  │
│  │  │• getInvoice      │  │• calculateGST    │                 │  │
│  │  │• getByNumber     │  │• CGST/SGST/IGST  │                 │  │
│  │  │• listInvoices    │  │• State detection │                 │  │
│  │  │• verifyOwnership │  │                  │                 │  │
│  │  └──────────────────┘  └──────────────────┘                 │  │
│  │                                                                │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                       │
└──────────────┬──────────────────────────┬──────────────────┬────────┘
               │                          │                  │
        ┌──────▼────────┐        ┌────────▼────────┐  ┌──────▼──────┐
        │                │        │                 │  │              │
        ▼                ▼        ▼                 ▼  ▼              ▼
     ┌────────────┐  ┌────────────────┐  ┌──────────────────┐  ┌──────────┐
     │  MongoDB   │  │ PDF Generator  │  │   Order Model    │  │  Hooks   │
     │ Invoices   │  │  (Puppeteer)   │  │   Timeline       │  │  (React) │
     │ Collection │  │  (A4, HTML)    │  │   Events         │  │          │
     └────────────┘  └────────────────┘  └──────────────────┘  └──────────┘
```

---

## Invoice Generation Flow Diagram

```
START: Order Confirmed OR Payment Success
│
├─────────────────────────────────────────────────────────┐
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │ VALIDATION PHASE                                 │  │
│  └──────────────────────────────────────────────────┘  │
│  │                                                       │
│  ├─ Order exists? ✓                                    │
│  ├─ No active invoice for order? ✓                    │
│  └─ Payment status correct? ✓                         │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │ GENERATION PHASE                                 │  │
│  └──────────────────────────────────────────────────┘  │
│  │                                                       │
│  ├─ Generate sequential invoice number                │
│  │  INV-FY2025-0001, 0002, ...                       │
│  │                                                      │
│  ├─ Build CUSTOMER SNAPSHOT                          │
│  │  ├─ Name, Email, Phone                            │
│  │  ├─ GSTIN (if applicable)                         │
│  │  └─ Address from Order                            │
│  │                                                      │
│  ├─ Build ITEMS SNAPSHOT                             │
│  │  ├─ Product ID, SKU                               │
│  │  ├─ Quantity, Unit Price                          │
│  │  ├─ Subtotal (qty × price)                        │
│  │  ├─ Tax Rate (18%)                                │
│  │  ├─ Tax Amount (calculated)                       │
│  │  └─ Total (subtotal + tax)                        │
│  │                                                      │
│  ├─ Build TOTALS SNAPSHOT                            │
│  │  ├─ Subtotal                                       │
│  │  ├─ GST Calculation:                              │
│  │  │  ├─ If same state: CGST 9% + SGST 9%         │
│  │  │  └─ If different: IGST 18%                    │
│  │  ├─ Discount, Shipping                            │
│  │  └─ Grand Total                                    │
│  │                                                      │
│  └─ Store INVOICE RECORD in MongoDB                  │
│     {                                                  │
│       invoiceNumber,                                  │
│       orderId, customerId,                           │
│       customerSnapshot,                              │
│       itemsSnapshot,                                 │
│       totalsSnapshot,                                │
│       pdfUrl, pdfData,                               │
│       status: 'generated'                            │
│     }                                                 │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │ PDF GENERATION PHASE (Async)                     │  │
│  └──────────────────────────────────────────────────┘  │
│  │                                                       │
│  ├─ Render HTML template with invoice data           │
│  ├─ Puppeteer launches headless browser              │
│  ├─ Generate PDF (A4 format, 20mm margins)           │
│  ├─ Encode PDF to Base64                             │
│  ├─ Store in MongoDB pdfData field                   │
│  └─ Set pdfUrl = /api/invoices/{id}/pdf            │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │ AUDIT PHASE                                       │  │
│  └──────────────────────────────────────────────────┘  │
│  │                                                       │
│  └─ Add Timeline Event to Order                      │
│     {                                                  │
│       actor: 'system',                               │
│       action: 'invoice.generated',                   │
│       meta: {                                         │
│         invoiceNumber,                               │
│         invoiceId                                    │
│       }                                              │
│     }                                                 │
│                                                        │
└─────────────────────────────────────────────────────┘
│
└─────► RETURN INVOICE OBJECT
        │
        └─► Invoice created: INV-FY2025-0001
```

---

## Regeneration Flow Diagram

```
CUSTOMER/ADMIN REQUESTS REGENERATION
│
├─ Find old invoice (status='generated')
│
├─ Mark old invoice:
│  └─ status = 'regenerated'
│     regeneratedAt = NOW
│
├─ Create NEW invoice:
│  ├─ Generate NEW invoice number
│  ├─ Same customer/order
│  ├─ Same snapshots (from old invoice)
│  ├─ status = 'generated'
│  └─ previousInvoiceId = old_invoice_id
│
├─ Generate PDF for new invoice
│
├─ Add Timeline Event:
│  └─ action: 'invoice.regenerated'
│     meta: {
│       oldInvoiceNumber,
│       newInvoiceNumber
│     }
│
└─ Return NEW invoice
   │
   └─ Old invoice archived, new one active
```

---

## Tax Calculation Diagram

```
                    ╔═════════════════════════════════════════════════════╗
                    ║         TAX CALCULATION LOGIC                       ║
                    ╚═════════════════════════════════════════════════════╝

                                        │
                                        ▼
                ┌───────────────────────────────────────────────┐
                │ Check: Company State = Customer State?       │
                └───────────────────────────────────────────────┘
                                        │
                        ┌───────────────┴───────────────┐
                        │                               │
                    YES │                               │ NO
                        ▼                               ▼
        ┌──────────────────────────────┐   ┌──────────────────────────┐
        │    SAME STATE (Intra-State)  │   │  DIFFERENT STATE (Inter)  │
        └──────────────────────────────┘   └──────────────────────────┘
                        │                               │
                        ▼                               ▼
        ┌──────────────────────────────┐   ┌──────────────────────────┐
        │  Subtotal: ₹1,000            │   │  Subtotal: ₹1,000        │
        │  CGST (9%):  ₹90             │   │  IGST (18%): ₹180       │
        │  SGST (9%):  ₹90             │   │                          │
        │  Total Tax:  ₹180            │   │  Total Tax:  ₹180       │
        │  Grand Total: ₹1,180         │   │  Grand Total: ₹1,180    │
        └──────────────────────────────┘   └──────────────────────────┘
                        │                               │
                        │     (Both produce same       │
                        │      total tax amount)       │
                        └───────────────┬───────────────┘
                                        │
                                        ▼
                            INVOICE TOTAL CALCULATION
                            │
                            ├─ Subtotal
                            ├─ GST (CGST+SGST or IGST)
                            ├─ Shipping
                            ├─ Discount
                            └─ GRAND TOTAL
```

---

## API Request/Response Flow

```
┌──────────────────────────────────┐
│  CLIENT REQUEST                  │
│  POST /api/admin/invoices        │
│  {                               │
│    orderId: "...",               │
│    generatePDF: true             │
│  }                               │
└────────────┬─────────────────────┘
             │
             ▼
┌──────────────────────────────────┐
│  API ROUTE HANDLER               │
│  app/api/admin/invoices/route.ts │
│  1. Verify Auth                  │
│  2. Validate Input               │
│  3. Call Service                 │
└────────────┬─────────────────────┘
             │
             ▼
┌──────────────────────────────────┐
│  SERVICE LOGIC                   │
│  InvoiceService.generateInvoice()│
│  1. Validate Order               │
│  2. Generate Number              │
│  3. Build Snapshots              │
│  4. Create Record                │
│  5. Generate PDF                 │
│  6. Add Timeline Event           │
└────────────┬─────────────────────┘
             │
             ▼
┌──────────────────────────────────┐
│  DATABASE                        │
│  MongoDB invoices Collection     │
│  1. Save Invoice Doc             │
│  2. Update Order Timeline        │
└────────────┬─────────────────────┘
             │
             ▼
┌──────────────────────────────────┐
│  API RESPONSE                    │
│  Status: 201 Created             │
│  {                               │
│    _id: "...",                   │
│    invoiceNumber: "INV-...",     │
│    orderId: "...",               │
│    pdfUrl: "/api/invoices/.../pdf",
│    totalsSnapshot: { ... },      │
│    status: "generated"           │
│  }                               │
└────────────┬─────────────────────┘
             │
             ▼
┌──────────────────────────────────┐
│  CLIENT RECEIVES RESPONSE        │
│  Display Success Message         │
│  Show Invoice Number             │
│  Enable Download Button          │
└──────────────────────────────────┘
```

---

## Data Snapshot Concept

```
ORDER AT TIME OF CREATION          INVOICE AT TIME OF GENERATION
│                                  │
├─ orderId: ORD-001                ├─ invoiceNumber: INV-FY2025-0001
├─ customerId: CUST-123            ├─ orderId: ORD-001
├─ items: [                        ├─ customerId: CUST-123
│  {                               │
│    productId: PROD-X,            ├─ customerSnapshot: {
│    qty: 2,                       │    name: "John Doe",
│    price: 500,                   │    email: "john@example.com",
│    subtotal: 1000                │    address: {...}  ◄── FROZEN
│  }                               │  }
│]                                 │
│                                  ├─ itemsSnapshot: [{
├─ totals: {                        │    productId: PROD-X,
│  subtotal: 1000,                 │    qty: 2,
│  tax: 180,                        │    price: 500,
│  shipping: 100,                   │    subtotal: 1000,
│  discount: 0,                     │    taxRate: 18,
│  grandTotal: 1280                 │    taxAmount: 180,
│}                                  │    total: 1180  ◄── FROZEN
│                                  │  }]
├─ address: {                       │
│  recipientName: "John Doe",       ├─ totalsSnapshot: {
│  city: "Mumbai",                  │    subtotal: 1000,
│  state: "Maharashtra"             │    cgst: 90,
│}                                  │    sgst: 90,
│                                  │    totalTax: 180,
│                                  │    shipping: 100,
│                                  │    grandTotal: 1280  ◄── FROZEN
│                                  │  }
│                                  │
│                                  ├─ status: "generated"
│                                  ├─ pdfUrl: "/api/invoices/ID/pdf"
│                                  └─ createdAt: 2025-12-13 10:30:00
│
│  (Can be modified)               │  (Immutable - regenerate instead)
```

---

## Security Flow Diagram

```
┌─────────────────────────────────────┐
│   API REQUEST WITH AUTH TOKEN       │
│   GET /api/invoices/:id             │
│   Headers: { Authorization: "..." } │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│   VERIFY AUTHENTICATION              │
│   1. Extract token                   │
│   2. Decode JWT                      │
│   3. Get customerId                  │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│   VERIFY AUTHORIZATION               │
│   Check role (admin vs customer)     │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│   FETCH INVOICE FROM DB              │
└────────────┬────────────────────────┘
             │
             ▼
        ┌────────────────────────────┐
        │ Ownership Check            │
        │ if (customer route) {      │
        │   verify:                  │
        │   invoice.customerId       │
        │   === user.customerId      │
        │ }                          │
        └────────────┬───────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
    PASS│                        │FAIL
        ▼                        ▼
   RETURN                   RETURN 403
   INVOICE                  FORBIDDEN
```

---

## Database Index Strategy

```
INVOICE COLLECTION INDEXES

┌─ PRIMARY KEY (Unique)
│  └─ _id (MongoDB default)
│
├─ UNIQUE CONSTRAINT
│  └─ invoiceNumber: unique=true
│     Usage: Fast lookup by invoice number
│
├─ COMPOSITE UNIQUE
│  └─ { orderId: 1, status: 1 }
│     Filter: status='generated'
│     Usage: Ensure max 1 active invoice per order
│
├─ QUERY PERFORMANCE
│  ├─ { customerId: 1, paymentStatus: 1 }
│  │  Usage: Customer invoices, filter by payment
│  │
│  └─ { createdAt: -1 }
│     Usage: Pagination, recent first
│
└─ TTL (Time-To-Live)
   └─ { expiresAt: 1 }
      expireAfterSeconds: 0
      Usage: Auto-delete after 3 months
```

---

## PDF Generation Pipeline

```
INVOICE DATA
    │
    ▼
┌─────────────────────────────────────┐
│ ENHANCE INVOICE HTML GENERATOR      │
│ generateEnhancedInvoiceHTML()       │
│                                      │
│ Input: Invoice Data                 │
│ Output: HTML String                 │
│                                      │
│ ├─ Company Info (Zoll & Meter)     │
│ ├─ Invoice Details                  │
│ ├─ Bill To / Ship To                │
│ ├─ Item Table with Tax              │
│ ├─ Totals Section                   │
│ ├─ GST Breakdown                    │
│ ├─ Terms & Conditions               │
│ └─ Footer                           │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ PUPPETEER RENDERING                 │
│ generateInvoicePDF()                │
│                                      │
│ 1. Launch Chrome (headless)        │
│ 2. Create new page                  │
│ 3. Set HTML content                 │
│ 4. Wait for network idle            │
│ 5. Generate PDF (A4 size)          │
│ 6. Close browser                    │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ PDF BUFFER                          │
│ Raw PDF bytes                       │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ ENCODE TO BASE64                    │
│ String format for storage           │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ STORE IN MONGODB                    │
│ invoice.pdfData = base64String      │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ DOWNLOAD ENDPOINT                   │
│ GET /api/invoices/:id/pdf           │
│                                      │
│ 1. Fetch invoice                    │
│ 2. Decode base64 to buffer          │
│ 3. Set response headers             │
│ 4. Send PDF to client               │
│ 5. Browser downloads file           │
└─────────────────────────────────────┘
```

---

## Complete Invoice Lifecycle

```
┌────────────────────────────────────────────────────────────┐
│                  INVOICE LIFECYCLE                         │
└────────────────────────────────────────────────────────────┘

STAGE 1: GENERATION
│
├─ Trigger: Order confirmed (COD) OR Payment success
├─ Service: InvoiceService.generateInvoice()
├─ Status: 'generated'
├─ PDF: Generated and stored
└─ Timeline: 'invoice.generated' event added
  
STAGE 2: ACTIVE USE
│
├─ Admin can: View, download PDF, regenerate, cancel
├─ Customer can: View, download PDF
├─ Status: 'generated' (active)
├─ TTL: Expires in 3 months
└─ Accessible: Via API endpoints

STAGE 3: REGENERATION (Optional)
│
├─ Reason: Correction, update, reprint
├─ Service: InvoiceService.regenerateInvoice()
├─ Old Status: 'regenerated'
├─ New Status: 'generated'
├─ Link: previousInvoiceId → old invoice
├─ Timeline: 'invoice.regenerated' event added
└─ Result: New invoice number created

STAGE 4: CANCELLATION (Optional)
│
├─ Reason: Customer request, error, duplicate
├─ Service: InvoiceService.cancelInvoice()
├─ Status: 'cancelled'
├─ Link: cancelledBy (user ID), cancelReason
├─ Timeline: 'invoice.cancelled' event added
└─ Result: No longer active, archived

STAGE 5: CLEANUP
│
├─ TTL Index: Deletes after 3 months (180 days)
├─ Manual: Admin can export before deletion
├─ Storage: PDF remains until expiration
└─ Audit: Timeline preserved in Order
```

---

**Visual Diagrams Version**: 1.0  
**Last Updated**: December 13, 2025  
**Status**: Complete & Accurate
