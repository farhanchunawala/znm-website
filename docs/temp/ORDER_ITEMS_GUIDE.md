# ORDER ITEMS SUBSYSTEM — Complete Implementation Guide

## Executive Summary

**Order Items** is a complete production-grade subsystem for managing line items in orders with full CRUD operations, inventory synchronization, variant linking, and admin/customer UI support.

**Key Stats:**
- **4 API endpoints** (POST add, PATCH update, DELETE remove, GET list)
- **6 core service functions** (add, update, delete, list, get, recalculate)
- **13 Zod validation schemas** with type-safe error codes
- **2 admin UI modals** (add/edit items with real-time totals)
- **30+ test cases** covering all operations
- **100% inventory integration** with atomic reserve/commit/release
- **Timeline events** for complete audit trail (item.added, item.updated, item.deleted)

---

## 1. DATA MODEL

### OrderItem Sub-schema

```typescript
export interface IOrderItem {
  productId: mongoose.Types.ObjectId;
  variantSku: string;           // e.g., "SKU-001-M-BLK"
  qty: number;                  // Quantity ordered
  price: number;                // Unit price at order time (snapshot)
  subtotal: number;             // qty * price
  batchId?: string;             // Inventory batch tracking
}
```

### Stored within IOrder.items array

**Storage Location:**
```typescript
export interface IOrder extends Document {
  items: IOrderItem[];          // Array of order items
  totals: IOrderTotals;         // Recalculated after each item change
  timeline: ITimelineEvent[];   // Events: item.added, item.updated, item.deleted
  // ... other fields
}
```

### Indexes (in InventoryModel for fast lookups)

```typescript
// Inventory tracking for each variant
db.inventories.createIndex({ variantSku: 1 })        // Fast by SKU
db.inventories.createIndex({ productId: 1 })         // By product
db.inventories.createIndex({ variantSku: 1, reserved: 1 }) // Stock check
```

---

## 2. BACKEND LOGIC

### When Adding Item

```typescript
export async function addOrderItem(
  orderId: string,
  data: AddOrderItemRequest,
  actorId?: string
): Promise<IOrderItem> {
  // 1. Validate order exists and can be modified
  //    - Fail if status is 'shipped', 'delivered', or 'cancelled'
  
  // 2. Fetch variant details from Product collection
  //    - Validate variant exists and is active
  //    - Get price, options, weight, inventoryId
  
  // 3. Reserve inventory (atomic operation)
  //    - Call reserveInventory(variantSku, qty, orderId)
  //    - Fail if insufficient stock (available = stockOnHand - reserved)
  
  // 4. Calculate totals
  //    - subtotal = qty * unitPrice
  //    - tax = subtotal * 0.18 (CGST+SGST for India)
  //    - total = subtotal + tax - discount
  
  // 5. Create item snapshot
  //    - Store variant details immutably at order time
  
  // 6. Add item to order.items array
  
  // 7. Recalculate order totals
  //    - Sum all items, update order.totals
  
  // 8. Add timeline event
  //    - action: 'item.added'
  //    - actor: 'admin' | 'system'
  //    - meta: { itemId, productId, qty, price }
  
  // 9. Save and return
}
```

### When Updating Item

```typescript
export async function updateOrderItem(
  orderId: string,
  itemId: string,
  data: UpdateOrderItemRequest,
  actorId?: string
): Promise<IOrderItem> {
  // 1. Validate order exists and can be modified
  
  // 2. Find item in order.items array
  
  // 3. If qty changed
  //    - Calculate delta = newQty - oldQty
  //    - If delta > 0: reserve additional stock
  //    - If delta < 0: release excess stock
  //    - Update inventory atomically
  
  // 4. If variantSku changed
  //    - Validate new variant exists
  //    - Release old variant inventory
  //    - Reserve new variant inventory
  //    - Fetch new variant price
  
  // 5. If priceOverride provided
  //    - Update item.price (requires admin permission)
  
  // 6. Recalculate order totals
  
  // 7. Add timeline event
  //    - action: 'item.updated'
  //    - meta: { itemId, changes: { qtyFrom, qtyTo, priceFrom, priceTo } }
  
  // 8. Save and return
}
```

