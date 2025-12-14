# ORDER ITEMS IMPLEMENTATION CHECKLIST

**For Developers:** Use this checklist to verify implementation and prepare for deployment.

---

## PRE-IMPLEMENTATION SETUP

- [ ] **Review Documentation**
  - [ ] Read ORDER_ITEMS_GUIDE.md (full guide)
  - [ ] Read ORDER_ITEMS_SUMMARY.md (overview)
  - [ ] Read ORDER_ITEMS_CODE_SAMPLES.md (examples)
  - [ ] Understand inventory reserve/commit/release flow

- [ ] **Understand Architecture**
  - [ ] Validation layer (Zod schemas)
  - [ ] Service layer (business logic)
  - [ ] API routes (endpoints)
  - [ ] Admin UI (modals)
  - [ ] Inventory sync (atomic ops)

- [ ] **Verify Dependencies**
  - [ ] mongoose installed
  - [ ] zod installed
  - [ ] next installed
  - [ ] typescript configured (strict mode)

---

## DATABASE SETUP

- [ ] **Create Inventory Indexes**
  ```bash
  db.inventories.createIndex({ variantSku: 1 })
  db.inventories.createIndex({ productId: 1 })
  db.inventories.createIndex({ variantSku: 1, reserved: 1 })
  ```

- [ ] **Verify Order Model**
  - [ ] Order.items array exists
  - [ ] items are IOrderItem type
  - [ ] Order.totals exists
  - [ ] Order.timeline exists with item.* events

- [ ] **Verify Product Model**
  - [ ] Product.variants array exists
  - [ ] Each variant has sku property
  - [ ] Each variant has price property
  - [ ] Each variant has options array
  - [ ] Each variant has isActive property

- [ ] **Verify Inventory Model**
  - [ ] Inventory.stockOnHand exists
  - [ ] Inventory.reserved exists
  - [ ] Inventory.variantSku exists (unique)
  - [ ] Inventory.audit array exists

---

## CODE VERIFICATION

- [ ] **Validation Layer**
  - [ ] orderItemValidation.ts created
  - [ ] 13 Zod schemas defined
  - [ ] Type exports available
  - [ ] Error codes enumerated

- [ ] **Service Layer**
  - [ ] orderItemService.ts created
  - [ ] 6 core functions implemented
  - [ ] 4 inventory helpers implemented
  - [ ] Error handling with custom error class
  - [ ] All functions async/await

- [ ] **API Routes**
  - [ ] /api/orders/[id]/items/route.ts created
  - [ ] GET handler (list)
  - [ ] POST handler (add)
  - [ ] /api/orders/[id]/items/[itemId]/route.ts created
  - [ ] GET handler (detail)
  - [ ] PATCH handler (update)
  - [ ] DELETE handler (remove)

- [ ] **Admin UI**
  - [ ] page.tsx enhanced with modals
  - [ ] AddItemModal component
  - [ ] EditItemModal component
  - [ ] Items table with actions
  - [ ] Real-time totals update
  - [ ] orders.module.scss updated with styles

- [ ] **Tests**
  - [ ] orderItemService.test.ts created
  - [ ] 30+ test cases
  - [ ] Calculations tests
  - [ ] Add/update/delete tests
  - [ ] Inventory sync tests
  - [ ] Error handling tests

---

## FUNCTIONALITY TESTING

### Add Item
- [ ] POST /api/orders/:id/items with valid data
  - [ ] Returns 201 Created
  - [ ] Item appears in items array
  - [ ] Inventory reserved increases
  - [ ] Timeline event item.added created
  - [ ] Order totals updated

- [ ] POST with missing productId
  - [ ] Returns 400 Bad Request
  - [ ] Error message: "Product ID required"

- [ ] POST with invalid variantSku
  - [ ] Returns 404 Not Found
  - [ ] Error message: "Variant not found"

- [ ] POST with insufficient stock
  - [ ] Returns 400 Bad Request
  - [ ] Error message: "Insufficient stock"

- [ ] POST with qty > 100
  - [ ] Returns 400 Bad Request
  - [ ] Error message: "Max 100 per item"

- [ ] POST to shipped order
  - [ ] Returns 400 Bad Request
  - [ ] Error message: "Cannot add items to shipped order"

