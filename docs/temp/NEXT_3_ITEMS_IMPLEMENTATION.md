# 🚀 ZNM IMPLEMENTATION QUICK START — NEXT 3 ITEMS

**Status**: Ready for Implementation  
**Target Timeline**: Next 2-3 weeks  
**Complexity**: Medium (4-10 hours each)

---

## 📋 ITEM #13: COURIER COST CALCULATION

**Objective**: Calculate shipping costs based on courier, weight, distance, and destination

**Estimated Time**: 4-6 hours  
**Priority**: HIGH (needed for orders)  
**Complexity**: Medium

### Data Model (courier.service.ts pattern)

```typescript
// models/CourierModel.ts
interface ICourierRate {
  courierId: string;           // Express, Standard, Economy
  carrierName: string;          // "Delhivery", "Shiprocket", etc.
  basePrice: number;            // Base fare
  weightSlab: {                 // Per kg pricing
    upTo1kg: number;
    upTo5kg: number;
    upTo10kg: number;
    upTo20kg: number;
    additionalPerKg: number;
  };
  destinations: {
    sameState: number;          // Base multiplier
    otherState: number;         // Base multiplier
    nothNorthEast: number;      // Special zones
  };
  serviceType: 'express' | 'standard' | 'economy';
  isActive: boolean;
  createdAt: Date;
}
```

### Service Methods

```typescript
// lib/services/courierService.ts
export class CourierService {
  // Calculate shipping cost
  calculateShippingCost(
    weight: number,
    sourcePin: string,
    destPin: string,
    courierId: string
  ): Promise<number>
  
  // Get available couriers for route
  getAvailableCouriers(sourcePin: string, destPin: string): Promise<ICourierRate[]>
  
  // List all courier rates
  listRates(filters?): Promise<ICourierRate[]>
  
  // Update rate
  updateRate(courierId: string, data): Promise<ICourierRate>
  
  // Delete rate
  deleteRate(courierId: string): Promise<void>
}
```

### API Routes

```typescript
// app/api/admin/courier-rates/route.ts
POST   /api/admin/courier-rates              // Create rate
GET    /api/admin/courier-rates              // List rates
PATCH  /api/admin/courier-rates/:id          // Update rate
DELETE /api/admin/courier-rates/:id          // Delete rate

// app/api/shipping/calculate-cost/route.ts
POST   /api/shipping/calculate-cost          // Customer: Calculate cost
Body: { weight, sourcePin, destPin, courierId }
Response: { cost: number, courier: string }
```

### Admin UI

```typescript
// app/admin/logistics/courier-rates/page.tsx
- Table of all courier rates
- Filter by courier, service type
- Edit modal with weight slabs
- Regional pricing adjustments
- Test calculator
```

### Integration Points

```typescript
// In shipmentService.ts or checkoutService.ts
const cost = await CourierService.calculateShippingCost(
  order.weight,
  order.shippingInfo.pincode,
  destPincode,
  selectedCourier
);

// Add to order total
order.shippingCost = cost;
```

### Testing

```typescript
// __tests__/courierService.test.ts
✓ Calculate cost for same-state delivery
✓ Calculate cost for other-state delivery
✓ Weight slab calculation (1kg, 5kg, 10kg)
✓ Additional kg charges
✓ Get available couriers for route
✓ Regional pricing multipliers
✓ Exception for NE states
```

---

## 📋 ITEM #14: DELIVERY DATE + REMINDERS

**Objective**: Estimate delivery dates and send customer reminders

**Estimated Time**: 6-8 hours  
**Priority**: HIGH (customer experience)  
**Complexity**: Medium

### Data Model

```typescript
// In OrderModel.ts
interface IOrder {
  // ... existing fields
  estimatedDeliveryDate: Date;    // Calculated at shipment
  actualDeliveryDate?: Date;      // Set when delivered
  remindersSent: {
    onShipped: boolean;
    dayBefore: boolean;
    dayOf: boolean;
  };
  lastReminderAt?: Date;
}
```

### Service Methods

