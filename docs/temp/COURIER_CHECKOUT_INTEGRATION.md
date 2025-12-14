# Courier Cost Calculation - Checkout Integration

## Overview
The Courier Cost Calculation system is now integrated with the checkout flow. Shipping costs are automatically calculated when orders are created based on the customer's address, order weight, and payment method.

## Integration Points

### 1. Order Creation (Automatic Calculation)
**Location:** `lib/services/orderService.ts` - `createOrder()` function

When a customer creates an order, the system automatically:
1. Calls `courierRateService.calculateShippingCost()` with:
   - Courier: 'Delhivery' (default, configurable)
   - Pincode: From customer's delivery address
   - Weight: Calculated from order items
   - Order Value: From order subtotal
   - Payment Method: COD or prepaid

2. Updates the order totals with calculated shipping cost
3. Logs shipping cost in timeline events

**Code Example:**
```typescript
// In createOrder() function
const shippingResult = await courierRateService.calculateShippingCost({
  courierName: data.courierName || 'Delhivery',
  pincode: data.address.pincode,
  weight: calculateOrderWeight(data.items),
  orderValue: data.totals.subtotal,
  paymentMethod: data.paymentMethod === 'cod' ? 'cod' : 'paid',
});

order.totals.shipping = shippingResult.totalCost;
```

### 2. Order Weight Calculation
**Helper Function:** `calculateOrderWeight(items)`

Calculates total weight from order items:
```typescript
function calculateOrderWeight(items: any[]): number {
  return items.reduce((total, item) => {
    const itemWeight = item.weight || 0.5;
    const quantity = item.qty || 1;
    return total + itemWeight * quantity;
  }, 0);
}
```

### 3. Manual Shipping Cost Override
**For Admin/Manual Creation:**
If `data.totals.shipping` is already provided, it won't be recalculated.

This allows admins to manually set shipping costs if needed.

## Frontend Integration (When Ready)

### Checkout Form - Display Shipping Cost Preview
```tsx
// components/Checkout/ShippingCostPreview.tsx
export async function getShippingEstimate(params: {
  courierName: string;
  pincode: string;
  weight: number;
  orderValue: number;
  paymentMethod: 'cod' | 'paid';
}) {
  const response = await fetch('/api/courier-rates/calculate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  
  if (!response.ok) throw new Error('Failed to calculate shipping');
  const data = await response.json();
  return data.result;
}

// In checkout form:
const shipping = await getShippingEstimate({
  courierName: 'Delhivery',
  pincode: formData.pincode,
  weight: cart.totalWeight,
  orderValue: cart.subtotal,
  paymentMethod: formData.paymentMethod
});
```

## API Flow

### 1. Create Order (Customer)
```
POST /api/orders
{
  customerId: string,
  items: OrderItem[],
  address: Address,
  paymentMethod: 'cod' | 'paid',
  courierName?: string  // Optional, defaults to 'Delhivery'
}

Response: Order with calculated shipping cost
```

### 2. Calculate Shipping (Customer)
```
POST /api/courier-rates/calculate
{
  courierName: string,
  pincode: string,
  weight: number,
  orderValue: number,
  paymentMethod: 'cod' | 'paid'
}

Response: { baseCost, extraCharge, discount, totalCost, zone }
```

## Order Model Updates

The Order model already supports shipping cost tracking:
```typescript
totals: {
  subtotal: number,
  discount: number,
  shipping: number,  // ← Populated by courier calculation
  tax: number,
  grandTotal: number
}
```

## Timeline Integration

When order is created, shipping cost is logged in timeline:
```typescript
order.addTimelineEvent('order.created', 'system', {
  paymentMethod: data.paymentMethod,
  totalItems: data.items.length,
  shippingCost: shippingCost  // ← Logged here
});
```

## Error Handling

If shipping cost calculation fails:
1. System logs the error
2. Uses provided shipping cost or defaults to 0
3. Order creation continues (doesn't fail)
4. Admin can manually adjust shipping cost later

```typescript
try {
  shippingCost = await courierRateService.calculateShippingCost(...);
} catch (error) {
  console.warn('Could not calculate shipping cost:', error);
  // Fall back to provided or default
}
```

## Configuration

### Default Courier
Currently hardcoded to 'Delhivery', but can be made configurable:

```typescript
// Option 1: Pass via request
POST /api/orders
{
  courierName: 'Shiprocket'  // Override default
}

// Option 2: Set in environment
NEXT_PUBLIC_DEFAULT_COURIER=Delhivery

// Option 3: Admin settings
// Fetch from database settings collection
```

### Supported Couriers
- Delhivery
- Shiprocket
- Fedex
- DTDC
- Ecom
- BlueDart
- Other (custom)

## Testing

### Test Cases Added to Order Tests
```typescript
// Test: Order created with calculated shipping cost
it('should calculate and add shipping cost to order', async () => {
  // Create order
  // Assert: order.totals.shipping > 0
  // Assert: Timeline includes shipping cost
});

// Test: Manual shipping override
it('should use provided shipping cost if specified', async () => {
  // Create order with pre-calculated shipping
  // Assert: order.totals.shipping equals provided value
});
```

## Troubleshooting

### Shipping Cost Not Calculated
1. Check if pincode is in courier's service zones
2. Verify order weight is within supported range
3. Check if courier rate is active
4. Review logs for specific error

### Wrong Shipping Cost
1. Verify item weights are set correctly
2. Check courier rate configuration
3. Confirm COD vs Prepaid setting matches payment method

### Integration Issues
1. Verify courierRateService is properly imported
2. Check database connection
3. Verify courier rates exist in database

## Next Steps

1. **Frontend Integration** - Add shipping calculator to checkout form
2. **Shipping Preview** - Show real-time cost as customer updates address
3. **Courier Selection** - Let customer choose between couriers
4. **Analytics** - Track shipping costs and trends
5. **Notification** - Email shipping cost to customer

## API Reference

See `docs/COURIER_COST_CALCULATION.md` for complete API documentation.

---

**Status:** ✅ Integrated with checkout
**Test Coverage:** Integrated order tests
**Date:** December 14, 2025