### Update Item
- [ ] PATCH qty change
  - [ ] Returns 200 OK
  - [ ] Item qty updated
  - [ ] Inventory reserved adjusted (delta)
  - [ ] Totals recalculated
  - [ ] Timeline event item.updated created

- [ ] PATCH price override
  - [ ] Price updated
  - [ ] Subtotal recalculated
  - [ ] Totals updated

- [ ] PATCH variant change
  - [ ] Old variant inventory released
  - [ ] New variant inventory reserved
  - [ ] Item variantSku updated
  - [ ] Timeline updated

- [ ] PATCH non-existent item
  - [ ] Returns 404 Not Found
  - [ ] Error message: "Item not found"

### Delete Item
- [ ] DELETE with valid itemId
  - [ ] Returns 200 OK
  - [ ] Item removed from array
  - [ ] Inventory released
  - [ ] Totals recalculated
  - [ ] Timeline event item.deleted created

- [ ] DELETE non-existent item
  - [ ] Returns 404 Not Found

- [ ] DELETE from shipped order
  - [ ] Returns 400 Bad Request

### List Items
- [ ] GET /api/orders/:id/items
  - [ ] Returns 200 OK
  - [ ] Returns items array
  - [ ] Returns pagination object
  - [ ] Returns order totals

- [ ] GET with page parameter
  - [ ] Pagination applied correctly
  - [ ] Items offset by (page - 1) * limit

- [ ] GET with limit parameter
  - [ ] Results limited to specified count

### Get Single Item
- [ ] GET /api/orders/:id/items/:itemId
  - [ ] Returns 200 OK
  - [ ] Returns single item object

---

## ADMIN UI TESTING

- [ ] **Items Section**
  - [ ] Shows item count
  - [ ] "Add Item" button visible
  - [ ] Items table displays correctly
  - [ ] Edit button visible per item
  - [ ] Delete button visible per item

- [ ] **Add Item Modal**
  - [ ] Opens when "Add Item" clicked
  - [ ] Form fields visible: Product ID, Variant SKU, Qty, Price Override
  - [ ] Cancel button closes modal
  - [ ] Submit button disabled if required fields empty
  - [ ] Error message shows on submit failure
  - [ ] Success closes modal and updates table
  - [ ] Loading state shows during submit

- [ ] **Edit Item Modal**
  - [ ] Opens when "Edit" clicked
  - [ ] Form pre-populated with current values
  - [ ] Qty field editable
  - [ ] Price Override field editable
  - [ ] Variant SKU field editable
  - [ ] Cancel button closes modal
  - [ ] Update button submits
  - [ ] Success closes modal and updates table
  - [ ] Loading state shows during submit

- [ ] **Totals Update**
  - [ ] After add item, totals recalculate
  - [ ] After update qty, totals change
  - [ ] After delete item, totals decrease
  - [ ] Grand total is correct: subtotal + tax - discount + shipping

- [ ] **Order Status Lock**
  - [ ] Add/Edit/Delete buttons disabled if status === 'shipped'
  - [ ] Add/Edit/Delete buttons disabled if status === 'delivered'
  - [ ] Add/Edit/Delete buttons disabled if status === 'cancelled'
  - [ ] Buttons enabled if status === 'pending' or 'confirmed'

---

## INVENTORY INTEGRATION

- [ ] **Reserve on Add**
  - [ ] Add item (qty: 5)
  - [ ] Check Inventory.reserved increased by 5
  - [ ] Check available = stockOnHand - reserved

- [ ] **Adjust on Update**
  - [ ] Update qty from 5 to 10 (delta: 5)
  - [ ] Check Inventory.reserved increased by 5
  - [ ] Update qty from 10 to 3 (delta: -7)
  - [ ] Check Inventory.reserved decreased by 7

- [ ] **Release on Delete**
  - [ ] Delete item (qty: 3)
  - [ ] Check Inventory.reserved decreased by 3

- [ ] **Commit on Payment**
  - [ ] Call commitOrderInventory(orderId)
  - [ ] Verify audit entry with action='commit'
  - [ ] Check inventory remains same (reserved unchanged)

