# System Verification Dashboard - Architecture & Design

## Executive Summary

The System Verification Dashboard (SVD) is an internal QA platform accessible at `localhost:3000/devfurqan`. It provides non-terminal testing of the entire application architecture, business flows, and integrations without requiring direct database manipulation or terminal access.

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                  SYSTEM VERIFICATION DASHBOARD                      │
│                    (localhost:3000/devfurqan)                       │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                        FRONTEND LAYER                               │
├─────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────┐  ┌──────────────┐  ┌──────────────────┐        │
│ │ Dashboard Home  │  │ Test Runner  │  │ Results Viewer   │        │
│ │ - Status        │  │ - Manual     │  │ - History        │        │
│ │ - Quick Links   │  │ - Scheduled  │  │ - Comparisons    │        │
│ └─────────────────┘  └──────────────┘  └──────────────────┘        │
│ ┌─────────────────┐  ┌──────────────┐  ┌──────────────────┐        │
│ │ Architecture    │  │ Payment      │  │ Data Manager     │        │
│ │ Visualizer      │  │ Simulator    │  │ - Seed           │        │
│ │ - Flows         │  │ - Scenarios  │  │ - Reset          │        │
│ │ - Actual        │  │ - Webhook    │  │ - Inspect        │        │
│ └─────────────────┘  └──────────────┘  └──────────────────┘        │
└─────────────────────────────────────────────────────────────────────┘
                              ↓ HTTP
┌─────────────────────────────────────────────────────────────────────┐
│                      API ORCHESTRATION LAYER                        │
├─────────────────────────────────────────────────────────────────────┤
│ /api/devtest/tests         - List available tests                  │
│ /api/devtest/execute       - Execute single test                   │
│ /api/devtest/batch         - Execute multiple tests                │
│ /api/devtest/results       - Get test results                      │
│ /api/devtest/data          - Seed/reset test data                  │
│ /api/devtest/flows         - Get architecture flows                │
│ /api/devtest/payment       - Payment simulation                    │
│ /api/devtest/verify        - Verify system state                   │
└─────────────────────────────────────────────────────────────────────┘
                              ↓ Direct Calls
┌─────────────────────────────────────────────────────────────────────┐
│                    TEST EXECUTION LAYER                             │
├─────────────────────────────────────────────────────────────────────┤
│ ┌───────────────────┐  ┌────────────────┐  ┌─────────────────┐    │
│ │ Unit Logic Tests  │  │ Service Tests  │  │ Integration     │    │
│ │ - Models          │  │ - Validation   │  │ Tests           │    │
│ │ - Utilities       │  │ - Business     │  │ - Order Flow    │    │
│ │ - Helpers         │  │ - Error Codes  │  │ - Payment Flow  │    │
│ └───────────────────┘  └────────────────┘  │ - Refund Flow   │    │
│                                             │ - Inventory     │    │
│ ┌───────────────────┐  ┌────────────────┐  └─────────────────┘    │
│ │ Payment Tests     │  │ E2E Tests      │                          │
│ │ - COD Flow        │  │ - Checkout     │  ┌─────────────────┐    │
│ │ - Online Flow     │  │ - Full Order   │  │ State Verifiers │    │
│ │ - Webhook Tests   │  │ - Multi-step   │  │ - DB Checks     │    │
│ │ - Refund Tests    │  │ - Error Cases  │  │ - Cache Checks  │    │
│ └───────────────────┘  └────────────────┘  │ - Timeline Verify│   │
│                                             └─────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                              ↓ Reads/Writes
┌─────────────────────────────────────────────────────────────────────┐
│                    DATA & SERVICE LAYER                             │
├─────────────────────────────────────────────────────────────────────┤
│ MongoDB (Test Data)      │ Services (OrderService, PaymentService) │
│ - Isolated Test DB       │ - Business Logic                        │
│ - Auto Cleanup           │ - Validation                            │
│ - Snapshots              │ - Integration                           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Test Categories & Structure

### 1. Unit Logic Tests
**Purpose:** Validate individual components in isolation

```
Unit Tests/
├── Models
│   ├── OrderModel validation
│   ├── PaymentModel validation
│   ├── InventoryModel validation
│   └── UserModel validation
├── Utilities
│   ├── Price calculations
│   ├── Tax computations
│   ├── Discount calculations
│   └── Coupon validations
└── Helpers
    ├── Date formatting
    ├── Slug generation
    └── Status mappings
```

### 2. Service Logic Tests
**Purpose:** Test individual service methods with mocked dependencies

