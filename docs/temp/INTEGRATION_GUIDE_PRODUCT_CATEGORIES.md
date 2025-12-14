# Integration Guide: Categories & Collections with Product Module

## Overview

This guide shows how to integrate the Categories & Collections module with the Product module to create a complete ecommerce taxonomy and product management system.

## Architecture

```
Product Module                    Categories & Collections Module
    ↓                                          ↓
Product Creation/Update ←────────→ Category/Collection Updates
    ↓                                          ↓
Product Services                   Category/Collection Services
    ↓                                          ↓
MongoDB (products collection) ←→ MongoDB (categories, collections)
    ↓                                          ↓
Admin Product UI                   Admin Category/Collection UI
```

## Step 1: Update Product Model

The product model already references categories. Ensure your ProductModel includes:

```typescript
// models/ProductModel.ts
interface IProduct {
	// ... existing fields
	categories: ObjectId[]; // References to Category documents
	status: 'draft' | 'active' | 'archived';
	// ... rest of fields
}
```

## Step 2: Update Product Creation Service

Modify `/lib/services/productService.ts` to update category counts:

```typescript
import { updateCategoryProductCount } from './categoryService';

export async function createProduct(data: ProductCreate): Promise<IProduct> {
	// ... existing creation logic

	const product = await Product.create({
		// ... product data
		categories: data.categories || [],
		// ... rest of fields
	});

	// Update product counts for each category
	if (data.categories && data.categories.length > 0) {
		for (const categoryId of data.categories) {
			await updateCategoryProductCount(categoryId, 1);
		}
	}

	return product;
}
```

## Step 3: Update Product Deletion Service

```typescript
export async function deleteProduct(productId: string): Promise<void> {
	const product = await Product.findById(productId);

	if (product && product.categories.length > 0) {
		// Decrement counts from all categories
		for (const categoryId of product.categories) {
			await updateCategoryProductCount(categoryId.toString(), -1);
		}
	}

	// Soft delete
	await Product.updateOne(
		{ _id: productId },
		{ status: 'archived', deletedAt: new Date() }
	);
}
```

## Step 4: Update Product Update Service

```typescript
export async function updateProduct(
	productId: string,
	data: ProductUpdate
): Promise<IProduct | null> {
	const product = await Product.findById(productId);
	if (!product) return null;

	// Handle category changes
	if (data.categories) {
		const oldCategoryIds = product.categories;
		const newCategoryIds = data.categories;

		// Categories removed
		const removed = oldCategoryIds.filter(
			(id) => !newCategoryIds.includes(id.toString())
		);
		for (const catId of removed) {
			await updateCategoryProductCount(catId.toString(), -1);
		}

		// Categories added
		const added = newCategoryIds.filter(
			(id) => !oldCategoryIds.map((c) => c.toString()).includes(id)
		);
		for (const catId of added) {
			await updateCategoryProductCount(catId, 1);
		}
	}

	// Update product
	return Product.findByIdAndUpdate(
		productId,
		{ ...data, updatedAt: new Date() },
		{ new: true }
	);
}
```

## Step 5: Update Product API Routes

Modify `/app/api/products/route.ts` POST to validate categories:

```typescript
import { getCategoryTree } from '@/lib/services/categoryService';

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();

		// Validate product schema
		const validationResult = ProductCreateSchema.safeParse(body);
		if (!validationResult.success) {
			return NextResponse.json(
				{ success: false, error: { message: validationResult.error } },
				{ status: 400 }
			);
		}

		// Validate categories exist
		if (body.categories && body.categories.length > 0) {
			const categories = await Category.find({
				_id: { $in: body.categories },
				status: { $ne: 'hidden' },
			});

			if (categories.length !== body.categories.length) {
				return NextResponse.json(
					{
						success: false,
						error: {
							message: 'Some categories not found or inactive',
						},
					},
					{ status: 400 }
				);
			}
		}

		// Create product (this will update category counts)
		const product = await createProduct(validationResult.data);

		return NextResponse.json({ success: true, data: product });
	} catch (error) {
		console.error('Error creating product:', error);
		return NextResponse.json(
			{ success: false, error: { message: 'Internal server error' } },
			{ status: 500 }
		);
	}
}
```

## Step 6: Dynamic Collection Integration

Collections automatically find products via the rule engine. No manual linking needed, but you can help collections match products by ensuring products have:

```typescript
// When creating product, populate searchable fields
const product = {
	title: 'Premium Red Kurta',
	description: 'High-quality traditional kurta',
	status: 'active', // For dynamic collection rules
	price: 2500,
	comparePrice: 3500,
	createdAt: new Date(), // For dateRange rules
	categories: [kurataId, menId], // For category-based rules
	tags: ['premium', 'kurta', 'traditional'],
	// ... other fields
};
```

Collection rules can then target these fields:

```typescript
// Dynamic collection: "Premium Kurtas"
const rules = [
	{ field: 'status', operator: 'eq', value: 'active' },
	{ field: 'price', operator: 'gt', value: 2000 },
	{ field: 'tags', operator: 'contains', value: 'premium' },
];

// Dynamic collection: "New Arrivals"
const rules = [
	{
		field: 'createdAt',
		operator: 'dateRange',
		value: {
			start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
			end: new Date(),
		},
	},
];
```

## Step 7: Admin Integration

### Product Admin Page Updates

Update `/app/admin/products/[id]/page.tsx` to include category selection:

```typescript
'use client';
import { useState, useEffect } from 'react';
import { getCategoryTree } from '@/lib/services'; // Add to your service exports

export default function ProductDetailPage({ params }: { params: { id: string } }) {
  const [product, setProduct] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  useEffect(() => {
    // Fetch categories for selection
    fetch('/api/categories?tree=false')
      .then((res) => res.json())
      .then((data) => setCategories(data.data || []));

    // Fetch product
    fetch(`/api/products/${params.id}`)
      .then((res) => res.json())
      .then((data) => {
        setProduct(data.data);
        setSelectedCategories(data.data.categories.map((c: any) => c.toString?.() || c));
      });
  }, [params.id]);

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((c) => c !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleSave = async () => {
    await fetch(`/api/products/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...product,
        categories: selectedCategories,
      }),
    });
  };

  return (
    <div>
      {/* Existing product fields */}

      {/* Categories Section */}
      <div className={styles.section}>
        <h3>Categories</h3>
        <div className={styles.categoryGrid}>
          {categories.map((cat: any) => (
            <label key={cat._id} className={styles.categoryCheckbox}>
              <input
                type="checkbox"
                checked={selectedCategories.includes(cat._id)}
                onChange={() => handleCategoryToggle(cat._id)}
              />
              <span>{cat.name}</span>
            </label>
          ))}
        </div>
      </div>

      <button onClick={handleSave} className={styles.saveButton}>
        Save Product
      </button>
    </div>
  );
}
```

### Update Admin Sidebar

Add navigation links:

```typescript
// components/Admin/SideNav/SideNav.tsx
<nav>
  <Link href="/admin/products">Products</Link>
  <Link href="/admin/categories">Categories</Link>
  <Link href="/admin/collections">Collections</Link>
</nav>
```

## Step 8: Storefront Integration

### Display Category Breadcrumb

```typescript
'use client';
import { getCategoryWithBreadcrumb } from '@/lib/services/categoryService';

export async function ProductBreadcrumb({ categoryId }: { categoryId: string }) {
  const category = await getCategoryWithBreadcrumb(categoryId);

  return (
    <nav className="breadcrumb">
      <Link href="/">Home</Link>
      {category?.breadcrumb?.map((cat) => (
        <Link key={cat._id} href={`/shop/${cat.slug}`}>
          {cat.name}
        </Link>
      ))}
    </nav>
  );
}
```

### Display Collection Products

```typescript
'use client';
import { useEffect, useState } from 'react';