### When Deleting Item

```typescript
export async function deleteOrderItem(
  orderId: string,
  itemId: string,
  data?: DeleteOrderItemRequest,
  actorId?: string
): Promise<{ success: boolean; itemId: string }> {
  // 1. Validate order exists and can be modified
  
  // 2. Find and remove item from order.items
  
  // 3. Release inventory
  //    - Call releaseInventory(variantSku, qty, orderId)
  //    - Decrement inventory.reserved
  
  // 4. Recalculate order totals
  //    - Sum remaining items
  
  // 5. Add timeline event
  //    - action: 'item.deleted'
  //    - meta: { itemId, reason, note }
  
  // 6. Save and return success
}
```

---

## 3. API ROUTES

### POST /api/orders/:id/items — Add Item

**Admin only**

```bash
curl -X POST http://localhost:3000/api/orders/678a1b2c3d4e5f6g7h8i/items \
  -H "Content-Type: application/json" \
  -H "x-admin-id: admin-123" \
  -d '{
    "productId": "507f1f77bcf86cd799439011",
    "variantSku": "SKU-001-M-BLK",
    "qty": 2,
    "priceOverride": 1200,
    "discountOverride": 100,
    "note": "Special order request"
  }'
```

**Response (201):**
```json
{
  "message": "Item added successfully",
  "item": {
    "_id": "507f2b2c3d4e5f6g7h8i9012",
    "productId": "507f1f77bcf86cd799439011",
    "variantSku": "SKU-001-M-BLK",
    "titleSnapshot": "Kurta",
    "qty": 2,
    "price": 1200,
    "subtotal": 2400,
    "batchId": "batch-1702400000"
  }
}
```

**Error Responses:**
```json
// 404 - Order not found
{ "error": "Order not found", "code": "ORDER_NOT_FOUND" }

// 404 - Product/variant not found
{ "error": "Product ... not found", "code": "PRODUCT_NOT_FOUND" }

// 400 - Insufficient stock
{ "error": "Insufficient stock for variant SKU-001. Requested: 5", "code": "INSUFFICIENT_STOCK" }

// 400 - Cannot modify shipped order
{ "error": "Cannot add items to shipped order", "code": "CANNOT_MODIFY_SHIPPED" }
```

---

### GET /api/orders/:id/items — List Items

**Both admin and customer (customer sees only their own orders)**

```bash
curl "http://localhost:3000/api/orders/678a1b2c3d4e5f6g7h8i/items?page=1&limit=20"
```

**Response (200):**
```json
{
  "items": [
    {
      "_id": "507f2b2c3d4e5f6g7h8i9012",
      "productId": "507f1f77bcf86cd799439011",
      "variantSku": "SKU-001-M-BLK",
      "titleSnapshot": "Kurta",
      "variantSnapshot": {
        "options": [
          { "name": "size", "value": "M" },
          { "name": "color", "value": "black" }
        ],
        "sku": "SKU-001-M-BLK",
        "price": 1000
      },
      "qty": 2,
      "price": 1000,
      "subtotal": 2000,
      "tax": 360,
      "discount": 0
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 3,
    "pages": 1
  },
  "orderStatus": "confirmed",
  "totals": {
    "subtotal": 5000,
    "tax": 900,
    "discount": 200,
    "shipping": 0,
    "grandTotal": 5700
  }
}
```

---

### PATCH /api/orders/:id/items/:itemId — Update Item

**Admin only**

```bash
curl -X PATCH http://localhost:3000/api/orders/678a1b2c3d4e5f6g7h8i/items/507f2b2c3d4e5f6g7h8i9012 \
  -H "Content-Type: application/json" \
  -H "x-admin-id: admin-123" \
  -d '{
    "qty": 3,
    "priceOverride": 1500
  }'
```

**Response (200):**
```json
{
  "message": "Item updated successfully",
  "item": {
    "_id": "507f2b2c3d4e5f6g7h8i9012",
    "qty": 3,
    "price": 1500,
    "subtotal": 4500
  }
}
```