```
Service Tests/
├── OrderService
│   ├── createOrder()
│   ├── updateOrderStatus()
│   ├── calculateTotals()
│   └── applyDiscount()
├── PaymentService
│   ├── initiatePayment()
│   ├── confirmPayment()
│   ├── verifySignature()
│   └── refundPayment()
└── InventoryService
    ├── reserveInventory()
    ├── commitReservation()
    ├── releaseReservation()
    └── checkAvailability()
```

### 3. Integration Tests
**Purpose:** Test multi-service interactions

```
Integration Tests/
├── Order → Payment
│   ├── Payment confirmation triggers order transition
│   ├── Payment failure releases inventory
│   └── Refund updates order timeline
├── Order → Inventory
│   ├── Item reservation on order creation
│   ├── Inventory commit on payment
│   └── Release on cancellation
└── Payment → Gateway
    ├── Webhook signature verification
    ├── Idempotent webhook processing
    └── Status synchronization
```

### 4. End-to-End Flow Tests
**Purpose:** Test complete user journeys

```
E2E Tests/
├── COD Order Flow
│   ├── Create order
│   ├── Confirm COD payment
│   ├── Order transitions to confirmed
│   └── Inventory committed
├── Online Payment Flow (Razorpay)
│   ├── Create order
│   ├── Initiate online payment
│   ├── Simulate payment completion
│   ├── Process webhook
│   ├── Verify payment status
│   └── Verify order confirmed
└── Refund Flow
    ├── Create and pay order
    ├── Initiate refund
    ├── Process refund (COD immediate, Online async)
    └── Verify refund status
```

---

## Payment Testing Strategy

### Payment Sandbox Architecture

```
┌──────────────────────────────────┐
│    Payment Test Scenarios        │
├──────────────────────────────────┤
│ 1. Successful Payment            │
│    → Mock gateway returns OK      │
│    → Verify payment.status=paid   │
│    → Verify order.status=confirmed│
│    → Verify inventory committed   │
│                                  │
│ 2. Payment Failure               │
│    → Mock gateway returns error   │
│    → Verify payment.status=failed │
│    → Verify order.status=failed   │
│    → Verify inventory released    │
│                                  │
│ 3. Webhook Scenarios             │
│    a) Normal webhook              │
│       → Verify signature          │
│       → Update payment status     │
│       → Confirm order            │
│                                  │
│    b) Duplicate webhook           │
│       → Detect idempotency key    │
│       → Return 200 without action │
│       → No double-commit          │
│                                  │
│    c) Webhook timeout             │
│       → Payment remains pending   │
│       → Admin can retry           │
│                                  │
│    d) Invalid signature           │
│       → Reject webhook            │
│       → Log security event        │
│       → Alert admin               │
│                                  │
│ 4. Refund Scenarios               │
│    a) Full refund (COD)           │
│       → Immediate completion      │
│       → Verify amount matches     │
│                                  │
│    b) Partial refund (Online)     │
│       → Gateway processes         │
│       → Webhook confirms          │
│       → Status transitions        │
│                                  │
│ 5. Edge Cases                     │
│    a) Duplicate payment creation  │
│       → Return cached response    │
│       → No new payment record     │
│                                  │
│    b) Amount mismatch             │
│       → Reject with error         │
│       → No state change           │
│                                  │
│    c) Order already paid          │
│       → Prevent double-charge     │
│       → Clear error message       │
│                                  │
│ 6. Signature Verification         │
│    a) Valid Razorpay signature    │
│       → Verify HMAC SHA256        │
│       → Accept webhook            │
│                                  │
│    b) Valid Stripe signature      │
│       → Verify timestamp + sig    │
│       → Accept webhook            │
│                                  │
│    c) Invalid signature           │
│       → Reject immediately        │
│       → Don't update state        │
│                                  │
│ 7. Idempotency Tests              │
│    a) Duplicate request           │
│       → Return same response      │
│       → Don't create duplicate    │
│                                  │
│    b) Webhook retry               │
│       → Process only once         │
│       → Don't double-commit       │
│                                  │
└──────────────────────────────────┘
```

---

## Test Data Lifecycle

