# Categories & Collections Module Documentation

## Overview

The Categories & Collections module provides a complete taxonomy and merchandising system for the ecommerce platform. It enables hierarchical product organization through categories and flexible product grouping through both manual and dynamic collections.

## Features

### Categories

-   **Hierarchical Organization**: Multi-level parent-child relationships with ancestor tracking
-   **SEO-Friendly Slugs**: Auto-generated, URL-safe slugs with collision detection
-   **Product Counts**: Denormalized product counts for fast queries
-   **Breadcrumb Support**: Full ancestor paths for navigation UI
-   **Soft Deletes**: Archive instead of hard delete for data integrity
-   **Status Management**: Active/Hidden states for visibility control

### Collections

-   **Manual Collections**: Curated product lists managed by admins
-   **Dynamic Collections**: Rule-based automatic product grouping
-   **Rule Engine**: 7 operators for flexible product matching (eq, contains, gt, lt, in, between, dateRange)
-   **Scheduled Publishing**: startAt/endAt dates for time-limited promotions
-   **Product Caching**: Efficient results caching for expensive dynamic evaluations
-   **Search & Filtering**: Full-text search with type and status filters
-   **Priority Ordering**: Control display order in storefront

## Database Models

### Category Schema

```typescript
interface ICategory {
	name: string; // e.g., "Men", "Kurtas"
	slug: string; // unique, auto-generated: "men-kurtas"
	description?: string;
	parentId?: ObjectId; // reference to parent category
	ancestors: Array<{ _id: ObjectId; name: string; slug: string }>; // for O(1) ancestor queries
	position: number; // order within siblings
	metadata?: Record<string, any>; // custom fields
	status: 'active' | 'hidden'; // visibility control
	image?: string; // category image URL
	seo?: { title?: string; description?: string; keywords?: string[] };
	productCount: number; // denormalized count
	createdAt: Date;
	updatedAt: Date;
}
```

**Indexes:**

-   `slug` (unique, sparse)
-   `parentId` (for sibling queries)
-   `ancestors` (for ancestor lookups)
-   `status` (for filtering)
-   `name`, `description` (text search)

### Collection Schema

```typescript
interface IRule {
	field: string; // product property: "status", "price", "createdAt", etc.
	operator: 'eq' | 'contains' | 'gt' | 'lt' | 'in' | 'between' | 'dateRange';
	value: any; // operator-specific value
}

interface ICollection {
	title: string; // e.g., "New Arrivals"
	handle: string; // unique slug: "new-arrivals"
	description?: string;
	type: 'manual' | 'dynamic'; // collection type
	productIds: ObjectId[]; // for manual collections
	rules: IRule[]; // for dynamic collections
	cachedProductIds?: ObjectId[]; // cache for dynamic results
	cachedAt?: Date; // last evaluation timestamp
	startAt?: Date; // publication start date
	endAt?: Date; // publication end date
	priority: number; // display order (higher = more prominent)
	status: 'active' | 'hidden';
	image?: string;
	seo?: { title?: string; description?: string; keywords?: string[] };
	createdAt: Date;
	updatedAt: Date;
}
```

**Indexes:**

-   `handle` (unique)
-   `status` (for filtering)
-   `startAt`, `endAt` (for schedule-based queries)
-   `priority` (for sorting)
-   `type` (for filtering)
-   `productIds` (for product lookup)

## Service Layer

### Category Service

Located in `/lib/services/categoryService.ts`

#### Core Functions

**generateCategorySlug(title: string, categoryId?: string): Promise<string>**

-   Generates unique, URL-safe slug from title
-   Detects collisions and appends numeric suffix
-   Returns: "men-kurtas", "men-kurtas-1", etc.

**buildAncestors(parentId?: string): Promise<ICategory[]>**

-   Constructs ancestor array from parent chain
-   Returns full hierarchy for O(1) ancestor queries
-   Returns empty array for root categories

**validateParentAssignment(categoryId: string, newParentId: string): Promise<boolean>**

-   Prevents cyclic parent assignments
-   Prevents self-assignment
-   Returns true if assignment is valid

**createCategory(data: CategoryCreate): Promise<ICategory>**

-   Creates new category with auto-generated slug and ancestors
-   Parameters: { name, description?, parentId?, status?, image?, seo? }
-   Returns: Created category document

