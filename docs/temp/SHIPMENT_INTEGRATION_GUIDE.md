# 🚀 SHIPMENT MODULE - INTEGRATION GUIDE

**Quick Setup: 5 minutes**

---

## STEP 1: HOOK INTO ORDER CONFIRMATION

Find where orders are confirmed (likely in `/app/api/orders/route.ts` or order service).

### Add Auto-Shipment Creation

```typescript
import ShipmentService from '@/lib/services/shipmentService';

// After order is confirmed
if (order.status === 'confirmed') {
  // Auto-create shipment
  const shipment = await ShipmentService.autoCreateShipment(order._id.toString());
  console.log('Shipment auto-created:', shipment._id);
}
```

**What happens:**
- Shipment created with status `'created'`
- Default courier: Delhivery
- Timeline event: `shipment.created`
- Prevents duplicates

---

## STEP 2: HOOK INTO ORDER CANCELLATION

Find order cancellation handler.

### Cancel Associated Shipment

```typescript
import ShipmentService from '@/lib/services/shipmentService';

// When order is cancelled
const shipment = await ShipmentService.getShipmentForOrder(order._id.toString());
if (shipment && shipment.status !== 'delivered') {
  await ShipmentService.cancelShipment(shipment._id.toString());
}
```

**What happens:**
- Shipment marked as `'cancelled'`
- Timeline event: `shipment.cancelled`
- Customer can see cancellation

---

## STEP 3: ADD CUSTOMER TRACKING ENDPOINT

Create a simple customer endpoint to fetch tracking:

```typescript
// app/api/orders/[id]/tracking/route.ts

import { NextRequest, NextResponse } from 'next/server';
import ShipmentService from '@/lib/services/shipmentService';
import { verifyCustomerAuth } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify customer owns this order
    const { customerId } = await verifyCustomerAuth(request);
    
    const order = await Order.findById(params.id);
    if (!order || order.customerId.toString() !== customerId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get tracking info
    const tracking = await ShipmentService.getTrackingInfo(params.id);

    return NextResponse.json({
      success: true,
      data: tracking
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    );
  }
}
```

---

## STEP 4: ADMIN UI INTEGRATION

### Add to Admin Order Page (DO NOT BREAK EXISTING)

```typescript
// app/admin/orders/page.tsx - Add these lines in the action buttons area

// NEW: Add Shipment Section
<div className="shipment-section">
  <h4>Shipment Management</h4>
  
  {activeShipment ? (
    <>
      <p>Status: <strong>{activeShipment.status}</strong></p>
      <p>Courier: {activeShipment.courierName}</p>
      {activeShipment.trackingNumber && (
        <p>Tracking: <a href={activeShipment.trackingUrl} target="_blank">
          {activeShipment.trackingNumber}
        </a></p>
      )}
      <button onClick={() => setShowEditShipment(true)}>
        Edit Shipment
      </button>
    </>
  ) : (
    <button onClick={() => setShowCreateShipment(true)}>
      Create Shipment
    </button>
  )}
</div>

{/* NEW: Create Modal */}
{showCreateShipment && (
  <ShipmentCreateModal
    orderId={order._id}
    onSuccess={() => {
      setShowCreateShipment(false);
      refetchOrder();
    }}
    onClose={() => setShowCreateShipment(false)}
  />
)}

{/* NEW: Edit Modal */}
{showEditShipment && activeShipment && (
  <ShipmentEditModal
    shipment={activeShipment}
    onSuccess={() => {
      setShowEditShipment(false);
      refetchOrder();
    }}
    onClose={() => setShowEditShipment(false)}
  />
)}
```

### Create Shipment Modal Component

```typescript
// components/Admin/ShipmentCreateModal.tsx

import React, { useState } from 'react';

interface Props {
  orderId: string;
  onSuccess: () => void;
  onClose: () => void;
}

export function ShipmentCreateModal({ orderId, onSuccess, onClose }: Props) {
  const [courierName, setCourierName] = useState('Delhivery');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/shipments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          courierName,
          trackingNumber,
          trackingUrl,
        }),
      });

      if (!response.ok) throw new Error('Failed to create shipment');

      onSuccess();
    } catch (error) {
      alert('Error: ' + (error as any).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal">
      <h3>Create Shipment</h3>
      
      <select value={courierName} onChange={(e) => setCourierName(e.target.value)}>
        <option>Delhivery</option>
        <option>Shiprocket</option>
        <option>Fedex</option>
        <option>DTDC</option>
        <option>Ecom</option>
        <option>BlueDart</option>
        <option>Other</option>
      </select>

      <input
        type="text"
        placeholder="Tracking Number (optional)"
        value={trackingNumber}
        onChange={(e) => setTrackingNumber(e.target.value)}
      />

      <input
        type="text"
        placeholder="Tracking URL (optional)"
        value={trackingUrl}
        onChange={(e) => setTrackingUrl(e.target.value)}
      />

      <button onClick={handleCreate} disabled={loading}>
        {loading ? 'Creating...' : 'Create Shipment'}
      </button>
      <button onClick={onClose}>Cancel</button>
    </div>
  );
}
```

