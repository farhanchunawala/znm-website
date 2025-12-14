# INVENTORY SYSTEM - ANTIGRAVITY PROMPT #6

## Executive Summary

A **production-grade, atomic inventory engine** for ecommerce platforms with real-time stock tracking, reservations, batch/lot management, safe concurrent updates, and complete order integration.

**Core Formula:**
```
available = stockOnHand - reserved
```

**One-line Summary:**
A reliable, atomic inventory system handling stock-on-hand, reserved stock, batches, and safe updates tied to orders.

---

## 1. SYSTEM OVERVIEW

### Purpose
Manage product inventory across multiple variants and warehouses while preventing overselling through atomic database operations. Support real-time reservations, payment workflows, and batch tracking.

### Key Features
- **Atomic Operations**: Prevent race conditions with MongoDB conditional queries
- **Reservations**: Hold stock for 30+ minutes or until payment timeout
- **Batch/Lot Tracking**: FIFO picking with expiry dates
- **Multi-Location**: Support warehouse/multi-location operations
- **Audit Trail**: Complete transaction history for compliance
- **Low-Stock Alerts**: Automatic threshold monitoring
- **Background Jobs**: Auto-release stuck reservations

---

## 2. DATA MODELS

### Inventory Schema

```typescript
interface IInventory {
  _id: ObjectId;
  productId: ObjectId;                    // Reference to product
  variantSku: string;                     // Unique SKU (indexed)
  stockOnHand: number;                    // Total physical stock
  reserved: number;                       // Reserved by orders
  batches: Batch[];                       // Lot/batch details (FIFO)
  lowStockThreshold: number;              // Alert level
  locationId?: string;                    // Warehouse/location
  audit: AuditEntry[];                    // Immutable log
  createdAt: Date;
  updatedAt: Date;
}

interface Batch {
  batchId: string;                        // Unique lot identifier
  qty: number;                            // Quantity in batch
  receivedAt: Date;                       // When received
  expiry?: Date;                          // Optional expiration
  location?: string;                      // Shelf/bin location
  supplier?: string;                      // Supplier reference
}

interface AuditEntry {
  action: 'reserve' | 'release' | 'commit' | 'adjust' | 'batch-add' | 'batch-remove';
  qty: number;
  actor: string;
  timestamp: Date;
  metadata?: {
    orderId?: string;
    reason?: string;
    batchId?: string;
    beforeStock?: number;
    afterStock?: number;
  };
}
```

### Indexes

| Index | Purpose |
|-------|---------|
| `variantSku` (unique) | Fast lookup by SKU |
| `productId` | Find variants of product |
| `productId + locationId` | Multi-warehouse queries |
| `available + lowStockThreshold` | Low-stock monitoring |
| `batches.expiry` | Expiry tracking |
| `audit.timestamp` | Audit queries (compliance) |

---

## 3. API ROUTES

### Core Endpoints

#### List Inventories
```
GET /api/inventory?productId=xxx&locationId=warehouse-a&skip=0&limit=20
Response: { success: true, data: [{ _id, variantSku, stockOnHand, reserved, available, batches, ... }] }
```

#### Get Single Inventory
```
GET /api/inventory/:id
Response: { success: true, data: { _id, variantSku, stockOnHand, reserved, available, batches, lowStockThreshold, isLowStock, auditCount, ... } }
```

#### Create Inventory
```
POST /api/inventory
Body: {
  productId: string,
  variantSku: string,
  stockOnHand?: number,
  lowStockThreshold?: number,
  locationId?: string
}
Response: { success: true, data: { _id, variantSku, ... } }
Status: 201
```

#### ATOMIC: Reserve Stock
```
POST /api/inventory/reserve
Body: {
  variantSku: string,
  qty: number,
  orderId: string,
  actor?: string
}
Response on success: { success: true, data: { inventoryId, available, reserved, ... } }
Response on failure: {
  success: false,
  error: {
    code: "INSUFFICIENT_STOCK",
    message: "...",
    details: { available: number, requested: number }
  }
}
```