**updateCategory(categoryId: string, data: Partial<CategoryUpdate>): Promise<ICategory | null>**

-   Updates category and recalculates ancestors if parent changes
-   Parameters: { name?, description?, parentId?, status?, image?, seo?, position? }
-   Returns: Updated category or null if not found

**getCategoryTree(flat?: boolean): Promise<ICategory[]>**

-   Returns nested tree structure by default
-   Returns flat list if flat=true
-   Includes product counts
-   Ordered by position

**getCategoryWithBreadcrumb(categoryId: string): Promise<ICategory | null>**

-   Returns category with full breadcrumb from ancestors
-   Breadcrumb: [{id, name, slug}, {id, name, slug}, ...]
-   Used for navigation UI

**reorderCategories(reorderData: Array<{id: string, position: number}>): Promise<void>**

-   Bulk update positions of multiple categories
-   Used for drag-and-drop reordering

**deleteCategory(categoryId: string, force?: boolean): Promise<void>**

-   Soft deletes category (sets status to 'hidden')
-   If force=true, reassigns child categories to parent
-   Preserves data for audit trails

**updateCategoryProductCount(categoryId: string, increment: number): Promise<void>**

-   Increments/decrements product count (denormalization)
-   Called when products are added/removed from category
-   Increment can be negative for decrements

**getCategoryDescendants(categoryId: string): Promise<ICategory[]>**

-   Returns all descendants at all levels
-   Used for deletion and cascade operations

### Collection Service

Located in `/lib/services/collectionService.ts`

#### Rule Evaluation

**evaluateRule(product: any, rule: IRule): boolean**

-   Single rule evaluation against product
-   Operators:
    -   `eq`: Exact match (string/number/boolean)
    -   `contains`: Case-insensitive substring match
    -   `gt`: Greater than (numbers)
    -   `lt`: Less than (numbers)
    -   `in`: Value in array
    -   `between`: Range check with min/max
    -   `dateRange`: Date within start/end range
-   Returns: true if product matches rule

**evaluateRules(product: any, rules: IRule[]): boolean**

-   Evaluates all rules with AND logic
-   All rules must pass for true result
-   Returns: true if all rules match or rules is empty

#### Core Functions

**generateCollectionHandle(title: string, collectionId?: string): Promise<string>**

-   Generates unique, URL-safe handle from title
-   Detects collisions and appends numeric suffix
-   Returns: "new-arrivals", "new-arrivals-1", etc.

**createCollection(data: CollectionCreate): Promise<ICollection>**

-   Creates manual or dynamic collection
-   Parameters: { title, description?, type, rules?, productIds?, status?, priority?, startAt?, endAt?, image?, seo? }
-   Returns: Created collection document

**updateCollection(collectionId: string, data: Partial<CollectionUpdate>): Promise<ICollection | null>**

-   Updates collection properties
-   Recalculates rules validation for dynamic collections
-   Returns: Updated collection or null if not found

**evaluateCollectionRules(collectionId: string): Promise<ICollection | null>**

-   Evaluates dynamic collection rules and caches results
-   Iterates all products and applies rule engine
-   Updates cachedProductIds and cachedAt
-   Returns: Updated collection or null if not found or is manual

**getCollectionProducts(collectionId: string, skip?: number, limit?: number): Promise<Array>**

-   Returns paginated products in collection
-   For manual: returns from productIds array
-   For dynamic: returns from cachedProductIds (with fallback evaluation)
-   Parameters: skip (default 0), limit (default 50)

**addProductsToCollection(collectionId: string, productIds: string[]): Promise<void>**

-   Adds products to manual collection
-   Prevents duplicate product IDs
-   Only works for manual collections

**removeProductFromCollection(collectionId: string, productId: string): Promise<void>**

-   Removes product from manual collection
-   Only works for manual collections

**getActiveCollections(): Promise<ICollection[]>**

-   Returns all collections active at current time
-   Considers startAt/endAt scheduling
-   Filters by status != 'hidden'

**validateRules(rules: IRule[]): boolean**

-   Validates rule structure and operators
-   Checks required fields and value types
-   Returns: true if all rules are valid

**searchCollections(query: string, filters?: {type?, status?, limit?, skip?}): Promise<ICollection[]>**

-   Full-text search by title/description
-   Filters by type (manual|dynamic) and status
-   Supports pagination with skip/limit
-   Returns: Matching collections array