```typescript
// lib/services/deliveryService.ts
export class DeliveryService {
  // Calculate estimated delivery date
  calculateEstimatedDelivery(
    shipmentDate: Date,
    courier: string,
    destination: string
  ): Date
  
  // Send delivery reminders (cron job)
  async sendDeliveryReminders(): Promise<void>
  
  // Get delivery status
  async getDeliveryStatus(orderId: string): Promise<DeliveryStatus>
  
  // Update tracking info
  async updateTracking(orderId: string, tracking): Promise<void>
}
```

### Background Job (Cron)

```typescript
// lib/workers/deliveryReminder.ts
import cron from 'node-cron';

// Run every day at 9 AM
cron.schedule('0 9 * * *', async () => {
  // 1. Find shipments delivering today/tomorrow
  const shipments = await Shipment.find({
    estimatedDeliveryDate: {
      $gte: startOfDay,
      $lte: endOfDay
    },
    'remindersSent.dayBefore': false
  });
  
  // 2. Send reminder email for each
  for (const shipment of shipments) {
    await sendDeliveryReminderEmail(shipment);
    await Shipment.updateOne(
      { _id: shipment._id },
      { 'remindersSent.dayBefore': true }
    );
  }
});
```

### Email Template

```typescript
// lib/email/templates/deliveryReminder.ts
export const deliveryReminderEmail = (order, shipment) => `
  <h2>Your order is arriving soon!</h2>
  <p>Order ${order.orderId} is scheduled for delivery on ${shipment.estimatedDeliveryDate}</p>
  <p>Tracking: ${shipment.trackingId}</p>
  <p>Carrier: ${shipment.carrier}</p>
  <a href="...">Track your order</a>
`;
```

### API Routes

```typescript
// app/api/orders/[id]/delivery-date/route.ts
GET    /api/orders/:id/delivery-date     // Get estimated delivery
Response: {
  estimatedDate: Date,
  carrier: string,
  trackingId: string,
  lastUpdate: Date
}
```

### Admin UI

```typescript
// app/admin/logistics/delivery-tracking/page.tsx
- Orders grouped by delivery date
- Delivery date estimates
- Tracking status
- Reminder sent status
- Manual reminder button
- Delivery performance metrics
```

### Integration Points

```typescript
// In shipmentService.ts
const estimatedDelivery = DeliveryService.calculateEstimatedDelivery(
  new Date(),
  shipment.carrier,
  order.shippingInfo.state
);

shipment.estimatedDeliveryDate = estimatedDelivery;
```

### Testing

```typescript
// __tests__/deliveryService.test.ts
✓ Calculate delivery date (standard service: 3-5 days)
✓ Calculate delivery date (express service: 1-2 days)
✓ NE state special handling (7-10 days)
✓ Send reminder email one day before
✓ Mark reminder as sent
✓ Get delivery status
✓ Update tracking info
```

---

## 📋 ITEM #15: WORKER ASSIGNMENT (Pick/Pack)

**Objective**: Assign orders to workers for picking and packing

**Estimated Time**: 8-10 hours  
**Priority**: HIGH (operations)  
**Complexity**: Medium-High

### Data Model

```typescript
// models/WorkerAssignmentModel.ts
interface IWorkerAssignment {
  _id: ObjectId;
  orderId: ObjectId;
  assignedTo: {
    userId: ObjectId;           // Worker user ID
    name: string;
    role: 'picker' | 'packer' | 'both';
  };
  assignmentType: 'pick' | 'pack' | 'both';
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  
  // Picking details
  pickedAt?: Date;
  pickedBy?: ObjectId;
  pickedItems: {
    itemId: string;
    quantity: number;
    notes: string;
  }[];
  
  // Packing details
  packedAt?: Date;
  packedBy?: ObjectId;
  packageWeight?: number;
  packageDimensions?: { length, width, height };
  packageNotes?: string;
  
  // Quality check
  qcStatus?: 'pending' | 'pass' | 'fail';
  qcNotes?: string;
  
  // Tracking
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  timeToComplete?: number; // minutes
}
```