**How it works atomically:**
```typescript
const result = await InventoryModel.findOneAndUpdate(
  {
    variantSku,
    $expr: { $gte: [{ $subtract: ['$stockOnHand', '$reserved'] }, qty] }  // Condition
  },
  {
    $inc: { reserved: qty },
    $push: { audit: { action: 'reserve', qty, ... } }
  },
  { new: true }
);
// Returns null if condition fails → INSUFFICIENT_STOCK error
```

#### Release Reservation
```
POST /api/inventory/release
Body: {
  inventoryId: string,
  qty: number,
  orderId: string,
  actor?: string
}
Response: { success: true, data: { inventoryId, available, reserved, ... } }
```

#### Commit Stock (Payment Success)
```
POST /api/inventory/commit
Body: {
  inventoryId: string,
  qty: number,
  orderId: string,
  actor?: string
}
Response: { success: true, data: { inventoryId, stockOnHand, reserved, available, ... } }

Stock Changes:
  Before: stockOnHand = 100, reserved = 30
  Commit 30:
  After:  stockOnHand = 70, reserved = 0
```

#### Adjust Stock (Manual)
```
PATCH /api/inventory/:id/adjust
Body: {
  qty: number,           // Positive (add) or negative (remove)
  reason: string,        // Required for audit
  actor: string          // User ID
}
Response: { success: true, data: { stockOnHand, adjustment: { qty, reason, timestamp }, ... } }

Reasons: "Return from customer", "Damage writeoff", "Shrinkage", "Correction", etc.
```

#### Add Batch
```
POST /api/inventory/:id/batch
Body: {
  batch: {
    batchId: string,
    qty: number,
    receivedAt: ISO timestamp,
    expiry?: ISO timestamp,
    location?: string,
    supplier?: string
  },
  actor?: string
}
Response: { success: true, data: { _id, stockOnHand, batchAdded: { ... }, totalBatches, ... } }
Status: 201

stockOnHand increases by batch.qty
```

#### Get Batches
```
GET /api/inventory/:id/batch?expiring=false
Response: { success: true, data: { variantSku, totalBatches, batches: [...] } }

expiring=true: Only returns batches expiring within 30 days
```

#### Low-Stock Report
```
GET /api/inventory/low-stock?skip=0&limit=50&locationId=warehouse-a
Response: {
  success: true,
  data: {
    total: number,
    critical: number,     // available = 0
    low: number,          // available <= threshold
    items: [
      {
        _id, variantSku, available, reserved, stockOnHand,
        lowStockThreshold, status: "critical" | "low"
      }
    ],
    pagination: { skip, limit, hasMore }
  }
}
```

---

## 4. SERVICE LAYER (15 Functions)

### Inventory Creation
```typescript
createInventory(productId, variantSku, initialStock?, lowStockThreshold?)
→ IInventory | throws ValidationError
```

### Stock Retrieval
```typescript
getInventoryById(inventoryId) → IInventory
getInventoryBySku(variantSku) → IInventory
getInventoriesByProduct(productId, locationId?) → IInventory[]
getAvailableStock(inventoryId) → number
```

### ATOMIC Operations
```typescript
// Reserve: Can reserve if available >= qty
reserveStock(variantSku, qty, orderId, actor?) → IInventory | throws ValidationError

// Release: Restore reserved to available
releaseReservedStock(inventoryId, qty, orderId, actor?) → IInventory

// Commit: Reduce both reserved and stockOnHand when payment succeeds
commitReservedStock(inventoryId, qty, orderId, actor?) → IInventory | throws ValidationError
```

### Stock Adjustments
```typescript
// Add or remove stock (returns, damage, corrections)
adjustStock(inventoryId, qtyDelta, reason, actor) → IInventory | throws ValidationError
```

### Batch Management
```typescript
addBatch(inventoryId, batch, actor?) → IInventory
removeBatch(inventoryId, batchId, qty, actor?) → IInventory
getOldestBatch(inventoryId) → Batch | null  // FIFO picking
getExpiringBatches(inventoryId, expiryDate?) → Batch[]
```

### Low-Stock & Reporting
```typescript
getLowStockReport(skip?, limit?, locationId?) → { total, items: [{_id, variantSku, available, status}] }
getAuditHistory(inventoryId, limit?) → AuditEntry[]
getInventorySummary(productId) → { totalSkus, totalStock, totalReserved, totalAvailable, variants }
updateLowStockThreshold(inventoryId, threshold) → IInventory
```