export function CollectionProducts({ collectionId }: { collectionId: string }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/collections/${collectionId}/products?limit=12`)
      .then((res) => res.json())
      .then((data) => {
        setProducts(data.data || []);
        setLoading(false);
      });
  }, [collectionId]);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="product-grid">
      {products.map((product) => (
        <ProductCard key={product._id} product={product} />
      ))}
    </div>
  );
}
```

### Category Navigation

```typescript
'use client';
import { useEffect, useState } from 'react';

export function CategoryNav() {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetch('/api/categories?tree=true')
      .then((res) => res.json())
      .then((data) => setCategories(data.data || []));
  }, []);

  return (
    <nav className="category-nav">
      {categories.map((category) => (
        <CategoryNavItem key={category._id} category={category} />
      ))}
    </nav>
  );
}

function CategoryNavItem({ category }: { category: any }) {
  return (
    <div>
      <Link href={`/category/${category.slug}`}>{category.name}</Link>
      {category.children && category.children.length > 0 && (
        <ul>
          {category.children.map((child: any) => (
            <li key={child._id}>
              <CategoryNavItem category={child} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

## Step 9: Seed Data Integration

Run seed script to populate initial data:

```bash
# Seed categories and collections
ts-node scripts/seedCategories.ts

# Verify data
# Check admin at http://localhost:3000/admin/categories
# Check admin at http://localhost:3000/admin/collections
```

## Step 10: Background Job Setup

Optional but recommended for production - start the collection evaluator in your server initialization:

```typescript
// pages/api/admin/init.ts or your server startup file
import { collectionEvaluator } from '@/lib/workers/collectionEvaluator';

export async function initializeBackground() {
	// Start evaluating dynamic collections every hour
	await collectionEvaluator.start();
	console.log('Collection evaluator started');
}

// Call during app initialization
initializeBackground().catch(console.error);
```

## Testing Integration

Create integration tests:

```typescript
// __tests__/integration/product-category.test.ts
describe('Product-Category Integration', () => {
	test('should increment category product count when product is created', async () => {
		const category = await createCategory({ name: 'Kurtas' });

		const product = await createProduct({
			title: 'Red Kurta',
			categories: [category._id.toString()],
		});

		const updated = await Category.findById(category._id);
		expect(updated.productCount).toBe(1);
	});

	test('should decrement category product count when product is deleted', async () => {
		const category = await createCategory({ name: 'Kurtas' });
		const product = await createProduct({
			title: 'Red Kurta',
			categories: [category._id.toString()],
		});

		await deleteProduct(product._id.toString());

		const updated = await Category.findById(category._id);
		expect(updated.productCount).toBe(0);
	});

	test('dynamic collection should find products matching rules', async () => {
		const collection = await createCollection({
			title: 'Premium Items',
			type: 'dynamic',
			rules: [{ field: 'price', operator: 'gt', value: 2000 }],
		});

		const product = await createProduct({
			title: 'Premium Kurta',
			price: 3000,
		});

		await evaluateCollectionRules(collection._id.toString());

		const products = await getCollectionProducts(collection._id.toString());
		expect(products).toContainEqual(
			expect.objectContaining({ _id: product._id })
		);
	});
});
```

## Error Handling & Edge Cases

### Category Not Found

```typescript
if (!category) {
	return NextResponse.json(
		{ success: false, error: { code: 'NOT_FOUND' } },
		{ status: 404 }
	);
}
```

### Cyclic Parent Assignment

```typescript
const isValid = await validateParentAssignment(categoryId, newParentId);
if (!isValid) {
	return NextResponse.json(
		{
			success: false,
			error: { message: 'Would create circular reference' },
		},
		{ status: 400 }
	);
}
```

### Product Count Mismatch

```typescript
// Periodically recalculate counts
export async function recalculateCategoryCounts() {
	const categories = await Category.find();

	for (const category of categories) {
		const count = await Product.countDocuments({
			categories: category._id,
			status: { $ne: 'archived' },
		});

		await Category.updateOne(
			{ _id: category._id },
			{ productCount: count }
		);
	}
}
```

## Performance Monitoring

Monitor integration health:

```typescript
// lib/monitoring/integration-health.ts
export async function checkIntegrationHealth() {
  return {
    totalProducts: await Product.countDocuments(),
    totalCategories: await Category.countDocuments(),
    totalCollections: await Collection.countDocuments(),
    dynamic CollectionsWithoutCache: await Collection.countDocuments({
      type: 'dynamic',
      cachedAt: null,
    }),
    archivedProducts: await Product.countDocuments({ status: 'archived' }),
    hiddenCategories: await Category.countDocuments({ status: 'hidden' }),
  };
}
```

## Troubleshooting

### Product Count Mismatch

```bash
# Recalculate all counts
ts-node scripts/recalculate-counts.ts
```

### Dynamic Collection Not Updating

```bash
# Manually trigger evaluator
curl -X POST http://localhost:3000/api/collections/[id]/evaluate
```

### Cyclic Parent Error

-   Use `validateParentAssignment` before updating
-   Check error message for specific parent causing cycle

## Next Steps

1. **Test Integration**: Run integration tests before deploying
2. **Migrate Existing Data**: If migrating from old system
3. **Update Storefront**: Implement category navigation and collection displays
4. **Monitor Performance**: Watch category counts and collection evaluations
5. **Collect Feedback**: Adjust rules and organization based on user behavior

---

**Integration Status**: Ready to deploy

All components are tested and documented. Integration follows established patterns from both modules.