- [ ] **Atomic Operations**
  - [ ] Concurrent requests don't cause overselling
  - [ ] Reserve operation fails if available < qty
  - [ ] No race conditions in inventory updates

---

## ERROR HANDLING

- [ ] **All Error Codes Working**
  - [ ] ITEM_NOT_FOUND (404)
  - [ ] ORDER_NOT_FOUND (404)
  - [ ] PRODUCT_NOT_FOUND (404)
  - [ ] VARIANT_NOT_FOUND (404)
  - [ ] INSUFFICIENT_STOCK (400)
  - [ ] CANNOT_MODIFY_SHIPPED (400)
  - [ ] INVENTORY_SYNC_ERROR (500)
  - [ ] VALIDATION_ERROR (400)

- [ ] **Error Response Format**
  - [ ] Includes error message
  - [ ] Includes error code
  - [ ] Includes HTTP status code
  - [ ] Optionally includes details

- [ ] **Validation Errors**
  - [ ] qty < 1: "Quantity must be at least 1"
  - [ ] qty > 100: "Max 100 per item"
  - [ ] Missing productId: "Product ID required"
  - [ ] Missing variantSku: "Variant SKU required"

---

## TIMELINE AUDIT

- [ ] **item.added Event**
  - [ ] Created when item added
  - [ ] actor: 'admin' or 'system'
  - [ ] action: 'item.added'
  - [ ] meta includes: itemId, productId, variantSku, qty, price, note

- [ ] **item.updated Event**
  - [ ] Created when item updated
  - [ ] action: 'item.updated'
  - [ ] meta includes: itemId, changes (qtyFrom, qtyTo, priceFrom, priceTo)

- [ ] **item.deleted Event**
  - [ ] Created when item deleted
  - [ ] action: 'item.deleted'
  - [ ] meta includes: itemId, qty, price, reason, note

---

## PERFORMANCE TESTING

- [ ] **Response Times**
  - [ ] GET /api/orders/:id/items: < 50ms
  - [ ] POST /api/orders/:id/items: < 100ms
  - [ ] PATCH /api/orders/:id/items/:itemId: < 100ms
  - [ ] DELETE /api/orders/:id/items/:itemId: < 100ms

- [ ] **Database Performance**
  - [ ] Queries using indexes (variantSku, productId)
  - [ ] No N+1 queries
  - [ ] Pagination working correctly
  - [ ] No full table scans

- [ ] **UI Performance**
  - [ ] Modal opens within 200ms
  - [ ] Table renders with 50+ items smoothly
  - [ ] Totals update immediately
  - [ ] No lag on button clicks

---

## TEST EXECUTION

- [ ] **Run Test Suite**
  ```bash
  npm test -- __tests__/orderItemService.test.ts
  ```
  - [ ] All tests pass
  - [ ] No errors in console
  - [ ] Coverage > 80%

- [ ] **Run Specific Test**
  ```bash
  npm test -- __tests__/orderItemService.test.ts -t "addOrderItem"
  ```
  - [ ] Can filter by test name
  - [ ] Tests run in isolation

- [ ] **Check Coverage**
  ```bash
  npm test -- --coverage orderItemService
  ```
  - [ ] Lines covered: > 80%
  - [ ] Branches covered: > 75%
  - [ ] Functions covered: 100%

---

## DEPLOYMENT

- [ ] **Pre-deployment Checks**
  - [ ] All tests passing
  - [ ] No TypeScript errors
  - [ ] No console.log statements
  - [ ] Error logging configured

- [ ] **Database Indexes**
  - [ ] All 3 indexes created
  - [ ] No duplicate indexes
  - [ ] Indexes verified in MongoDB

- [ ] **Environment Variables**
  - [ ] MONGODB_URI set
  - [ ] NODE_ENV set to 'production'
  - [ ] Admin authentication configured

- [ ] **Build & Deploy**
  ```bash
  npm run build
  ```
  - [ ] Build completes without errors
  - [ ] No warnings in output
  - [ ] File sizes reasonable

- [ ] **Post-deployment Verification**
  - [ ] API endpoints responding
  - [ ] Admin UI loading correctly
  - [ ] Inventory sync working
  - [ ] Errors logged to monitoring service