---

## 5. CORE BUSINESS LOGIC

### Stock Formula
```
available = stockOnHand - reserved
isLowStock = available <= lowStockThreshold
isCritical = available === 0
```

### Reserve → Release → Commit Flows

#### Flow 1: Successful Order
```
1. Customer adds to cart → reserveStock(sku, 10, order-123)
   stockOnHand: 100, reserved: 0 → reserved: 10
   available: 90

2. Payment succeeds → commitReservedStock(inv, 10, order-123)
   stockOnHand: 100, reserved: 10 → stockOnHand: 90, reserved: 0
   available: 90 (physical stock reduced)

3. Audit trail: [{ action: 'reserve', qty: 10, metadata: { orderId: 'order-123' } }, 
                 { action: 'commit', qty: 10, metadata: { orderId: 'order-123' } }]
```

#### Flow 2: Abandoned Cart / Timeout
```
1. Customer reserves → reserveStock(sku, 10, order-123)
   reserved: 10

2. 30 mins pass, payment timeout → releaseReservedStock(inv, 10, order-123)
   reserved: 10 → reserved: 0
   available: 100 (stock restored)

3. Audit trail: [{ action: 'reserve', ... }, { action: 'release', ... }]
```

#### Flow 3: Return / Refund
```
1. Order committed, stock deducted
   stockOnHand: 90

2. Customer returns item → adjustStock(inv, +10, "Return from customer", admin)
   stockOnHand: 90 → stockOnHand: 100

3. Audit: [{ action: 'adjust', qty: 10, metadata: { reason: 'Return from customer' } }]
```

### Atomic Reservation (Oversell Prevention)

**Problem:** Race condition with concurrent reservations
```
Initial: stockOnHand=100, reserved=0, available=100

Request 1: Reserve 60 ✓
Request 2: Reserve 60 ✓  (Race condition - both succeed, total reserved=120!)
Result: Oversold by 20
```

**Solution:** Atomic conditional update
```typescript
await InventoryModel.findOneAndUpdate(
  {
    variantSku,
    $expr: { $gte: [{ $subtract: ['$stockOnHand', '$reserved'] }, requestedQty] }
  },
  { $inc: { reserved: requestedQty } },
  { new: true }
);
// If condition fails, returns null → ValidationError
```

With atomic operation:
```
Request 1: atomically check available >= 60, then reserve
  Query matches, update succeeds, returns new document ✓
  
Request 2: atomically check available >= 60 (but now available=40)
  Query doesn't match (40 < 60), returns null ✗
  Throw INSUFFICIENT_STOCK error
```

### Batch Management (FIFO)

Batches are stored in array order (oldest first):
```
Initial: batches = [
  { batchId: 'LOT-001', qty: 50, receivedAt: '2025-10-01' },
  { batchId: 'LOT-002', qty: 50, receivedAt: '2025-10-15' }
]
stockOnHand = 100

When committing 60 units:
1. Use from LOT-001: 50 units (oldest)
2. Use from LOT-002: 10 units (next oldest)
3. Result: batches = [{ batchId: 'LOT-002', qty: 40, ... }]

Note: In practice, batch deduction is tracked separately.
The stockOnHand just decrements; FIFO logic is for reporting/picking.
```

---

## 6. VALIDATION & ERROR HANDLING

### Validation Rules