---

## STEP 5: CUSTOMER UI INTEGRATION

### Add Tracking Display to Order Page

```typescript
// app/checkout/order/[id]/page.tsx - Add tracking section

{order.shipment && (
  <div className="tracking-section">
    <h3>📦 Shipment Status</h3>
    
    <div className="status-badge">
      Status: <strong>{order.shipment.status}</strong>
    </div>

    <p>Courier: <strong>{order.shipment.courierName}</strong></p>

    {order.shipment.trackingNumber && (
      <p>
        Tracking Number:{' '}
        <a 
          href={order.shipment.trackingUrl} 
          target="_blank"
          rel="noopener noreferrer"
        >
          {order.shipment.trackingNumber}
        </a>
      </p>
    )}

    {order.shipment.shippedAt && (
      <p>Shipped: {new Date(order.shipment.shippedAt).toLocaleDateString()}</p>
    )}

    {order.shipment.deliveredAt && (
      <p>Delivered: {new Date(order.shipment.deliveredAt).toLocaleDateString()}</p>
    )}
  </div>
)}
```

---

## TESTING CHECKLIST

- [ ] Auto-shipment created when order confirmed
- [ ] Shipment appears in order timeline
- [ ] Admin can view shipment details
- [ ] Admin can edit courier/tracking
- [ ] Admin can update status (created → picked → shipped → delivered)
- [ ] Admin can cancel shipment
- [ ] Customer sees tracking in order page
- [ ] Tracking link works
- [ ] No existing order UI broken
- [ ] Database indexes created (test: `npm test -- shipmentService.test.ts`)

---

## COMMON ISSUES & FIXES

### Issue: "Order not found" on shipment creation
**Fix:** Ensure orderId is valid ObjectId string, not object
```typescript
// ❌ Wrong
const shipment = await ShipmentService.autoCreateShipment(order);

// ✅ Correct
const shipment = await ShipmentService.autoCreateShipment(order._id.toString());
```

### Issue: Admin routes returning 401
**Fix:** Ensure admin authentication middleware is imported
```typescript
import { verifyAdminAuth } from '@/lib/admin-auth';

export async function POST(request: NextRequest) {
  await verifyAdminAuth(request);  // Add this line
  // ... rest of code
}
```

### Issue: Timeline not updating
**Fix:** Ensure order.timeline is initialized
```typescript
if (!order.timeline) {
  order.timeline = [];
}
order.timeline.push({...});
await order.save();
```

### Issue: Shipment status won't update to 'shipped'
**Fix:** Status must be 'created' or 'picked' first
```typescript
// ✅ Valid flow
shipment.status = 'created'  // Initial
await shipmentService.updateShipment(id, { status: 'picked' });
await shipmentService.updateShipment(id, { status: 'shipped' });

// ❌ Invalid
await shipmentService.updateShipment(id, { status: 'shipped' }); 
// Will fail if current status is 'created'
```

---

## FILE CHECKLIST

```
✅ models/ShipmentModel.ts
✅ lib/services/shipmentService.ts
✅ app/api/shipments/route.ts
✅ app/api/shipments/[id]/route.ts
✅ app/api/shipments/auto-create/route.ts
✅ __tests__/shipmentService.test.ts
✅ docs/SHIPMENT_ARCHITECTURE.md
✅ docs/SHIPMENT_INTEGRATION_GUIDE.md
```

---

## NEXT STEPS

1. **Copy files** from this guide into your codebase
2. **Hook into order confirmation** (Step 1)
3. **Hook into order cancellation** (Step 2)
4. **Add customer tracking endpoint** (Step 3)
5. **Update admin UI** (Step 4)
6. **Run tests:** `npm test -- shipmentService.test.ts`
7. **Test in browser** - follow testing checklist above

---

✨ **Integration complete in ~15 minutes!** ✨