```
┌─────────────────────────────────────────────┐
│         TEST DATA LIFECYCLE                 │
├─────────────────────────────────────────────┤
│                                             │
│  SETUP PHASE                                │
│  ┌────────────────────────────────────┐    │
│  │ 1. Seed test users                 │    │
│  │ 2. Create test products            │    │
│  │ 3. Create test categories          │    │
│  │ 4. Create test inventory           │    │
│  │ 5. Setup admin accounts            │    │
│  │ 6. Create initial coupons          │    │
│  │ 7. Initialize payment gateway keys │    │
│  └────────────────────────────────────┘    │
│                                             │
│  TEST PHASE                                 │
│  ┌────────────────────────────────────┐    │
│  │ Tests run in isolated transactions  │    │
│  │ Each test:                          │    │
│  │ - Creates data in test namespace    │    │
│  │ - Executes business logic           │    │
│  │ - Verifies state changes            │    │
│  │ - Records results                   │    │
│  └────────────────────────────────────┘    │
│                                             │
│  CLEANUP PHASE                              │
│  ┌────────────────────────────────────┐    │
│  │ 1. Collect test results            │    │
│  │ 2. Store result snapshots          │    │
│  │ 3. Delete test data (transactions) │    │
│  │ 4. Verify cleanup complete         │    │
│  │ 5. Reset to baseline state         │    │
│  └────────────────────────────────────┘    │
│                                             │
│  ARCHIVE PHASE                              │
│  ┌────────────────────────────────────┐    │
│  │ 1. Store historical results        │    │
│  │ 2. Enable result comparisons       │    │
│  │ 3. Track trends                    │    │
│  │ 4. Generate reports                │    │
│  └────────────────────────────────────┘    │
│                                             │
└─────────────────────────────────────────────┘
```

---

## Test Result Format

Every test must return a standardized result object:

```typescript
interface TestResult {
  // Identification
  testId: string;                    // Unique test identifier
  testName: string;                  // Human-readable name
  category: 'unit' | 'service' | 'integration' | 'e2e' | 'payment';
  
  // Status
  status: 'PASS' | 'FAIL' | 'SKIP' | 'ERROR';
  reason?: string;                   // Why it passed/failed
  
  // Diagnostics
  affectedComponent: string;         // Which service/module
  expectedResult: Record<string, any>;
  actualResult: Record<string, any>;
  
  // Timing
  startTime: Date;
  endTime: Date;
  duration: number;                  // Milliseconds
  
  // Details
  assertions: Array<{
    name: string;
    passed: boolean;
    expected: any;
    actual: any;
  }>;
  
  // Error Information
  error?: {
    code: string;
    message: string;
    stack?: string;
  };
  
  // State Changes
  stateChanges: Array<{
    entity: string;                  // Order, Payment, Inventory
    action: string;                  // created, updated, deleted
    before: Record<string, any>;
    after: Record<string, any>;
  }>;
  
  // Data
  testData?: {
    created: Record<string, any>;
    used: Record<string, any>;
  };
}
```

---

## Architecture Flow Visualization Strategy

The dashboard displays TWO parallel flows:

### 1. Planned/Expected Flow
```
Customer Checkout
    ↓
Select Payment Method
    ↓
Create Order
    ↓ (COD)
Create Payment (pending)
    ↓
Admin Confirms
    ↓
Payment Status → Paid
    ↓
Order Status → Confirmed
    ↓
Commit Inventory
    ↓
Order Processing
```

### 2. Actual Executed Flow
Shows what ACTUALLY happened during test execution, with:
- Color coding (green = expected, red = deviation)
- Duration for each step
- State snapshots
- Error details if deviation occurred

### 3. Comparison View
Highlights:
- Steps that matched expectation (✓)
- Steps that deviated from plan (✗)
- Extra steps not in plan
- Missing steps from plan

---

## Security Considerations

### 1. Access Control
- Dashboa`rd only accessible in development mode
- Check `process.env.NODE_ENV === 'development'`
- Optional: Admin-only access via user role

### 2. Data Isolation
- Tests use isolated database transactions
- Automatic cleanup after test completion
- No test data persists to production

### 3. Gateway Security
- All gateway testing uses sandbox/mock APIs
- Never real payment credentials
- HMAC signature verification still enforced
- Mock signatures generated deterministically

### 4. Logging & Audit
- All test executions logged
- Failed tests logged with details
- Security-sensitive operations audited
- No secrets logged

### 5. State Protection
- Tests cannot affect each other
- Transactional isolation
- Snapshot comparisons for verification
- Rollback on error

---

## Error Reporting Format

```typescript
interface ErrorReport {
  // Identification
  errorId: string;
  testId: string;
  timestamp: Date;
  
  // Error Details
  errorCode: string;               // e.g., "SIGNATURE_VERIFICATION_FAILED"
  errorMessage: string;
  errorType: string;               // e.g., "PaymentError", "ValidationError"
  
  // Context
  component: string;               // Which service failed
  operation: string;               // Which operation
  step: number;                    // Which step in flow
  