| Rule | Error Code | Message |
|------|-----------|---------|
| qty must be positive for reserve/commit | INVALID_QUANTITY | "Reservation quantity must be positive" |
| Cannot reserve > available | INSUFFICIENT_STOCK | "Insufficient stock for SKU..." |
| Cannot commit > reserved | INSUFFICIENT_RESERVED | "Cannot commit X. Only Y reserved." |
| Cannot adjust to negative stock | NEGATIVE_STOCK | "Would result in negative stock" |
| SKU must be unique | SKU_DUPLICATE | "SKU already exists" |
| Batch ID must be unique per inventory | BATCH_DUPLICATE | "Batch already exists" |
| Cannot remove more from batch than exists | INVALID_QUANTITY | "Cannot remove X from batch with Y" |
| Inventory not found | INVENTORY_NOT_FOUND | "Inventory not found" |
| Reason required for adjustments | VALIDATION_ERROR | "Reason is required" |

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "Insufficient stock for SKU: KRT-XL-BLU. Available: 5, Requested: 10",
    "details": {
      "available": 5,
      "requested": 10,
      "sku": "KRT-XL-BLU"
    },
    "statusCode": 400
  },
  "timestamp": "2025-12-11T10:30:00Z"
}
```

---

## 7. CODE EXAMPLES

### Example 1: Reserve Stock (Atomic)

```typescript
// In: POST /api/inventory/reserve
const body = await req.json();
const { variantSku, qty, orderId } = body;

const inventory = await inventoryService.reserveStock(
  variantSku,
  qty,
  orderId,
  'user-123'
);

// Service function (atomic):
export async function reserveStock(variantSku, qty, orderId, actor = 'system') {
  const result = await InventoryModel.findOneAndUpdate(
    {
      variantSku: variantSku.toUpperCase(),
      $expr: { $gte: [{ $subtract: ['$stockOnHand', '$reserved'] }, qty] }
    },
    {
      $inc: { reserved: qty },
      $push: { audit: { action: 'reserve', qty, actor, timestamp: new Date(), metadata: { orderId } } }
    },
    { new: true }
  );

  if (!result) {
    const inventory = await InventoryModel.findOne({ variantSku });
    if (!inventory) {
      throw new ValidationError('INVENTORY_NOT_FOUND', `No inventory for SKU: ${variantSku}`);
    }
    throw new ValidationError(
      'INSUFFICIENT_STOCK',
      `Available: ${inventory.getAvailable()}, Requested: ${qty}`
    );
  }

  return result;
}
```

### Example 2: Commit Stock on Payment Success

```typescript
// In order service, after payment confirmation:
const inventory = await inventoryService.commitReservedStock(
  inventoryId,
  orderLineItem.qty,
  orderId,
  'payment-processor'
);

// Returns updated inventory with:
// - reserved: reduced
// - stockOnHand: reduced (physical sale completed)
// - audit: entry with beforeStock/afterStock metadata
```

### Example 3: Low-Stock Monitoring & Cleanup

```typescript
// Background job runs every 15 minutes:
const report = await inventoryService.getLowStockReport(0, 100);

report.items.forEach((item) => {
  if (item.status === 'critical') {
    sendAlert(`CRITICAL: ${item.variantSku} out of stock`);
  } else if (item.status === 'low') {
    triggerReplenishment(item.variantSku);
  }
});

