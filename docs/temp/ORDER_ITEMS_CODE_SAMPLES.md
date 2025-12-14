# ORDER ITEMS — 3 COMPACT CODE SNIPPETS

## Snippet 1: OrderItem Schema & Add Handler (10 lines)

```typescript
// OrderItem Sub-schema (in OrderModel)
export interface IOrderItem {
  productId: mongoose.Types.ObjectId;
  variantSku: string;
  qty: number;
  price: number;
  subtotal: number; // qty * price
  batchId?: string;
}

// Add Item Handler (skeleton)
export async function addOrderItem(orderId: string, data: AddOrderItemRequest) {
  const variant = await getVariantDetails(data.productId, data.variantSku);
  await reserveInventory(data.variantSku, data.qty, orderId);
  const item: IOrderItem = {
    productId: new ObjectId(data.productId),
    variantSku: data.variantSku,
    qty: data.qty,
    price: data.priceOverride || variant.price,
    subtotal: data.qty * (data.priceOverride || variant.price),
  };
  await Order.findByIdAndUpdate(orderId, {
    $push: { items: item, timeline: { action: 'item.added', timestamp: new Date(), meta: { itemId: item._id, qty: item.qty } } },
    $set: { totals: await recalculateOrderTotals(orderId) },
  });
  return item;
}
```

---

## Snippet 2: Update Qty & Adjust Inventory (10 lines)

```typescript
// Update Item Handler Skeleton
export async function updateOrderItem(orderId: string, itemId: string, data: UpdateOrderItemRequest) {
  const order = await Order.findById(orderId);
  const item = order.items.find(i => i._id.toString() === itemId);
  
  if (data.qty !== undefined && data.qty !== item.qty) {
    // Atomic inventory adjustment: increase or decrease reserved stock
    const delta = data.qty - item.qty;
    if (delta > 0) {
      await reserveInventory(item.variantSku, delta, orderId); // Reserve more
    } else {
      await releaseInventory(item.variantSku, -delta, orderId); // Release excess
    }
    item.qty = data.qty;
    item.subtotal = data.qty * item.price; // Recalculate
  }
  
  if (data.priceOverride !== undefined) {
    item.price = data.priceOverride;
    item.subtotal = item.qty * item.price;
  }
  
  // Recalc totals & save
  await order.updateOne({
    $set: { items: order.items, totals: await recalculateOrderTotals(orderId) },
    $push: { timeline: { action: 'item.updated', timestamp: new Date(), meta: { itemId, changes: { qty: data.qty, price: item.price } } } },
  });
  return item;
}
```

---

## Snippet 3: Delete Item & Release Inventory (8 lines)

```typescript
// Delete Item Handler Skeleton
export async function deleteOrderItem(orderId: string, itemId: string) {
  const order = await Order.findById(orderId);
  const item = order.items.find(i => i._id.toString() === itemId);
  
  // Release inventory immediately (atomic operation)
  await releaseInventory(item.variantSku, item.qty, orderId);
  
  // Remove from items array & update totals
  order.items = order.items.filter(i => i._id.toString() !== itemId);
  const newTotals = await recalculateOrderTotals(orderId);
  
  await order.updateOne({
    $set: { items: order.items, totals: newTotals },
    $push: { timeline: { action: 'item.deleted', timestamp: new Date(), meta: { itemId, qty: item.qty, reason: 'admin-removed' } } },
  });
  return { success: true, itemId };
}
```

---

## API USAGE EXAMPLES

### Add Item
```bash
curl -X POST http://localhost:3000/api/orders/507f1f77bcf86cd799439011/items \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "507f1f77bcf86cd799439012",
    "variantSku": "SKU-001-M-BLACK",
    "qty": 2,
    "priceOverride": 1500
  }'

# Response (201)
{
  "message": "Item added successfully",
  "item": {
    "_id": "507f2b2c3d4e5f6g7h8i9012",
    "productId": "507f1f77bcf86cd799439012",
    "variantSku": "SKU-001-M-BLACK",
    "qty": 2,
    "price": 1500,
    "subtotal": 3000
  }
}
```