**Variant Change:**
```json
{
  "variantSku": "SKU-001-L-RED"
}
```

---

### DELETE /api/orders/:id/items/:itemId — Remove Item

**Admin only**

```bash
curl -X DELETE http://localhost:3000/api/orders/678a1b2c3d4e5f6g7h8i/items/507f2b2c3d4e5f6g7h8i9012 \
  -H "Content-Type: application/json" \
  -H "x-admin-id: admin-123" \
  -d '{
    "reason": "out-of-stock",
    "note": "Variant no longer available"
  }'
```

**Response (200):**
```json
{
  "message": "Item deleted successfully",
  "success": true,
  "itemId": "507f2b2c3d4e5f6g7h8i9012"
}
```

---

## 4. ADMIN UI

### Add Item Modal

```typescript
// State
const [addItemModal, setAddItemModal] = useState({
  isOpen: false,
  productId: '',        // MongoDB ObjectId
  variantSku: '',       // e.g., SKU-001-M-BLK
  qty: 1,
  priceOverride: '',    // Optional: admin override price
  loading: false,
  error: '',
});

// Handler
const handleAddItem = async () => {
  const res = await fetch(`/api/orders/${orderId}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      productId: addItemModal.productId,
      variantSku: addItemModal.variantSku,
      qty: addItemModal.qty,
      priceOverride: addItemModal.priceOverride ? parseFloat(addItemModal.priceOverride) : undefined,
    }),
  });
  
  if (res.ok) {
    // Refresh order data and close modal
    const data = await res.json();
    setOrder(prev => ({ ...prev, ...data }));
  }
};
```

### Items Table with Actions

```typescript
<table className={styles.itemsTable}>
  <thead>
    <tr>
      <th>Product</th>
      <th>SKU</th>
      <th>Qty</th>
      <th>Price</th>
      <th>Subtotal</th>
      <th>Actions</th>
    </tr>
  </thead>
  <tbody>
    {order.items.map((item) => (
      <tr key={item._id}>
        <td>{item.titleSnapshot}</td>
        <td>{item.variantSku}</td>
        <td>{item.qty}</td>
        <td>₹{item.price.toFixed(2)}</td>
        <td>₹{item.subtotal.toFixed(2)}</td>
        <td>
          <button onClick={() => openEditModal(item)}>Edit</button>
          <button onClick={() => deleteItem(item._id)}>Delete</button>
        </td>
      </tr>
    ))}
  </tbody>
</table>
```

### Edit Item Modal

```typescript
const [editItemModal, setEditItemModal] = useState({
  isOpen: false,
  itemId: '',
  qty: 1,
  priceOverride: '',
  variantSku: '',
  loading: false,
  error: '',
});