// Release stuck reservations (30+ min old):
const cleaner = new StuckReservationCleaner();
cleaner.start(15 * 60 * 1000); // Run every 15 minutes
```

---

## 8. ADMIN PANEL

### Inventory List Page (`/admin/inventory`)

**Features:**
- 📊 Dashboard stats: Total items, low stock count, critical (out) count
- 🔍 Search by SKU
- 🎯 Filters: All, Low Stock, Critical
- 📈 Table with: SKU, Stock on Hand, Reserved, Available, Threshold, Batch Count, Status
- 🔧 Actions per item: Adjust Stock, Add Batch, View Details

**Modals:**
- **Stock Adjustment**: Select reason (return, damage, correction, etc.), enter qty (±)
- **Add Batch**: Enter batch ID, qty, supplier, received date

### Inventory Detail Page (`/admin/inventory/:id`)

**Tabs:**
1. **📊 Overview**: Metrics card, batch info, metadata
2. **📦 Batches**: FIFO batch table with expiry dates
3. **📜 Audit Trail**: Chronological log of all transactions

**Metrics Displayed:**
- Stock on Hand, Reserved, Available (with color coding)
- Low Stock Threshold + Alert
- Total Batches + Oldest Batch (FIFO)
- Location, Created Date, Last Updated
- Audit Entry Count

---

## 9. INTEGRATION POINTS

### Product Module Integration
```typescript
// When creating product variant:
const inventory = await inventoryService.createInventory(
  productId,
  variantData.sku,
  variantData.initialStock || 0,
  variantData.lowStockThreshold || 10
);
// Update variant with inventoryId reference
variant.inventoryId = inventory._id;
```

### Order Module Integration

**On Order Creation:**
```typescript
// For each line item:
await inventoryService.reserveStock(
  lineItem.variantSku,
  lineItem.qty,
  orderId,
  'order-system'
);
// Order enters "pending" state
// Customer has 30 minutes to complete payment
```

**On Payment Success:**
```typescript
// For each line item:
await inventoryService.commitReservedStock(
  inventory._id,
  lineItem.qty,
  orderId,
  'payment-gateway'
);
// Stock is now deducted permanently
// Order enters "confirmed" state
```

**On Order Cancellation:**
```typescript
// For each line item:
await inventoryService.releaseReservedStock(
  inventory._id,
  lineItem.qty,
  orderId,
  'order-system'
);
// Reserved stock is released back to available
// Order enters "cancelled" state
```

**On Return/Refund:**
```typescript
// For each returned item:
await inventoryService.adjustStock(
  inventory._id,
  returnQty,
  `Return - Order ${orderId}`,
  'refund-processor'
);
// Stock is restored to stockOnHand
```

### Returns/Refunds Module
```typescript
// When processing refund:
const inventory = await inventoryService.getInventoryBySku(variantSku);
await inventoryService.adjustStock(
  inventory._id,
  refundQty,
  `Refund: ${returnReason}`,
  'refund-admin'
);
// Audit trail shows refund reason
```

---

## 10. PERFORMANCE & SCALABILITY

### Current Implementation (In-Memory Safe)
- **Atomic Operations**: MongoDB $expr conditions prevent overselling
- **Indexes**: Fast lookups by SKU, product, location
- **Caching**: Batch queries use indexes (no N+1)
- **Audit Trail**: Immutable append-only log

### For High-Volume / Flash Sales

**Option 1: Redis Queue** (Recommended)
```typescript
// Queue reservations during flash sales
// Background job processes queue atomically
const reservationQueue = new Queue('inventory-reserves', {
  connection: redis
});

reservationQueue.process(async (job) => {
  const { variantSku, qty, orderId } = job.data;
  try {
    await inventoryService.reserveStock(variantSku, qty, orderId);
    job.progress(100);
  } catch (error) {
    job.failedReason = error.message;
  }
});
```

**Option 2: Connection Pooling**
```typescript
// Mongoose already uses connection pool
// For peak traffic, adjust pool size:
const mongoose = require('mongoose');
mongoose.connect(MONGODB_URI, {
  maxPoolSize: 50,  // Increase from default 10
  minPoolSize: 10
});
```

**Option 3: Read Replicas**
```typescript
// For reporting/read-heavy operations:
const reportConn = await mongoose.createConnection(READ_REPLICA_URI);
const InventoryReadModel = reportConn.model('Inventory', InventorySchema);

// Writes go to primary, reads can use replica
```

### Monitoring & Alerts

```typescript
// Add metrics collection:
import { Counter, Gauge } from 'prom-client';

const reservationCounter = new Counter({
  name: 'inventory_reservations_total',
  help: 'Total reservation attempts',
  labelNames: ['status'] // success, insufficient_stock
});

const lowStockGauge = new Gauge({
  name: 'inventory_low_stock_items',
  help: 'Count of low-stock items'
});