---

## MONITORING & ALERTS

- [ ] **Setup Alerts For:**
  - [ ] Inventory sync errors (action: 'INVENTORY_SYNC_ERROR')
  - [ ] Insufficient stock errors (action: 'INSUFFICIENT_STOCK')
  - [ ] Shipping order modifications (action: 'CANNOT_MODIFY_SHIPPED')
  - [ ] API 5xx errors

- [ ] **Monitor Metrics:**
  - [ ] Items added per day
  - [ ] Items updated per day
  - [ ] Items deleted per day
  - [ ] Average response time
  - [ ] Error rate

- [ ] **Setup Logging:**
  - [ ] Log all item mutations (add/update/delete)
  - [ ] Log all inventory operations
  - [ ] Log all errors with full context
  - [ ] Store logs for audit trail

---

## INTEGRATION WITH OTHER MODULES

- [ ] **Order Module**
  - [ ] Order.items supports IOrderItem type
  - [ ] Order.totals updates after item changes
  - [ ] Order.timeline supports item.* events
  - [ ] Order status prevents modification if shipped

- [ ] **Product Module**
  - [ ] Product.variants has sku field
  - [ ] Product.variants has price field
  - [ ] Can fetch variant by SKU
  - [ ] Can check variant.isActive

- [ ] **Inventory Module**
  - [ ] Inventory collection exists
  - [ ] Inventory has variantSku field
  - [ ] Can call reserveInventory()
  - [ ] Can call releaseInventory()
  - [ ] Can call adjustInventory()

- [ ] **Payment Module**
  - [ ] Payment webhook calls commitOrderInventory()
  - [ ] After payment.success, inventory is committed
  - [ ] Audit trail updated with commit event

---

## CUSTOMER EXPERIENCE

- [ ] **Order Confirmation Page**
  - [ ] Displays all items
  - [ ] Shows variant options (size, color)
  - [ ] Shows qty and price per item
  - [ ] Shows correct totals

- [ ] **Order History Page**
  - [ ] Lists all customer orders
  - [ ] Shows items per order
  - [ ] Can expand to see details
  - [ ] Shows variant details

- [ ] **Mobile Responsiveness**
  - [ ] Items table responsive
  - [ ] Modals work on small screens
  - [ ] Buttons clickable on touch
  - [ ] No horizontal scroll

---

## DOCUMENTATION REVIEW

- [ ] **ORDER_ITEMS_GUIDE.md**
  - [ ] All 15 sections complete
  - [ ] All code examples correct
  - [ ] API documentation accurate
  - [ ] Integration checklist comprehensive

- [ ] **ORDER_ITEMS_CODE_SAMPLES.md**
  - [ ] 3 snippets included
  - [ ] API examples working
  - [ ] Inventory flow explained
  - [ ] Validation examples clear

- [ ] **Inline Documentation**
  - [ ] All functions have JSDoc
  - [ ] Parameters documented
  - [ ] Return types documented
  - [ ] Error handling explained

---

## SIGN-OFF

- [ ] **Code Review**
  - [ ] Reviewed by another developer
  - [ ] No major issues found
  - [ ] Approved for merging

- [ ] **QA Testing**
  - [ ] QA team tested all flows
  - [ ] All bugs fixed
  - [ ] Approved for production

- [ ] **Product Owner Sign-off**
  - [ ] Requirements met
  - [ ] User stories completed
  - [ ] Ready for production release

---

## FINAL CHECKLIST

- [ ] All 12 requirements fulfilled
- [ ] All 10 files created
- [ ] All tests passing (30+)
- [ ] All documentation complete
- [ ] Admin UI tested
- [ ] API tested
- [ ] Inventory sync verified
- [ ] Database indexes created
- [ ] Error handling working
- [ ] Performance optimized
- [ ] Type safety confirmed
- [ ] Security verified
- [ ] Ready for production

---

**Status: ✅ COMPLETE**

**Next: Proceed to ANTIGRAVITY PROMPT #9 (Shipments & Tracking)**

---

**Questions?** See ORDER_ITEMS_GUIDE.md Section 14 (Troubleshooting) or review test cases in __tests__/orderItemService.test.ts