### Service Methods

```typescript
// lib/services/workerService.ts
export class WorkerService {
  // Assign order to worker
  assignOrder(
    orderId: string,
    workerId: string,
    assignmentType: 'pick' | 'pack' | 'both'
  ): Promise<IWorkerAssignment>
  
  // Get worker's pending jobs
  getWorkerJobs(workerId: string): Promise<IWorkerAssignment[]>
  
  // Start picking
  startPicking(assignmentId: string): Promise<void>
  
  // Mark items as picked
  markItemPicked(
    assignmentId: string,
    itemId: string,
    quantity: number
  ): Promise<void>
  
  // Complete picking
  completePicking(assignmentId: string): Promise<void>
  
  // Start packing
  startPacking(assignmentId: string): Promise<void>
  
  // Complete packing
  completePacking(
    assignmentId: string,
    weight: number,
    dimensions: any
  ): Promise<void>
  
  // Quality check
  qcApprove(assignmentId: string): Promise<void>
  qcReject(assignmentId: string, notes: string): Promise<void>
  
  // Get worker performance metrics
  getWorkerMetrics(
    workerId: string,
    dateRange: { from: Date, to: Date }
  ): Promise<{
    totalOrders: number;
    avgTimePerOrder: number;
    qcPassRate: number;
    accuracy: number;
  }>
}
```

### API Routes

```typescript
// app/api/admin/worker-assignments/route.ts
POST   /api/admin/worker-assignments             // Assign order
GET    /api/admin/worker-assignments             // List assignments

// app/api/admin/worker-assignments/[id]/route.ts
GET    /api/admin/worker-assignments/:id         // Get assignment
PATCH  /api/admin/worker-assignments/:id         // Update status

// Worker mobile app / terminal
// app/api/worker/assignments/route.ts
GET    /api/worker/assignments                   // Get my jobs (auth: worker)
PATCH  /api/worker/assignments/:id/pick          // Mark picked
PATCH  /api/worker/assignments/:id/pack          // Mark packed
POST   /api/worker/assignments/:id/complete      // Complete job
```

### Admin UI

```typescript
// app/admin/operations/worker-assignments/page.ts
- List of pending orders
- Worker dropdown (filter by availability)
- Bulk assign multiple orders
- View assignment status in real-time
- Worker dashboard showing:
  - Assigned orders
  - In-progress
  - Completed
  - Performance metrics

// app/admin/operations/worker-performance/page.tsx
- Worker list with metrics:
  - Orders completed
  - Avg time per order
  - QC pass rate
  - Accuracy
  - Daily/weekly leaderboard
```

### Worker Mobile/Terminal Interface

```typescript
// app/worker/dashboard/page.tsx (or mobile app)
- My pending jobs (pick/pack)
- Job details with items
- Barcode scanning for items
- Photo capture for QC
- Time tracking
- Mark complete
```

### Integration Points

```typescript
// In orderService.ts - when order status = 'pending'
async createOrder(orderData) {
  const order = await Order.create(orderData);
  
  // Auto-assign based on:
  // 1. Worker availability
  // 2. Order priority (express vs standard)
  // 3. Warehouse zone
  
  const assignment = await WorkerService.assignOrder(
    order._id,
    nextAvailableWorker,
    'both'  // pick + pack
  );
  
  return { order, assignment };
}

// In shipmentService.ts - when order packed
async fulfillOrder(orderId) {
  const assignment = await WorkerAssignment.findOne({ orderId });
  if (assignment.status !== 'completed') {
    throw new Error('Order not yet packed by worker');
  }
  // Continue with shipment creation
}
```

### Background Jobs

```typescript
// lib/workers/autoAssignOrders.ts
// Run every 30 minutes
cron.schedule('*/30 * * * *', async () => {
  // Find unassigned orders
  const unassigned = await Order.find({
    status: 'pending',
    assignment: null
  });
  
  // Get available workers
  const workers = await User.find({
    role: { $in: ['picker', 'packer'] },
    isActive: true
  });
  
  // Assign intelligently
  for (const order of unassigned) {
    const leastBusy = workers.sort((a, b) =>
      a.pendingAssignments - b.pendingAssignments
    )[0];
    
    await WorkerService.assignOrder(
      order._id,
      leastBusy._id,
      'both'
    );
  }
});
```