// Use in service:
try {
  const result = await reserveStock(...);
  reservationCounter.labels('success').inc();
} catch (err) {
  reservationCounter.labels('insufficient_stock').inc();
}
```

---

## 11. TEST COVERAGE

### Unit Tests (35+ cases in test file)

**Creation & Retrieval (4 cases)**
- ✅ Create inventory with valid SKU
- ✅ Reject duplicate SKU
- ✅ Default values
- ✅ Normalize SKU to uppercase

**Stock Retrieval (5 cases)**
- ✅ Get by ID, by SKU, by product
- ✅ Case-insensitive SKU lookup
- ✅ Available stock calculation

**Atomic Reservations (6 cases)**
- ✅ Reserve when available
- ✅ Fail if qty > available
- ✅ Handle exact match
- ✅ Log audit entries
- ✅ Concurrent requests (atomic safety)

**Release & Commit (6 cases)**
- ✅ Release reserved stock
- ✅ Commit reduces both reserved + stockOnHand
- ✅ Fail if not enough reserved
- ✅ Prevent negative reserved/stock
- ✅ Log metadata (beforeStock/afterStock)

**Stock Adjustments (4 cases)**
- ✅ Add stock (positive)
- ✅ Remove stock (negative)
- ✅ Prevent negative stock
- ✅ Log reason in audit

**Batch Management (6 cases)**
- ✅ Add batch + increase stock
- ✅ Reject duplicate batch ID
- ✅ Preserve FIFO order
- ✅ Remove batch + decrease stock
- ✅ Delete empty batch
- ✅ Get expiring batches

**Low-Stock Report (3 cases)**
- ✅ Return items with available <= threshold
- ✅ Support pagination
- ✅ Mark critical vs low status

**Integration Flows (3 cases)**
- ✅ Reserve → Commit (successful order)
- ✅ Reserve → Release (cancellation)
- ✅ Multiple variants for same product

---

## 12. PRODUCTION DEPLOYMENT CHECKLIST

- [ ] **Database Indexes**: Verify indexes created on all 6 indexes in schema
  ```bash
  mongo znm-website --eval "db.inventories.getIndexes()"
  ```

- [ ] **MongoDB Connection**: Test with production URI
  ```bash
  node -r ts-node/register -e "
    import dbConnect from '@/lib/mongodb';
    dbConnect().then(() => console.log('✅ Connected')).catch(e => console.error(e));
  "
  ```

- [ ] **Run Seed Script**: Populate initial inventory data
  ```bash
  node -r ts-node/register scripts/seedInventory.ts
  ```

- [ ] **Start Background Cleaner**: Release stuck reservations
  ```bash
  node -r ts-node/register lib/workers/stuckReservationCleaner.ts &
  ```

- [ ] **Run Tests**: Verify all 35+ cases pass
  ```bash
  npm test -- lib/services/__tests__/inventoryService.test.ts
  ```

- [ ] **API Testing**: Test all 7 endpoints with curl/Postman
  ```bash
  # Reserve
  curl -X POST http://localhost:3000/api/inventory/reserve \
    -H "Content-Type: application/json" \
    -d '{"variantSku":"KRT-XL-BLU","qty":10,"orderId":"order-1"}'

  # Low-stock report
  curl http://localhost:3000/api/inventory/low-stock
  ```

- [ ] **TypeScript Validation**: No errors
  ```bash
  npx tsc --noEmit
  ```

- [ ] **Set Up Monitoring**:
  - Low-stock alerts (email/Slack)
  - Stuck reservation cleaner health check
  - API error rate monitoring

- [ ] **Configure Low-Stock Thresholds**: Review for each product variant
  - Set reasonable thresholds based on demand
  - Adjust after 2 weeks of data

- [ ] **Implement Cron Job** (optional, for production scale):
  ```bash
  # In crontab:
  */15 * * * * node -r ts-node/register /path/to/lib/workers/stuckReservationCleaner.ts run-once
  */30 * * * * curl https://api.example.com/api/inventory/low-stock | notify-admin
  ```

---

## 13. QUICK REFERENCE

### Common Operations

```typescript
// Create inventory for new product variant
const inv = await inventoryService.createInventory(productId, 'SKU-001', 100, 15);

// Check available stock
const available = await inventoryService.getAvailableStock(inventoryId);

// Reserve on checkout
const reserved = await inventoryService.reserveStock('SKU-001', 5, 'order-123', 'customer-1');

// Commit on payment
const committed = await inventoryService.commitReservedStock(inventoryId, 5, 'order-123');

// Release on cancel
const released = await inventoryService.releaseReservedStock(inventoryId, 5, 'order-123');

// Adjust for return
const adjusted = await inventoryService.adjustStock(inventoryId, 5, 'Return received', 'refund-admin');

// Add batch
const batch = await inventoryService.addBatch(inventoryId, {
  batchId: 'LOT-001',
  qty: 100,
  receivedAt: new Date(),
  supplier: 'Supplier A'
});

