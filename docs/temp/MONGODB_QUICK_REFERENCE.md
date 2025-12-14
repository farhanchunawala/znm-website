# MongoDB Connection Architecture - Quick Reference

## Import Pattern (Use EVERYWHERE)

```typescript
import dbConnect from '@/lib/mongodb';
```

## Basic Usage Pattern

```typescript
import dbConnect from '@/lib/mongodb';
import { handleError } from '@/lib/utils/errors';

export async function GET(req: NextRequest) {
  try {
    const mongoose = await dbConnect();
    if (!mongoose) {
      throw new Error('Database unavailable');
    }
    
    // Use your models...
    const data = await Model.find();
    
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handleError(error);
  }
}
```

## Error Classes Available

```typescript
import {
  AppError,
  ValidationError,
  NotFoundError,
  AuthenticationError,
  DatabaseError,
  handleError,
  assert,
  assertFound,
  throwDatabaseError
} from '@/lib/utils/errors';

// Throw validation error
throw new ValidationError('Invalid input', { field: ['Error message'] });

// Throw not found
throw new NotFoundError('Product not found');

// Throw auth error
throw new AuthenticationError('Unauthorized', 403); // 401 default

// Throw database error
throwDatabaseError('Database query failed');

// Assert conditions
assert(value > 0, 'Value must be positive');
const product = assertFound(await Product.findById(id), 'Product not found');
```

## File Locations

| What | Where |
|------|-------|
| MongoDB Connection | `/lib/mongodb.ts` |
| Error Utilities | `/lib/utils/errors.ts` |
| Example API Routes | `/app/api/products/route.ts` |
| Example Services | `/lib/services/productService.ts` |

## Connection Return Value

`dbConnect()` returns: `Promise<Mongoose | null>`

- Returns Mongoose instance if connected
- Returns `null` if offline (non-blocking)
- Never throws - always resolves

## Response Format

All API routes should return:

```json
{
  "success": true,
  "data": {...},
  "meta": { "timestamp": "2025-12-11T..." }
}
```

Error responses:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": { "field": ["error message"] },
    "statusCode": 400
  },
  "timestamp": "2025-12-11T..."
}
```

## Environment Setup

**.env.local**
```
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname?retryWrites=true
```

## Common Errors & Fixes

| Error | Fix |
|-------|-----|
| Cannot find module '@/lib/mongodb' | Check tsconfig.json paths |
| dbConnect is not a function | Use default import, not named |
| Database unavailable | Check MONGODB_URI env var |
| Type errors with global.mongoose | Rerun `npm run build` after mongodb.ts fix |

## Testing

```bash
# Run tests
npm test

# Seed data
node -r ts-node/register scripts/seedCategories.ts

# Type check
npx tsc --noEmit

# Build
npm run build
```

---

**Version:** 1.0  
**Last Updated:** December 11, 2025  
**Status:** Production Ready ✅