**deleteCollection(collectionId: string): Promise<void>**

-   Soft deletes collection (sets status to 'hidden')
-   Preserves data for audit trails

## API Endpoints

### Categories

#### POST /api/categories

Create a new category

```bash
curl -X POST http://localhost:3000/api/categories \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Men",
    "description": "Men clothing",
    "status": "active"
  }'
```

Response:

```json
{
	"success": true,
	"data": {
		"_id": "507f1f77bcf86cd799439011",
		"name": "Men",
		"slug": "men",
		"description": "Men clothing",
		"parentId": null,
		"ancestors": [],
		"position": 0,
		"status": "active",
		"productCount": 0
	}
}
```

#### GET /api/categories

List categories (tree or flat)

```bash
curl "http://localhost:3000/api/categories?tree=false"
```

Query Parameters:

-   `tree` (boolean): Return as tree (default: true) or flat list

Response:

```json
{
  "success": true,
  "data": [...],
  "meta": { "count": 10 }
}
```

#### GET /api/categories/[id]

Get category with breadcrumb

```bash
curl "http://localhost:3000/api/categories/507f1f77bcf86cd799439011"
```

Response:

```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Kurtas",
    "slug": "kurtas",
    "parentId": "507f1f77bcf86cd799439010",
    "ancestors": [...],
    "breadcrumb": [
      { "_id": "507f1f77bcf86cd799439010", "name": "Men", "slug": "men" },
      { "_id": "507f1f77bcf86cd799439011", "name": "Kurtas", "slug": "kurtas" }
    ],
    "status": "active",
    "productCount": 45
  }
}
```

#### PATCH /api/categories/[id]

Update category

```bash
curl -X PATCH http://localhost:3000/api/categories/507f1f77bcf86cd799439011 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Premium Kurtas",
    "status": "active"
  }'
```

#### DELETE /api/categories/[id]

Soft delete category

```bash
curl -X DELETE "http://localhost:3000/api/categories/507f1f77bcf86cd799439011?force=true"
```

Query Parameters:

-   `force` (boolean): Reassign child categories to parent (optional)

#### POST /api/categories/reorder

Bulk reorder categories

```bash
curl -X POST http://localhost:3000/api/categories/reorder \
  -H "Content-Type: application/json" \
  -d '{
    "reorder": [
      { "id": "507f1f77bcf86cd799439011", "position": 1 },
      { "id": "507f1f77bcf86cd799439012", "position": 2 }
    ]
  }'
```

### Collections

#### POST /api/collections

Create collection

```bash
curl -X POST http://localhost:3000/api/collections \
  -H "Content-Type: application/json" \
  -d '{
    "title": "New Arrivals",
    "type": "dynamic",
    "rules": [
      {
        "field": "createdAt",
        "operator": "dateRange",
        "value": {
          "start": "2024-01-01T00:00:00Z",
          "end": "2024-12-31T23:59:59Z"
        }
      }
    ],
    "status": "active"
  }'
```

#### GET /api/collections

List collections with search

```bash
curl "http://localhost:3000/api/collections?q=kurta&type=dynamic&status=active&page=1&limit=10"
```

Query Parameters:

-   `q` (string): Search query
-   `type` (string): "manual" or "dynamic"
-   `status` (string): "active" or "hidden"
-   `page` (number): Page number (default: 1)
-   `limit` (number): Items per page (default: 10)

#### GET /api/collections/[id]

Get collection details

```bash
curl "http://localhost:3000/api/collections/507f1f77bcf86cd799439011"
```

#### PATCH /api/collections/[id]

Update collection

```bash
curl -X PATCH http://localhost:3000/api/collections/507f1f77bcf86cd799439011 \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Premium Collections",
    "status": "active",
    "priority": 10
  }'
```

#### DELETE /api/collections/[id]

Soft delete collection

```bash
curl -X DELETE "http://localhost:3000/api/collections/507f1f77bcf86cd799439011"
```

#### GET /api/collections/[id]/products

Get collection products (paginated)

```bash
curl "http://localhost:3000/api/collections/507f1f77bcf86cd799439011/products?skip=0&limit=50"
```

Query Parameters:

-   `skip` (number): Skip count (default: 0)
-   `limit` (number): Items per page (default: 50)