// Get low-stock items
const report = await inventoryService.getLowStockReport(0, 50);

// View audit trail
const history = await inventoryService.getAuditHistory(inventoryId, 20);
```

### Admin URLs
- **List**: `/admin/inventory`
- **Detail**: `/admin/inventory/:inventoryId`

### API Endpoints
- `GET/POST /api/inventory`
- `GET/PATCH /api/inventory/:id`
- `PATCH /api/inventory/:id/adjust`
- `POST /api/inventory/reserve`
- `POST /api/inventory/release`
- `POST /api/inventory/commit`
- `GET/POST /api/inventory/:id/batch`
- `GET /api/inventory/low-stock`

---

## 14. TROUBLESHOOTING

### Problem: INSUFFICIENT_STOCK on valid request
**Cause**: Reserved stock not released from abandoned carts
**Solution**: Verify `stuckReservationCleaner` is running, check for old reserve entries in audit

### Problem: Stock mismatch between stockOnHand and batches total
**Cause**: Batch removed but stockOnHand not decremented
**Solution**: Manually correct with `adjustStock()`, check for bugs in batch removal

### Problem: Slow low-stock queries
**Cause**: Index missing or collection large
**Solution**: Verify index `available + lowStockThreshold`, consider pagination

### Problem: Duplicate SKU error on retry
**Cause**: First request succeeded but client retried
**Solution**: Implement idempotency keys, use unique constraint with retry logic

---

## 15. WHAT'S NOT INCLUDED (Optional Enhancements)

- **Redis Caching**: Cache getAvailableStock() for microsecond reads
- **WebSocket Updates**: Real-time low-stock notifications
- **Predictive Reordering**: AI-based reorder point recommendations
- **Multi-Currency Pricing**: Stock value calculations
- **Barcode Scanning**: QR/barcode integration for physical counts
- **Location-Aware Picking**: Optimize warehouse picking routes
- **Demand Forecasting**: Predict stock needs based on trends

---

## FILES CREATED

| File | Lines | Purpose |
|------|-------|---------|
| `models/InventoryModel.ts` | 250+ | Mongoose schema with virtuals & indexes |
| `lib/validations/inventoryValidation.ts` | 300+ | 10+ Zod schemas for all operations |
| `lib/services/inventoryService.ts` | 550+ | 15 core functions with atomic ops |
| `app/api/inventory/route.ts` | 60+ | GET/POST list & create |
| `app/api/inventory/[id]/route.ts` | 50+ | GET/PATCH single |
| `app/api/inventory/[id]/adjust/route.ts` | 40+ | Manual stock adjustment |
| `app/api/inventory/reserve/route.ts` | 40+ | Atomic reservation |
| `app/api/inventory/release/route.ts` | 40+ | Release reservation |
| `app/api/inventory/commit/route.ts` | 40+ | Commit on payment |
| `app/api/inventory/[id]/batch/route.ts` | 70+ | Batch GET/POST |
| `app/api/inventory/low-stock/route.ts` | 45+ | Low-stock report |
| `app/admin/inventory/page.tsx` | 500+ | List UI with modals |
| `app/admin/inventory/[id]/page.tsx` | 300+ | Detail page with tabs |
| `app/admin/inventory/inventory.module.scss` | 600+ | Complete styling |
| `lib/services/__tests__/inventoryService.test.ts` | 750+ | 35+ test cases |
| `lib/workers/stuckReservationCleaner.ts` | 200+ | Background job (30-min timeouts) |
| `scripts/seedInventory.ts` | 200+ | 10 test fixtures |

**Total: 17 files, 4,200+ lines of production-ready code**

---

## SUMMARY

✅ **Complete Inventory System** with atomic operations, batch tracking, and full audit trail  
✅ **7 REST API Endpoints** for all operations  
✅ **Admin UI** with list, detail, and modal forms  
✅ **15 Service Functions** covering all use cases  
✅ **35+ Test Cases** ensuring reliability  
✅ **Background Job** for automatic cleanup  
✅ **Seed Data** for development/testing  
✅ **Production Ready** with error handling, validation, and logging

**Deploy with confidence!** 🚀