### Testing

```typescript
// __tests__/workerService.test.ts
✓ Assign order to worker
✓ Get worker's pending jobs
✓ Start picking
✓ Mark items picked
✓ Complete picking
✓ Start packing
✓ Complete packing with dimensions
✓ QC approve/reject
✓ Calculate worker metrics
✓ Auto-assign to least busy worker
✓ Prevent assignment if worker overloaded
✓ Track time to complete
```

### Performance Metrics Dashboard

```typescript
// Metrics to track
- Orders per worker per day
- Average time to pick
- Average time to pack
- QC pass rate
- Accuracy rate
- Cost per order
```

---

## 📊 IMPLEMENTATION SEQUENCE

```
WEEK 1: Courier Cost Calculation
├─ Day 1: Create CourierModel + Service
├─ Day 2: Create API routes
├─ Day 3: Admin UI + Testing

WEEK 2: Delivery Date + Reminders
├─ Day 1: Add fields to OrderModel
├─ Day 2: Create DeliveryService + Email template
├─ Day 3: Cron job + API routes
├─ Day 4: Customer UI + Testing

WEEK 3: Worker Assignment
├─ Day 1: Create WorkerAssignmentModel + Service
├─ Day 2: Admin assignment UI
├─ Day 3: Worker mobile/terminal interface
├─ Day 4: Background job + Auto-assignment
├─ Day 5: Testing + Performance dashboard
```

---

## 🔗 DEPENDENCIES & BLOCKERS

### ✅ Already Available
- Orders system (✅ ITEM #7)
- Shipments (✅ ITEM #12)
- Payments (✅ ITEM #9)
- Worker roles (✅ ITEM #2)
- Email system (setup.ts)
- Cron job library (already in package.json)

### ⏳ Must Complete Before
- Nothing blocking these 3 items

### 📦 New Dependencies Needed
```json
{
  "node-cron": "^3.0.0",        // For background jobs
  "zod": "^3.0.0",               // Validation (already in project)
  "axios": "^1.6.0"              // HTTP calls (already in project)
}
```

---

## 📝 CODE STRUCTURE

Each implementation should follow this pattern:

```
ITEM #X: [Name]
├─ models/[ModelName]Model.ts          (50-100 lines)
├─ lib/services/[service]Service.ts    (200-400 lines)
├─ app/api/admin/[endpoint]/route.ts   (100-200 lines)
├─ app/api/worker/[endpoint]/route.ts  (100-200 lines) [if needed]
├─ app/admin/[section]/page.tsx        (300-500 lines)
├─ lib/workers/[job]Scheduler.ts       (50-150 lines) [if needed]
├─ __tests__/[service]Service.test.ts  (200-400 lines)
└─ docs/[FEATURE]_IMPLEMENTATION.md    (500+ lines)
```

---

## 🎯 SUCCESS CRITERIA

### ✅ Courier Cost Calculation Complete When:
- [ ] CourierModel created with weight slabs
- [ ] Service calculates cost for all regions
- [ ] API endpoint working with curl test
- [ ] Admin can create/update courier rates
- [ ] All tests passing
- [ ] Integrated with checkout

### ✅ Delivery Reminders Complete When:
- [ ] EstimatedDeliveryDate calculated correctly
- [ ] Reminders sent at 24h and on day of delivery
- [ ] Email template professional
- [ ] Customer can see delivery estimate
- [ ] Admin can manual trigger reminders
- [ ] All tests passing

### ✅ Worker Assignment Complete When:
- [ ] Orders auto-assigned to available workers
- [ ] Workers can see pending jobs
- [ ] Can mark items picked/packed
- [ ] QC approve/reject workflow works
- [ ] Performance metrics calculated
- [ ] All tests passing

---

**Ready to start? Pick one and create its model first!**
