import {
	generateCategorySlug,
	buildAncestors,
	validateParentAssignment,
	createCategory,
	updateCategory,
	getCategoryTree,
	getCategoryWithBreadcrumb,
	reorderCategories,
	canDeleteCategory,
	deleteCategory,
	updateCategoryProductCount,
	getCategoryDescendants,
} from '../categoryService';
import Category from '@/models/CategoryModel';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
	mongoServer = await MongoMemoryServer.create();
	const mongoUri = mongoServer.getUri();
	if (mongoose.connection.readyState !== 1) {
		await mongoose.connect(mongoUri);
	}
});

afterAll(async () => {
	await mongoose.disconnect();
	await mongoServer.stop();
});

beforeEach(async () => {
	await Category.deleteMany({});
});

describe('CategoryService', () => {
	describe('generateCategorySlug', () => {
		test('should generate slug from title', async () => {
			const slug = await generateCategorySlug('Men Kurtas');
			expect(slug).toBe('men-kurtas');
		});

		test('should handle collision by adding suffix', async () => {
			await createCategory({ name: 'Kurtas', status: 'active' });
			const slug = await generateCategorySlug('Kurtas');
			expect(slug).toMatch(/^kurtas-\d+$/);
		});

		test('should remove special characters from slug', async () => {
			const slug = await generateCategorySlug('Men & Women!@#');
			expect(slug).toBe('men-women');
		});

		test('should handle multiple collisions', async () => {
			await createCategory({ name: 'Shirts', status: 'active' });
			await createCategory({ name: 'Shirts', status: 'active' });
			const slug = await generateCategorySlug('Shirts');
			expect(slug).toMatch(/^shirts-\d+$/);
		});
	});

	describe('buildAncestors', () => {
		test('should return empty array for root category', async () => {
			const ancestors = await buildAncestors(null);
			expect(ancestors).toEqual([]);
		});

		test('should build ancestor chain for nested category', async () => {
			const parent = await createCategory({
				name: 'Men',
				status: 'active',
			});
			const child = await createCategory({
				name: 'Kurtas',
				parentId: parent._id.toString(),
				status: 'active',
			});

			const ancestors = await buildAncestors(parent._id.toString());
			expect(ancestors).toContainEqual(
				expect.objectContaining({ _id: parent._id })
			);
		});

		test('should build deep ancestor chain', async () => {
			const grandparent = await createCategory({
				name: 'Root',
				status: 'active',
			});
			const parent = await createCategory({
				name: 'Middle',
				parentId: grandparent._id.toString(),
				status: 'active',
			});
			const child = await createCategory({
				name: 'Leaf',
				parentId: parent._id.toString(),
				status: 'active',
			});

			const ancestors = await buildAncestors(parent._id.toString());
			expect(ancestors.length).toBeGreaterThan(0);
		});
	});

	describe('validateParentAssignment', () => {
		test('should allow valid parent assignment', async () => {
			const parent = await createCategory({
				name: 'Men',
				status: 'active',
			});
			const child = await createCategory({
				name: 'Kurtas',
				status: 'active',
			});

			const isValid = await validateParentAssignment(
				child._id.toString(),
				parent._id.toString()
			);
			expect(isValid).toBe(true);
		});

		test('should prevent self-assignment', async () => {
			const category = await createCategory({
				name: 'Kurtas',
				status: 'active',
			});

			const isValid = await validateParentAssignment(
				category._id.toString(),
				category._id.toString()
			);
			expect(isValid).toBe(false);
		});

		test('should prevent cyclic parent assignment', async () => {
			const parent = await createCategory({
				name: 'Men',
				status: 'active',
			});
			const child = await createCategory({
				name: 'Kurtas',
				parentId: parent._id.toString(),
				status: 'active',
			});

			const isValid = await validateParentAssignment(
				parent._id.toString(),
				child._id.toString()
			);
			expect(isValid).toBe(false);
		});

		test('should allow changing parent to sibling', async () => {
			const parent = await createCategory({
				name: 'Men',
				status: 'active',
			});
			const sibling = await createCategory({
				name: 'Shirts',
				parentId: parent._id.toString(),
				status: 'active',
			});
			const child = await createCategory({
				name: 'Kurtas',
				parentId: parent._id.toString(),
				status: 'active',
			});

			const isValid = await validateParentAssignment(
				child._id.toString(),
				sibling._id.toString()
			);
			expect(isValid).toBe(true);
		});
	});

	describe('createCategory', () => {
		test('should create category with basic info', async () => {
			const category = await createCategory({
				name: 'Kurtas',
				description: 'Traditional kurtas',
				status: 'active',
			});

			expect(category._id).toBeDefined();
			expect(category.name).toBe('Kurtas');
			expect(category.slug).toBeDefined();
			expect(category.status).toBe('active');
		});

		test('should create category with parent', async () => {
			const parent = await createCategory({
				name: 'Men',
				status: 'active',
			});
			const child = await createCategory({
				name: 'Kurtas',
				parentId: parent._id.toString(),
				status: 'active',
			});

			expect(child.parentId).toEqual(parent._id);
			expect(child.ancestors).toContainEqual(
				expect.objectContaining({ _id: parent._id })
			);
		});

		test('should initialize product count to 0', async () => {
			const category = await createCategory({
				name: 'Kurtas',
				status: 'active',
			});

			expect(category.productCount).toBe(0);
		});
	});

	describe('updateCategory', () => {
		test('should update category name and description', async () => {
			const category = await createCategory({
				name: 'Kurtas',
				description: 'Old description',
				status: 'active',
			});

			const updated = await updateCategory(category._id.toString(), {
				name: 'Premium Kurtas',
				description: 'New description',
			});

			expect(updated?.name).toBe('Premium Kurtas');
			expect(updated?.description).toBe('New description');
		});

		test('should update status', async () => {
			const category = await createCategory({
				name: 'Kurtas',
				status: 'active',
			});

			const updated = await updateCategory(category._id.toString(), {
				status: 'hidden',
			});

			expect(updated?.status).toBe('hidden');
		});

		test('should change parent and update ancestors', async () => {
			const parent1 = await createCategory({
				name: 'Men',
				status: 'active',
			});
			const parent2 = await createCategory({
				name: 'Women',
				status: 'active',
			});
			const child = await createCategory({
				name: 'Kurtas',
				parentId: parent1._id.toString(),
				status: 'active',
			});

			const updated = await updateCategory(child._id.toString(), {
				parentId: parent2._id.toString(),
			});

			expect(updated?.parentId).toEqual(parent2._id);
		});
	});

	describe('getCategoryTree', () => {
		test('should build nested tree structure', async () => {
			const men = await createCategory({ name: 'Men', status: 'active' });
			const kurtas = await createCategory({
				name: 'Kurtas',
				parentId: men._id.toString(),
				status: 'active',
			});
			const shirts = await createCategory({
				name: 'Shirts',
				parentId: men._id.toString(),
				status: 'active',
			});

			const tree = await getCategoryTree();
			expect(Array.isArray(tree)).toBe(true);
			const menNode = tree.find(
				(t) => t._id?.toString() === men._id.toString()
			);
			expect(menNode?.children).toBeDefined();
		});

		test('should return flat list when requested', async () => {
			await createCategory({ name: 'Men', status: 'active' });
			await createCategory({ name: 'Women', status: 'active' });

			const flat = await getCategoryTree(true);
			expect(Array.isArray(flat)).toBe(true);
			expect(flat.length).toBeGreaterThanOrEqual(2);
		});

		test('should include product count in tree', async () => {
			const category = await createCategory({
				name: 'Kurtas',
				status: 'active',
			});

			const tree = await getCategoryTree();
			const node = tree.find(
				(t) => t._id?.toString() === category._id.toString()
			);
			expect(node?.productCount).toBeDefined();
		});
	});

	describe('getCategoryWithBreadcrumb', () => {
		test('should return category with breadcrumb for root', async () => {
			const category = await createCategory({
				name: 'Men',
				status: 'active',
			});

			const result = await getCategoryWithBreadcrumb(
				category._id.toString()
			);
			expect(result?.breadcrumb).toBeDefined();
			expect(result?.breadcrumb).toContainEqual(
				expect.objectContaining({ name: 'Men' })
			);
		});

		test('should include all ancestors in breadcrumb', async () => {
			const men = await createCategory({ name: 'Men', status: 'active' });
			const kurtas = await createCategory({
				name: 'Kurtas',
				parentId: men._id.toString(),
				status: 'active',
			});
			const premium = await createCategory({
				name: 'Premium',
				parentId: kurtas._id.toString(),
				status: 'active',
			});

			const result = await getCategoryWithBreadcrumb(
				premium._id.toString()
			);
			expect(result?.breadcrumb?.length).toBeGreaterThanOrEqual(2);
		});
	});

	describe('reorderCategories', () => {
		test('should update category positions', async () => {
			const cat1 = await createCategory({
				name: 'First',
				status: 'active',
			});
			const cat2 = await createCategory({
				name: 'Second',
				status: 'active',
			});

			await reorderCategories([
				{ id: cat1._id.toString(), position: 2 },
				{ id: cat2._id.toString(), position: 1 },
			]);

			const updated1 = await Category.findById(cat1._id);
			const updated2 = await Category.findById(cat2._id);

			expect(updated1?.position).toBe(2);
			expect(updated2?.position).toBe(1);
		});
	});

	describe('canDeleteCategory', () => {
		test('should allow deletion of empty category', async () => {
			const category = await createCategory({
				name: 'Empty',
				status: 'active',
			});

			const canDelete = await canDeleteCategory(category._id.toString());
			expect(canDelete).toBe(true);
		});

		test('should allow deletion when category has children', async () => {
			const parent = await createCategory({
				name: 'Parent',
				status: 'active',
			});
			const child = await createCategory({
				name: 'Child',
				parentId: parent._id.toString(),
				status: 'active',
			});

			const canDelete = await canDeleteCategory(parent._id.toString());
			expect(canDelete).toBe(true);
		});
	});

	describe('deleteCategory', () => {
		test('should soft delete category', async () => {
			const category = await createCategory({
				name: 'Kurtas',
				status: 'active',
			});

			await deleteCategory(category._id.toString());

			const deleted = await Category.findById(category._id);
			expect(deleted?.status).toBe('hidden');
		});

		test('should be queryable after soft delete', async () => {
			const category = await createCategory({
				name: 'Kurtas',
				status: 'active',
			});

			await deleteCategory(category._id.toString());

			const found = await Category.findOne({
				_id: category._id,
				status: { $ne: 'hidden' },
			});

			expect(found).toBeNull();
		});
	});

	describe('updateCategoryProductCount', () => {
		test('should increment product count', async () => {
			const category = await createCategory({
				name: 'Kurtas',
				status: 'active',
			});
			const initialCount = category.productCount;

			await updateCategoryProductCount(category._id.toString(), 5);

			const updated = await Category.findById(category._id);
			expect(updated?.productCount).toBe(initialCount + 5);
		});

		test('should handle negative increments', async () => {
			const category = await createCategory({
				name: 'Kurtas',
				status: 'active',
			});

			await updateCategoryProductCount(category._id.toString(), 10);
			await updateCategoryProductCount(category._id.toString(), -3);

			const updated = await Category.findById(category._id);
			expect(updated?.productCount).toBe(7);
		});
	});

	describe('getCategoryDescendants', () => {
		test('should get all descendants', async () => {
			const parent = await createCategory({
				name: 'Men',
				status: 'active',
			});
			const child1 = await createCategory({
				name: 'Kurtas',
				parentId: parent._id.toString(),
				status: 'active',
			});
			const child2 = await createCategory({
				name: 'Shirts',
				parentId: parent._id.toString(),
				status: 'active',
			});
			const grandchild = await createCategory({
				name: 'Premium Kurtas',
				parentId: child1._id.toString(),
				status: 'active',
			});

			const descendants = await getCategoryDescendants(
				parent._id.toString()
			);
			expect(descendants.length).toBeGreaterThanOrEqual(3);
			expect(descendants.map((d) => d._id)).toContainEqual(child1._id);
			expect(descendants.map((d) => d._id)).toContainEqual(child2._id);
			expect(descendants.map((d) => d._id)).toContainEqual(
				grandchild._id
			);
		});

		test('should return empty array for leaf node', async () => {
			const category = await createCategory({
				name: 'Kurtas',
				status: 'active',
			});

			const descendants = await getCategoryDescendants(
				category._id.toString()
			);
			expect(descendants.length).toBe(0);
		});
	});
});