#### POST /api/collections/[id]/products

Add products to manual collection

```bash
curl -X POST http://localhost:3000/api/collections/507f1f77bcf86cd799439011/products \
  -H "Content-Type: application/json" \
  -d '{
    "productIds": ["507f1f77bcf86cd799439020", "507f1f77bcf86cd799439021"]
  }'
```

#### DELETE /api/collections/[id]/products/[pid]

Remove product from collection

```bash
curl -X DELETE "http://localhost:3000/api/collections/507f1f77bcf86cd799439011/products/507f1f77bcf86cd799439020"
```

#### POST /api/collections/[id]/evaluate

Manually trigger rule evaluation for dynamic collection

```bash
curl -X POST "http://localhost:3000/api/collections/507f1f77bcf86cd799439011/evaluate"
```

Response:

```json
{
	"success": true,
	"data": {
		"collectionId": "507f1f77bcf86cd799439011",
		"matchedProducts": 42,
		"evaluatedAt": "2024-01-15T10:30:00Z"
	}
}
```

## Rule Operators Reference

### eq (Equals)

```json
{ "field": "status", "operator": "eq", "value": "active" }
```

Exact match. Works with strings, numbers, booleans.

### contains (String Contains)

```json
{ "field": "description", "operator": "contains", "value": "kurta" }
```

Case-insensitive substring match.

### gt (Greater Than)

```json
{ "field": "price", "operator": "gt", "value": 1000 }
```

Works with numbers and dates.

### lt (Less Than)

```json
{ "field": "price", "operator": "lt", "value": 5000 }
```

Works with numbers and dates.

### in (In Array)

```json
{ "field": "category", "operator": "in", "value": ["Kurta", "Shirt"] }
```

Value must be in provided array.

### between (Range)

```json
{
	"field": "price",
	"operator": "between",
	"value": { "min": 1000, "max": 5000 }
}
```

Value must be between min and max (inclusive).

### dateRange (Date Range)

```json
{
	"field": "createdAt",
	"operator": "dateRange",
	"value": {
		"start": "2024-01-01T00:00:00Z",
		"end": "2024-12-31T23:59:59Z"
	}
}
```

Date must be within start and end (inclusive).

## Background Job: Collection Evaluator

The `collectionEvaluator` is a background service that periodically evaluates dynamic collections.

### Starting the Evaluator

```bash
# As standalone process
node -r ts-node/register lib/workers/collectionEvaluator.ts

# Or integrate with your server startup
import { collectionEvaluator } from '@/lib/workers/collectionEvaluator';
await collectionEvaluator.start(); // runs evaluation every hour
```

### Using the Evaluator

```typescript
import { collectionEvaluator } from '@/lib/workers/collectionEvaluator';

// Start evaluator (runs immediately and then every hour)
await collectionEvaluator.start();

// Evaluate single collection
await collectionEvaluator.evaluateCollection(collectionId);

// Get stats
const stats = await collectionEvaluator.getStats();
console.log(stats);
// {
//   totalDynamicCollections: 5,
//   lastEvaluationStats: [
//     { name: "New Arrivals", matchedProducts: 42, evaluatedAt: Date },
//     ...
//   ]
// }

// Stop evaluator
collectionEvaluator.stop();
```

### Configuration

Change evaluation interval when creating evaluator:

```typescript
// Evaluate every 30 minutes
const evaluator = new CollectionEvaluator(30 * 60 * 1000);
await evaluator.start();
```

## Admin UI

### Category Manager

Located at `/app/admin/categories`

Features:

-   Hierarchical tree view with parent-child relationships
-   Drag-and-drop reordering (UI ready for implementation)
-   Create/Edit/Delete modals
-   Product count display per category
-   Search and filter
-   Breadcrumb display for context

### Collection Manager

Located at `/app/admin/collections`

Features:

-   Searchable list of all collections
-   Type badge (Manual / Dynamic)
-   Status badge (Active / Hidden)
-   Product count display
-   Manual collection: Add/Remove products UI
-   Dynamic collection: View rules and evaluation results
-   Create/Edit/Delete modals
-   Schedule dates (startAt / endAt) for time-limited promotions
-   Priority field for storefront ordering
-   Manual trigger for dynamic collection evaluation

## Seed Data

Run the seed script to populate sample data:

```bash
ts-node scripts/seedCategories.ts
```