### Update Item Qty
```bash
curl -X PATCH http://localhost:3000/api/orders/507f1f77bcf86cd799439011/items/507f2b2c3d4e5f6g7h8i9012 \
  -H "Content-Type: application/json" \
  -d '{ "qty": 3 }'

# Response (200)
{
  "message": "Item updated successfully",
  "item": {
    "_id": "507f2b2c3d4e5f6g7h8i9012",
    "qty": 3,
    "subtotal": 4500
  }
}
```

### Delete Item
```bash
curl -X DELETE http://localhost:3000/api/orders/507f1f77bcf86cd799439011/items/507f2b2c3d4e5f6g7h8i9012 \
  -H "Content-Type: application/json" \
  -d '{ "reason": "out-of-stock" }'

# Response (200)
{
  "message": "Item deleted successfully",
  "success": true,
  "itemId": "507f2b2c3d4e5f6g7h8i9012"
}
```

### List Items with Pagination
```bash
curl "http://localhost:3000/api/orders/507f1f77bcf86cd799439011/items?page=1&limit=20"

# Response (200)
{
  "items": [
    {
      "_id": "507f2b2c3d4e5f6g7h8i9012",
      "productId": "507f1f77bcf86cd799439012",
      "variantSku": "SKU-001-M-BLACK",
      "qty": 3,
      "price": 1500,
      "subtotal": 4500
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 1, "pages": 1 },
  "totals": { "subtotal": 4500, "tax": 810, "discount": 0, "shipping": 0, "grandTotal": 5310 }
}
```

---

## ADMIN UI CODE SNIPPET

### Add Item Handler
```typescript
const handleAddItem = async () => {
  if (!addItemModal.productId || !addItemModal.variantSku) {
    setAddItemModal(prev => ({ ...prev, error: 'Fill all required fields' }));
    return;
  }

  setAddItemModal(prev => ({ ...prev, loading: true, error: '' }));
  try {
    const res = await fetch(`/api/orders/${params.id}/items`, {
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
      const data = await res.json();
      setOrder(prev => ({ ...prev, items: data.item, totals: data.totals }));
      setAddItemModal(prev => ({ ...prev, isOpen: false }));
    } else {
      const error = await res.json();
      setAddItemModal(prev => ({ ...prev, error: error.error }));
    }
  } catch (error: any) {
    setAddItemModal(prev => ({ ...prev, error: error.message }));
  } finally {
    setAddItemModal(prev => ({ ...prev, loading: false }));
  }
};
```

### Items Table
```tsx
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
    {order.items.map((item: any) => (
      <tr key={item._id}>
        <td>{item.titleSnapshot || 'Product'}</td>
        <td>{item.variantSku}</td>
        <td>{item.qty}</td>
        <td>₹{item.price.toFixed(2)}</td>
        <td>₹{item.subtotal.toFixed(2)}</td>
        <td className={styles.actions}>
          <button className={styles.editBtn} onClick={() => openEditModal(item)}>
            Edit
          </button>
          <button className={styles.deleteBtn} onClick={() => handleDeleteItem(item._id)}>
            Delete
          </button>
        </td>
      </tr>
    ))}
  </tbody>
</table>
```

---

## INVENTORY FLOW EXAMPLE