// Handler
const handleEditItem = async () => {
  const res = await fetch(`/api/orders/${orderId}/items/${editItemModal.itemId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      qty: editItemModal.qty,
      priceOverride: editItemModal.priceOverride ? parseFloat(editItemModal.priceOverride) : undefined,
      variantSku: editItemModal.variantSku || undefined,
    }),
  });
};
```

### Real-time Totals Update

After add/update/delete, totals recalculate automatically:
```typescript
// Order totals update on every item change
<div className={styles.totalRowGrand}>
  <span>Grand Total:</span>
  <span>₹{order.totals.grandTotal.toFixed(2)}</span>
</div>
```

---

## 5. VALIDATION RULES

| Rule | Implementation | Error Code |
|------|---|---|
| qty ≥ 1 | Zod schema: `z.number().int().min(1)` | VALIDATION_ERROR |
| qty ≤ 100 | Zod schema: `max(100)` | VALIDATION_ERROR |
| Cannot modify shipped order | Service check: `['shipped', 'delivered'].includes(order.status)` | CANNOT_MODIFY_SHIPPED |
| Variant must exist | Product.variants.find(v => v.sku === sku) | VARIANT_NOT_FOUND |
| Variant must be active | Check `variant.isActive === true` | VARIANT_INACTIVE |
| Sufficient stock required | Inventory.available ≥ qty | INSUFFICIENT_STOCK |
| Price override requires admin | Check x-admin-id header | PRICE_OVERRIDE_DENIED |

---

## 6. INVENTORY INTEGRATION

### Stock Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    INVENTORY STATE MACHINE                       │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐
│  Product Catalog │ (stockOnHand = 100)
│   reserved = 0   │
└────────┬─────────┘
         │
         │ item.added (qty=10)
         ▼
┌──────────────────┐
│ Order Pending    │ (stockOnHand = 100)
│ reserved = 10    │ (available = 90)
│ Awaiting Payment │
└────────┬─────────┘
         │
         │ payment.success
         ▼
┌──────────────────┐
│ Order Confirmed  │ Inventory "committed"
│ reserved = 0     │ (reserved → allocated to order)
│ Awaiting Pickup  │
└────────┬─────────┘
         │
         │ order.shipped
         ▼
┌──────────────────┐
│ Order Shipped    │
│ In Transit       │
└────────┬─────────┘
         │
         │ order.delivered
         ▼
┌──────────────────┐
│ Order Delivered  │
│ Complete         │
└──────────────────┘
```

### Code Examples

**Reserve on Add:**
```typescript
await reserveInventory(
  variantSku,    // "SKU-001-M-BLK"
  qty,           // 10
  orderId        // For audit trail
);

// Inventory audit entry:
// {
//   action: 'reserve',
//   qty: 10,
//   timestamp: Date,
//   metadata: { orderId, variantSku }
// }
```

**Adjust on Update:**
```typescript
await adjustInventory(
  variantSku,   // "SKU-001-M-BLK"
  oldQty,       // 10
  newQty,       // 15
  orderId
);

// If newQty > oldQty: reserves additional 5 units
// If newQty < oldQty: releases 5 reserved units
```

**Release on Delete:**
```typescript
await releaseInventory(
  variantSku,   // "SKU-001-M-BLK"
  qty,          // 10
  orderId
);

// Inventory reserved amount decreases by 10
// Available stock increases by 10
```

**Commit on Payment:**
```typescript
await commitOrderInventory(orderId);

// For each item, records 'commit' audit entry
// Converts reservation → permanent allocation
// (Implementation detail for reporting)
```

---

## 7. TIMELINE EVENTS

Three events track item lifecycle:

### item.added

```json
{
  "actor": "admin",
  "action": "item.added",
  "timestamp": "2025-12-13T10:30:00Z",
  "meta": {
    "itemId": "507f2b2c3d4e5f6g7h8i9012",
    "productId": "507f1f77bcf86cd799439011",
    "variantSku": "SKU-001-M-BLK",
    "qty": 2,
    "price": 1200,
    "note": "Special order request"
  }
}
```

### item.updated

```json
{
  "actor": "admin",
  "action": "item.updated",
  "timestamp": "2025-12-13T10:35:00Z",
  "meta": {
    "itemId": "507f2b2c3d4e5f6g7h8i9012",
    "changes": {
      "qtyFrom": 2,
      "qtyTo": 3,
      "priceFrom": 1200,
      "priceTo": 1500
    },
    "note": "Customer requested qty increase"
  }
}
```

### item.deleted

```json
{
  "actor": "admin",
  "action": "item.deleted",
  "timestamp": "2025-12-13T10:40:00Z",
  "meta": {
    "itemId": "507f2b2c3d4e5f6g7h8i9012",
    "productId": "507f1f77bcf86cd799439011",
    "variantSku": "SKU-001-M-BLK",
    "qty": 3,
    "price": 1500,
    "reason": "out-of-stock",
    "note": "Variant no longer available"
  }
}
```

---

## 8. TEST COVERAGE

### Core Tests (30+)

| Category | Tests | Coverage |
|---|---|---|
| Add Item | 7 | Valid variant, price override, stock validation, timeline event |
| Update Item | 6 | Qty change, price override, variant change, inventory adjustment |
| Delete Item | 4 | Release inventory, totals recalc, timeline event, locked orders |
| List/Get | 4 | Pagination, empty orders, 404 handling |
| Inventory Sync | 5 | Reserve, release, adjust, commit, atomic operations |
| Calculation | 5 | Totals, tax, discount, rounding, edge cases |
| Error Handling | 5 | Error codes, status codes, validation messages |

**Run tests:**
```bash
npm test -- __tests__/orderItemService.test.ts
```

---

## 9. PERFORMANCE

### Query Optimization

```typescript
// Fast item lookup by SKU
db.inventories.createIndex({ variantSku: 1 })

// Check available stock efficiently
db.inventories.createIndex({ variantSku: 1, reserved: 1 })

// Product variant lookups
db.products.createIndex({ 'variants.sku': 1 })
```

### Caching Strategies

| Operation | Strategy | TTL |
|---|---|---|
| Product variant fetch | Cache variant details in item snapshot | Permanent (immutable) |
| Inventory check | In-memory cache of stock-on-hand | 5 seconds |
| Order totals | Recalc on every item change (minimal overhead) | N/A |

---

## 10. ERROR CODES

| Code | HTTP | Meaning | Solution |
|---|---|---|---|
| ITEM_NOT_FOUND | 404 | Item doesn't exist in order | Verify itemId exists |
| ORDER_NOT_FOUND | 404 | Order doesn't exist | Verify orderId exists |
| PRODUCT_NOT_FOUND | 404 | Product/variant not found | Check productId and variantSku |
| INSUFFICIENT_STOCK | 400 | Not enough inventory | Reduce qty or use different variant |
| CANNOT_MODIFY_SHIPPED | 400 | Order already shipped | Admin override required for shipped orders |
| VARIANT_INACTIVE | 404 | Variant not active | Use different variant |
| INVENTORY_SYNC_ERROR | 500 | Inventory update failed | Retry; check inventory service |
| VALIDATION_ERROR | 400 | Request validation failed | Check all required fields |

---

## 11. INTEGRATION CHECKLIST

Before deploying to production:

- [ ] **Product Module** — Products with variants exist with SKUs and prices
- [ ] **Inventory Module** — Inventory collection with reserve/commit/release support
- [ ] **Order Module** — Orders created with items array and totals
- [ ] **Admin Authentication** — x-admin-id header required for POST/PATCH/DELETE
- [ ] **Timeline Integration** — order.timeline supports item.* events
- [ ] **Database Indexes** — Create indexes on variantSku, productId
- [ ] **Validation Rules** — All Zod schemas match business requirements
- [ ] **Error Handling** — Catch and log all service errors
- [ ] **Unit Tests** — Run test suite: `npm test`
- [ ] **Integration Tests** — Test with real order and inventory data

---

## 12. DEPLOYMENT CHECKLIST

1. **Create Database Indexes:**
   ```bash
   db.inventories.createIndex({ variantSku: 1 })
   db.inventories.createIndex({ productId: 1 })
   db.products.createIndex({ 'variants.sku': 1 })
   ```

2. **Set Environment Variables:**
   ```env
   MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/znm
   NODE_ENV=production
   ```

3. **Run Tests:**
   ```bash
   npm test -- __tests__/orderItemService.test.ts
   npm test -- __tests__/orderService.test.ts
   ```

4. **Start Dev Server:**
   ```bash
   npm run dev
   ```

5. **Verify Admin UI:**
   - Navigate to `/admin/orders/[id]`
   - Test Add Item modal
   - Test Edit Item modal
   - Test Delete Item
   - Verify totals update

6. **Test API Endpoints:**
   ```bash
   # Add item
   curl -X POST http://localhost:3000/api/orders/{id}/items \
     -H "Content-Type: application/json" \
     -d '{"productId":"...","variantSku":"...","qty":1}'
   
   # List items
   curl http://localhost:3000/api/orders/{id}/items
   
   # Update item
   curl -X PATCH http://localhost:3000/api/orders/{id}/items/{itemId} \
     -H "Content-Type: application/json" \
     -d '{"qty":2}'
   
   # Delete item
   curl -X DELETE http://localhost:3000/api/orders/{id}/items/{itemId}
   ```

7. **Monitor Production:**
   - Log all item mutations (add/update/delete)
   - Alert on inventory sync errors
   - Track totals recalculation performance

---

## 13. QUICK REFERENCE

### File Structure

```
lib/
  ├── validations/orderItemValidation.ts     (13 schemas, type exports)
  ├── services/orderItemService.ts           (6 core functions, inventory sync)
  └── email/ (if needed for confirmations)

app/api/orders/
  ├── [id]/items/route.ts                    (GET list, POST add)
  └── [id]/items/[itemId]/route.ts           (GET detail, PATCH update, DELETE)

app/admin/orders/
  ├── [id]/page.tsx                          (Enhanced with item modals)
  └── orders.module.scss                     (Modal and table styles)

__tests__/
  └── orderItemService.test.ts               (30+ test cases)
```

### Core Service Functions

| Function | Signature | Purpose |
|---|---|---|
| addOrderItem | `(orderId, data, actorId?) => Promise<IOrderItem>` | Add item + reserve stock |
| updateOrderItem | `(orderId, itemId, data, actorId?) => Promise<IOrderItem>` | Update qty/price/variant |
| deleteOrderItem | `(orderId, itemId, data?, actorId?) => Promise<{success}>` | Remove item + release stock |
| listOrderItems | `(orderId, page, limit) => Promise<{items, pagination}>` | List with pagination |
| getOrderItem | `(orderId, itemId) => Promise<IOrderItem>` | Get single item |
| recalculateOrderTotals | `(orderId) => Promise<OrderTotalsRecalc>` | Recompute all totals |
| reserveInventory | `(variantSku, qty, orderId) => Promise<string>` | Atomic stock reserve |
| releaseInventory | `(variantSku, qty, orderId) => Promise<void>` | Release reserved stock |
| adjustInventory | `(variantSku, oldQty, newQty, orderId) => Promise<void>` | Adjust reservation |
| commitOrderInventory | `(orderId) => Promise<void>` | Mark reserved as committed |

---

## 14. TROUBLESHOOTING

### "Insufficient stock" error

**Cause:** Available stock (stockOnHand - reserved) is less than requested qty

**Solution:**
1. Check inventory levels: `db.inventories.findOne({ variantSku: '...' })`
2. Verify no pending orders: Check reserved amount
3. Add stock if needed: `db.inventories.updateOne({...}, { $inc: { stockOnHand: 50 } })`

### Items not showing in order

**Cause:** Items array empty or not populated

**Solution:**
1. Verify item was added: Check timeline for 'item.added' event
2. Check API response: Should return 201 with item object
3. Refresh order page: Click back and reopen

### Totals mismatch

**Cause:** Manual inventory changes or failed updates

**Solution:**
1. Trigger recalculation: `await recalculateOrderTotals(orderId)`
2. Verify all items have prices: Check for undefined prices
3. Manual fix: Use Mongo update: `db.orders.updateOne({_id: ObjectId(...)}, { $set: { totals: {...} } })`

### Inventory sync errors

**Cause:** Inventory collection doesn't exist or has wrong schema

**Solution:**
1. Verify Inventory model exists: `db.inventories.countDocuments()`
2. Check indexes: `db.inventories.getIndexes()`
3. Seed test data: `node -r ts-node/register scripts/seedInventory.ts`

---

## 15. NEXT STEPS

After deploying Order Items:

1. **Implement Checkout Integration**
   - Call `addOrderItem` for each cart item
   - Ensure stock is reserved before payment

2. **Add Refund Flow**
   - When refund issued, delete associated items
   - Triggers inventory release automatically

3. **Build Customer Order History UI**
   - Display items with variant options
   - Show price paid at time of order
   - Links to reorder same items

4. **Create Order Analytics**
   - Most popular items
   - Average item price
   - Variant distribution
   - Seasonal trends

5. **Implement Return/Exchange**
   - Track which items were returned
   - Create timeline events: return.requested, return.approved, return.shipped
   - Update inventory on return receipt

---

**Questions or issues?** Review the test suite (`__tests__/orderItemService.test.ts`) for usage examples or check the API route handlers for implementation details.