Creates:

-   Categories: Men, Women, Boys, Girls, Kurtas, Shirts, Suits (with hierarchy)
-   Collections:
    -   **Kurta Fest** (Manual): Curated collection for admin to populate
    -   **New Arrivals** (Dynamic): Products created in last 30 days
    -   **Best Sellers** (Dynamic): Active products (can be customized)

## Testing

Run the test suites:

```bash
# Category service tests
jest lib/services/__tests__/categoryService.test.ts

# Collection service tests
jest lib/services/__tests__/collectionService.test.ts

# All tests
npm test
```

Test Coverage:

-   **Category Service**: 13+ test cases covering slug generation, hierarchy, ancestry, tree building, soft delete, reordering
-   **Collection Service**: 20+ test cases covering rule evaluation, all operators, manual/dynamic collections, scheduling, search

## Performance Optimization

### Indexes

All collections have proper indexes for query performance:

-   Category slug lookups: O(1)
-   Ancestor queries: O(1) via ancestors array
-   Status filtering: Fast with status index
-   Text search: Fast with text index

### Caching

-   Dynamic collection results cached with cachedProductIds
-   Cache invalidated when rules are updated
-   Evaluator runs on schedule to keep cache fresh

### Pagination

-   All list endpoints support pagination
-   Default limits prevent memory overload
-   Skip/limit pattern for efficient database queries

## Error Handling

All endpoints return standardized error responses:

```json
{
	"success": false,
	"error": {
		"message": "Category not found",
		"code": "NOT_FOUND"
	}
}
```

Common error codes:

-   `VALIDATION_ERROR`: Invalid input parameters
-   `NOT_FOUND`: Resource doesn't exist
-   `CONFLICT`: Slug/handle already exists or cyclic parent
-   `FORBIDDEN`: Unauthorized operation
-   `SERVER_ERROR`: Internal server error

## Integration with Products

Categories and collections are referenced in product operations:

```typescript
// When creating a product, reference categories
await createProduct({
  title: "Premium Kurta",
  categories: [categoryId1, categoryId2],
  ...
});

// Update denormalized counts
await updateCategoryProductCount(categoryId, 1); // increment
await updateCategoryProductCount(categoryId, -1); // decrement

// Collections automatically find products via rule evaluation
// No manual linking required for dynamic collections
```

## Best Practices

1. **Hierarchy Design**: Keep category depth to 3-4 levels maximum for UX
2. **Slug Uniqueness**: Let the system auto-generate slugs to avoid conflicts
3. **Product Counts**: Maintain via product creation/deletion hooks
4. **Dynamic Rules**: Test rules before publishing collections to storefront
5. **Schedule Collections**: Use startAt/endAt for seasonal/promotional collections
6. **Cache Timing**: Run evaluator before peak traffic periods
7. **Soft Deletes**: Archive instead of delete for audit trail and recovery

## Migration from Old System

If migrating from previous taxonomy:

1. Create new categories with `createCategory`
2. Build hierarchy with `parentId` and `ancestors` auto-population
3. Import manual collections with product mappings
4. Create dynamic collection rules matching old filters
5. Run `evaluateCollectionRules` to populate initial cache
6. Publish new system and monitor for issues

## Troubleshooting

### Dynamic Collection Not Updating

-   Verify rules are valid with `validateRules()`
-   Check if collection is manual (can't be evaluated)
-   Run `evaluateCollectionRules` manually
-   Check evaluator logs if background job is running

### Circular Parent Reference Error

-   Use `validateParentAssignment` before updating parent
-   Ensure new parent is not a descendant of the category

### Slug Collision

-   System auto-appends numeric suffix
-   Check for excessive collisions (indicates similar names)
-   Consider more specific category names

### Performance Issues

-   Check if dynamic collection has too many rules
-   Consider splitting complex rules into multiple collections
-   Monitor database indexes

## Future Enhancements

1. **Reordering UI**: Implement drag-and-drop in admin categories
2. **Advanced Rules**: Add OR logic and rule groups
3. **Change Streams**: Real-time cache invalidation on product updates
4. **Bulk Operations**: API for bulk category/product imports
5. **Analytics**: Track collection performance and conversion metrics
6. **Scheduled Jobs**: NPM package for cron-based evaluator
7. **GraphQL API**: Alternative to REST for storefront queries