```typescript
// ==================== CUSTOMER ADDS TO CART ====================
// 1. Frontend: Select product, size, qty
// 2. Call POST /api/orders/{id}/items
//    └─ Body: { productId, variantSku: "SKU-001-M", qty: 2 }

// ==================== BACKEND: addOrderItem() ====================
// 3. Validate order, product, variant exist
// 4. Call reserveInventory("SKU-001-M", 2, orderId)
//    └─ Inventory.findOneAndUpdate({
//         variantSku: "SKU-001-M",
//         $expr: { $gte: [{ $subtract: ['$stockOnHand', '$reserved'] }, 2] }
//       }, { $inc: { reserved: 2 } })
//    └─ ✅ Atomic: Prevents overselling

// 5. Create item snapshot:
//    {
//      productId: ObjectId("..."),
//      variantSku: "SKU-001-M",
//      qty: 2,
//      price: 1000,
//      subtotal: 2000
//    }

// 6. Push to Order.items array
// 7. Recalc Order.totals
// 8. Add timeline event: { action: 'item.added', meta: { itemId, qty: 2, price: 1000 } }

// ==================== CUSTOMER UPDATES QTY ====================
// 9. Frontend: User increases qty from 2 to 5
// 10. Call PATCH /api/orders/{id}/items/{itemId}
//     └─ Body: { qty: 5 }

// ==================== BACKEND: updateOrderItem() ====================
// 11. Calculate delta = 5 - 2 = 3
// 12. Call reserveInventory("SKU-001-M", 3, orderId)
//     └─ Reserves 3 MORE units (now reserved = 5)

// 13. Update item.qty = 5, item.subtotal = 5000
// 14. Recalc Order.totals
// 15. Add timeline event: { action: 'item.updated', meta: { changes: { qtyFrom: 2, qtyTo: 5 } } }

// ==================== CUSTOMER REMOVES ITEM ====================
// 16. Frontend: User clicks Delete button
// 17. Call DELETE /api/orders/{id}/items/{itemId}

// ==================== BACKEND: deleteOrderItem() ====================
// 18. Call releaseInventory("SKU-001-M", 5, orderId)
//     └─ Inventory.findOneAndUpdate({
//          variantSku: "SKU-001-M"
//        }, { $inc: { reserved: -5 } })
//     └─ Now reserved = 0 (available stock = 100)

// 19. Remove item from Order.items array
// 20. Recalc Order.totals
// 21. Add timeline event: { action: 'item.deleted', meta: { itemId, qty: 5, reason: 'customer-removed' } }

// ==================== CUSTOMER PAYS ====================
// 22. Payment gateway confirms payment.success
// 23. Call commitOrderInventory(orderId)
//     └─ For each item, adds 'commit' audit entry
//     └─ (Inventory reserved → committed in audit trail)

// ==================== FINAL STATE ====================
// Inventory.findOne({ variantSku: "SKU-001-M" })
// {
//   stockOnHand: 100,
//   reserved: 0,    // All released items not added
//   audit: [
//     { action: 'reserve', qty: 2, metadata: { orderId } },
//     { action: 'reserve', qty: 3, metadata: { orderId } },
//     { action: 'release', qty: 5, metadata: { orderId } },
//     { action: 'commit', qty: 0, metadata: { orderId } }
//   ]
// }
```

---

## VALIDATION EXAMPLE

```typescript
// ❌ INVALID REQUESTS

// Missing required fields
POST /api/orders/{id}/items
{ "variantSku": "SKU-001" }
// Error: VALIDATION_ERROR - "Product ID required"

// Invalid qty
POST /api/orders/{id}/items
{ "productId": "...", "variantSku": "SKU-001", "qty": 0 }
// Error: VALIDATION_ERROR - "Quantity must be at least 1"

// Variant doesn't exist
POST /api/orders/{id}/items
{ "productId": "...", "variantSku": "SKU-NONEXISTENT", "qty": 1 }
// Error: VARIANT_NOT_FOUND - "Variant ... not found"

// Insufficient stock
POST /api/orders/{id}/items
{ "productId": "...", "variantSku": "SKU-001", "qty": 999999 }
// Error: INSUFFICIENT_STOCK - "Available: 50, Requested: 999999"

// Cannot modify shipped order
PATCH /api/orders/{shipped-id}/items/{itemId}
{ "qty": 5 }
// Error: CANNOT_MODIFY_SHIPPED - "Cannot modify items in shipped order"

// ✅ VALID REQUESTS

POST /api/orders/{id}/items
{
  "productId": "507f1f77bcf86cd799439011",
  "variantSku": "SKU-001-M-BLK",
  "qty": 2,
  "priceOverride": 1500
}
// Response: 201 Created with item object

PATCH /api/orders/{id}/items/{itemId}
{ "qty": 3, "priceOverride": 2000 }
// Response: 200 OK with updated item

DELETE /api/orders/{id}/items/{itemId}
{ "reason": "customer-request" }
// Response: 200 OK with { success: true, itemId }
```

---

**For more examples, see ORDER_ITEMS_GUIDE.md sections 3-5**