  // Expected vs Actual
  expectedBehavior: string;
  actualBehavior: string;
  
  // Data
  requestData?: Record<string, any>;
  responseData?: Record<string, any>;
  
  // Stack Trace
  stack?: string;
  
  // Recovery
  suggestedAction: string;
  autoRecoverable: boolean;
  recoverySteps?: string[];
  
  // Impact
  affectedFlows: string[];
  blockedTests: string[];
  
  // Debugging
  debugInfo: {
    dbState: Record<string, any>;
    cacheState: Record<string, any>;
    timelineEvents: Array<{
      timestamp: Date;
      event: string;
      data: Record<string, any>;
    }>;
  };
}
```

---

## Extensibility Design

### Adding a New Test

```
1. Create test file: lib/devtest/tests/[testName].ts
2. Implement TestCase interface
3. Register in test registry
4. Dashboard automatically discovers it
5. No code changes required
```

### Adding a New Service

```
1. Create service test file
2. Implement service test hooks
3. Add to integration flow tests
4. Dashboard auto-includes in verification
```

### Adding a New Flow

```
1. Define flow steps in flows/ directory
2. Implement flow verification logic
3. Dashboard auto-renders flow diagram
4. Tests validate against this flow
```

---

## Frontend Components Structure

```
app/devfurqan/
├── page.tsx                 # Dashboard home
├── layout.tsx              # Layout wrapper
├── components/
│   ├── DashboardHome.tsx    # Home page with quick links
│   ├── TestRunner.tsx       # Manual test execution UI
│   ├── ResultsViewer.tsx    # Test results display
│   ├── ArchitectureVisualizer.tsx
│   ├── PaymentSimulator.tsx
│   ├── DataManager.tsx
│   ├── FlowDiagramRenderer.tsx
│   └── TestDetailView.tsx
└── styles/
    └── devtest.module.scss
```

---

## Backend APIs Structure

```
app/api/devtest/
├── tests/route.ts           # GET: List all tests
├── execute/route.ts         # POST: Execute single test
├── batch/route.ts           # POST: Execute multiple tests
├── results/route.ts         # GET: Get test results
├── data/route.ts            # POST: Seed/reset data
├── flows/route.ts           # GET: Get architecture flows
├── payment/route.ts         # POST: Payment simulation
├── verify/route.ts          # POST: Verify system state
└── webhook-test/route.ts    # POST: Simulate webhooks
```

---

## Test Registry & Discovery

The system uses auto-discovery with a registry pattern:

```typescript
interface TestCase {
  id: string;
  name: string;
  description: string;
  category: 'unit' | 'service' | 'integration' | 'e2e' | 'payment';
  tags: string[];
  execute: (context: TestContext) => Promise<TestResult>;
  cleanup: (context: TestContext) => Promise<void>;
  dependencies?: string[];  // Other tests that must run first
}

// Tests auto-discovered from lib/devtest/tests/
```

---

## Performance & Reliability

### Test Timeout Strategy
- Unit tests: 5 seconds
- Service tests: 10 seconds
- Integration tests: 30 seconds
- E2E tests: 60 seconds
- Payment tests: 120 seconds

### Retry Strategy
- Transient failures: Retry 3 times
- Gateway timeouts: Retry with backoff
- DB locks: Retry with exponential backoff
- Network errors: Retry up to 5 times

### Resource Management
- Max 5 concurrent tests
- Automatic cleanup on completion
- Memory leak detection
- Connection pool management

---

## Implementation Roadmap

### Phase 1: Core Infrastructure
1. Test orchestration API
2. Test data manager
3. Basic frontend dashboard
4. Test registry & discovery

### Phase 2: Unit & Service Tests
1. Unit logic tests
2. Service layer tests
3. Validation tests
4. Error handling tests

### Phase 3: Integration & E2E
1. Order flow tests
2. Payment integration tests
3. Inventory integration tests
4. Multi-service scenarios

### Phase 4: Payment Testing
1. COD flow tests
2. Online payment flow tests
3. Webhook simulation
4. Signature verification tests
5. Refund tests

### Phase 5: Dashboard & UI
1. Test runner interface
2. Results viewer
3. Architecture visualizer
4. Payment simulator UI
5. Data manager UI

### Phase 6: Advanced Features
1. Test scheduling
2. Historical comparisons
3. Performance metrics
4. Trend analysis
5. Report generation

---

## Next Steps

1. Create test orchestration API
2. Implement test data manager
3. Build basic dashboard UI
4. Implement test suite
5. Add payment testing layer
6. Create flow visualizer
