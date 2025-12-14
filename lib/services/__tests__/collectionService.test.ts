import {
	generateCollectionHandle,
	evaluateRule,
	evaluateRules,
	createCollection,
	updateCollection,
	evaluateCollectionRules,
	getCollectionProducts,
	addProductsToCollection,
	removeProductFromCollection,
	getActiveCollections,
	validateRules,
	deleteCollection,
	searchCollections,
} from '../collectionService';
import { Collection, IRule } from '@/models/CategoryModel';
import Product from '@/models/ProductModel';
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
	await Collection.deleteMany({});
	await Product.deleteMany({});
});

describe('CollectionService', () => {
	describe('generateCollectionHandle', () => {
		test('should generate handle from title', async () => {
			const handle = await generateCollectionHandle('New Arrivals');
			expect(handle).toBe('new-arrivals');
		});

		test('should handle collision by adding suffix', async () => {
			const collection = new Collection({
				title: 'New Arrivals',
				handle: 'new-arrivals',
				description: 'test',
				type: 'manual',
			});
			await collection.save();

			const handle = await generateCollectionHandle('New Arrivals');
			expect(handle).toMatch(/^new-arrivals-\d+$/);
		});

		test('should remove special characters from handle', async () => {
			const handle = await generateCollectionHandle('Best & Premium!@#');
			expect(handle).toBe('best-premium');
		});

		test('should handle multiple collisions', async () => {
			const col1 = new Collection({
				title: 'Kurta Fest',
				handle: 'kurta-fest',
				description: 'test',
				type: 'manual',
			});
			const col2 = new Collection({
				title: 'Kurta Fest',
				handle: 'kurta-fest-1',
				description: 'test',
				type: 'manual',
			});

			await col1.save();
			await col2.save();

			const handle = await generateCollectionHandle('Kurta Fest');
			expect(handle).toMatch(/^kurta-fest-\d+$/);
		});
	});

	describe('evaluateRule', () => {
		test('should evaluate eq operator', () => {
			const product = { status: 'active' };
			const rule: IRule = {
				field: 'status',
				operator: 'eq',
				value: 'active',
			};

			const result = evaluateRule(product, rule);
			expect(result).toBe(true);
		});

		test('should evaluate eq operator (false)', () => {
			const product = { status: 'draft' };
			const rule: IRule = {
				field: 'status',
				operator: 'eq',
				value: 'active',
			};

			const result = evaluateRule(product, rule);
			expect(result).toBe(false);
		});

		test('should evaluate contains operator', () => {
			const product = { description: 'Beautiful red kurta' };
			const rule: IRule = {
				field: 'description',
				operator: 'contains',
				value: 'kurta',
			};

			const result = evaluateRule(product, rule);
			expect(result).toBe(true);
		});

		test('should evaluate contains operator (false)', () => {
			const product = { description: 'Beautiful shirt' };
			const rule: IRule = {
				field: 'description',
				operator: 'contains',
				value: 'kurta',
			};

			const result = evaluateRule(product, rule);
			expect(result).toBe(false);
		});

		test('should evaluate gt operator', () => {
			const product = { price: 5000 };
			const rule: IRule = { field: 'price', operator: 'gt', value: 3000 };

			const result = evaluateRule(product, rule);
			expect(result).toBe(true);
		});

		test('should evaluate lt operator', () => {
			const product = { price: 2000 };
			const rule: IRule = { field: 'price', operator: 'lt', value: 3000 };

			const result = evaluateRule(product, rule);
			expect(result).toBe(true);
		});

		test('should evaluate in operator', () => {
			const product = { category: 'Kurta' };
			const rule: IRule = {
				field: 'category',
				operator: 'in',
				value: ['Kurta', 'Shirt', 'Suit'],
			};

			const result = evaluateRule(product, rule);
			expect(result).toBe(true);
		});

		test('should evaluate between operator', () => {
			const product = { price: 2500 };
			const rule: IRule = {
				field: 'price',
				operator: 'between',
				value: { min: 1000, max: 5000 },
			};

			const result = evaluateRule(product, rule);
			expect(result).toBe(true);
		});

		test('should evaluate between operator (false)', () => {
			const product = { price: 6000 };
			const rule: IRule = {
				field: 'price',
				operator: 'between',
				value: { min: 1000, max: 5000 },
			};

			const result = evaluateRule(product, rule);
			expect(result).toBe(false);
		});

		test('should evaluate dateRange operator', () => {
			const now = new Date();
			const past = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
			const future = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);

			const product = { createdAt: now };
			const rule: IRule = {
				field: 'createdAt',
				operator: 'dateRange',
				value: { start: past, end: future },
			};

			const result = evaluateRule(product, rule);
			expect(result).toBe(true);
		});

		test('should evaluate dateRange operator (false)', () => {
			const now = new Date();
			const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
			const future = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

			const product = { createdAt: now };
			const rule: IRule = {
				field: 'createdAt',
				operator: 'dateRange',
				value: { start: past, end: future },
			};

			const result = evaluateRule(product, rule);
			expect(result).toBe(false);
		});

		test('should handle nested fields', () => {
			const product = {
				variants: [{ sku: 'KUR-001', price: 2000 }],
			};
			const rule: IRule = {
				field: 'variants.0.price',
				operator: 'gt',
				value: 1000,
			};

			const result = evaluateRule(product, rule);
			expect(result).toBe(true);
		});
	});

	describe('evaluateRules', () => {
		test('should evaluate multiple rules with AND logic', () => {
			const product = {
				status: 'active',
				price: 2500,
				category: 'Kurta',
			};

			const rules: IRule[] = [
				{ field: 'status', operator: 'eq', value: 'active' },
				{ field: 'price', operator: 'gt', value: 2000 },
				{ field: 'category', operator: 'eq', value: 'Kurta' },
			];

			const result = evaluateRules(product, rules);
			expect(result).toBe(true);
		});

		test('should fail if any rule fails', () => {
			const product = { status: 'draft', price: 2500, category: 'Kurta' };

			const rules: IRule[] = [
				{ field: 'status', operator: 'eq', value: 'active' },
				{ field: 'price', operator: 'gt', value: 2000 },
				{ field: 'category', operator: 'eq', value: 'Kurta' },
			];

			const result = evaluateRules(product, rules);
			expect(result).toBe(false);
		});

		test('should return true for empty rules', () => {
			const product = { status: 'draft' };
			const rules: IRule[] = [];

			const result = evaluateRules(product, rules);
			expect(result).toBe(true);
		});
	});

	describe('validateRules', () => {
		test('should validate valid rules', () => {
			const rules: IRule[] = [
				{ field: 'status', operator: 'eq', value: 'active' },
				{ field: 'price', operator: 'gt', value: 1000 },
			];

			const result = validateRules(rules);
			expect(result).toBe(true);
		});

		test('should reject rules with invalid operator', () => {
			const rules = [
				{
					field: 'status',
					operator: 'invalid' as any,
					value: 'active',
				},
			];

			const result = validateRules(rules);
			expect(result).toBe(false);
		});

		test('should reject rules with missing field', () => {
			const rules = [
				{ field: '', operator: 'eq', value: 'active' } as any,
			];

			const result = validateRules(rules);
			expect(result).toBe(false);
		});

		test('should reject dateRange without start/end', () => {
			const rules = [
				{
					field: 'createdAt',
					operator: 'dateRange',
					value: { start: null },
				},
			];

			const result = validateRules(rules);
			expect(result).toBe(false);
		});
	});

	describe('createCollection', () => {
		test('should create manual collection', async () => {
			const collection = await createCollection({
				title: 'Kurta Fest',
				description: 'Premium kurtas',
				type: 'manual',
				status: 'active',
			});

			expect(collection._id).toBeDefined();
			expect(collection.title).toBe('Kurta Fest');
			expect(collection.type).toBe('manual');
			expect(collection.handle).toBeDefined();
		});

		test('should create dynamic collection with rules', async () => {
			const collection = await createCollection({
				title: 'New Arrivals',
				description: 'Recently added',
				type: 'dynamic',
				rules: [
					{
						field: 'createdAt',
						operator: 'dateRange',
						value: {
							start: new Date(
								Date.now() - 30 * 24 * 60 * 60 * 1000
							),
							end: new Date(),
						},
					},
				],
				status: 'active',
			});

			expect(collection.type).toBe('dynamic');
			expect(collection.rules.length).toBe(1);
		});

		test('should initialize empty product list for manual collection', async () => {
			const collection = await createCollection({
				title: 'Test',
				type: 'manual',
				status: 'active',
			});

			expect(collection.productIds).toEqual([]);
		});

		test('should set default priority', async () => {
			const collection = await createCollection({
				title: 'Test',
				type: 'manual',
				status: 'active',
			});

			expect(collection.priority).toBeDefined();
		});
	});

	describe('updateCollection', () => {
		test('should update collection title and description', async () => {
			const collection = await createCollection({
				title: 'Old Title',
				description: 'Old desc',
				type: 'manual',
				status: 'active',
			});

			const updated = await updateCollection(collection._id.toString(), {
				title: 'New Title',
				description: 'New desc',
			});

			expect(updated?.title).toBe('New Title');
			expect(updated?.description).toBe('New desc');
		});

		test('should update status', async () => {
			const collection = await createCollection({
				title: 'Test',
				type: 'manual',
				status: 'active',
			});

			const updated = await updateCollection(collection._id.toString(), {
				status: 'hidden',
			});

			expect(updated?.status).toBe('hidden');
		});

		test('should update rules for dynamic collection', async () => {
			const collection = await createCollection({
				title: 'Test',
				type: 'dynamic',
				rules: [{ field: 'status', operator: 'eq', value: 'active' }],
				status: 'active',
			});

			const newRules: IRule[] = [
				{ field: 'price', operator: 'gt', value: 1000 },
				{ field: 'price', operator: 'lt', value: 5000 },
			];

			const updated = await updateCollection(collection._id.toString(), {
				rules: newRules,
			});

			expect(updated?.rules.length).toBe(2);
		});
	});

	describe('addProductsToCollection', () => {
		test('should add products to manual collection', async () => {
			const collection = await createCollection({
				title: 'Test',
				type: 'manual',
				status: 'active',
			});

			const productId1 = new mongoose.Types.ObjectId();
			const productId2 = new mongoose.Types.ObjectId();

			await addProductsToCollection(collection._id.toString(), [
				productId1.toString(),
				productId2.toString(),
			]);

			const updated = await Collection.findById(collection._id);
			expect(updated?.productIds.length).toBe(2);
			expect(updated?.productIds.map((p) => p.toString())).toContainEqual(
				productId1.toString()
			);
		});

		test('should not add duplicate products', async () => {
			const collection = await createCollection({
				title: 'Test',
				type: 'manual',
				status: 'active',
			});

			const productId = new mongoose.Types.ObjectId();

			await addProductsToCollection(collection._id.toString(), [
				productId.toString(),
			]);
			await addProductsToCollection(collection._id.toString(), [
				productId.toString(),
			]);

			const updated = await Collection.findById(collection._id);
			expect(updated?.productIds.length).toBe(1);
		});
	});

	describe('removeProductFromCollection', () => {
		test('should remove product from manual collection', async () => {
			const productId1 = new mongoose.Types.ObjectId();
			const productId2 = new mongoose.Types.ObjectId();

			const collection = await createCollection({
				title: 'Test',
				type: 'manual',
				productIds: [productId1, productId2],
				status: 'active',
			});

			await removeProductFromCollection(
				collection._id.toString(),
				productId1.toString()
			);

			const updated = await Collection.findById(collection._id);
			expect(updated?.productIds.length).toBe(1);
			expect(
				updated?.productIds.map((p) => p.toString())
			).not.toContainEqual(productId1.toString());
		});

		test('should not fail if product not in collection', async () => {
			const collection = await createCollection({
				title: 'Test',
				type: 'manual',
				status: 'active',
			});

			const productId = new mongoose.Types.ObjectId();

			const result = await removeProductFromCollection(
				collection._id.toString(),
				productId.toString()
			);

			expect(result).toBeDefined();
		});
	});

	describe('evaluateCollectionRules', () => {
		test('should cache evaluated products for dynamic collection', async () => {
			const collection = await createCollection({
				title: 'Test',
				type: 'dynamic',
				rules: [{ field: 'status', operator: 'eq', value: 'active' }],
				status: 'active',
			});

			const evaluated = await evaluateCollectionRules(
				collection._id.toString()
			);

			expect(evaluated?.cachedProductIds).toBeDefined();
			expect(evaluated?.cachedAt).toBeDefined();
		});

		test('should not evaluate manual collection', async () => {
			const collection = await createCollection({
				title: 'Test',
				type: 'manual',
				status: 'active',
			});

			const evaluated = await evaluateCollectionRules(
				collection._id.toString()
			);

			expect(evaluated?.cachedAt).toBeUndefined();
		});
	});

	describe('getActiveCollections', () => {
		test('should return collections without schedule', async () => {
			const collection = await createCollection({
				title: 'Always Active',
				type: 'manual',
				status: 'active',
			});

			const active = await getActiveCollections();

			expect(active.map((c) => c._id.toString())).toContainEqual(
				collection._id.toString()
			);
		});

		test('should return collections within date range', async () => {
			const now = new Date();
			const past = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
			const future = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);

			const collection = await createCollection({
				title: 'Scheduled',
				type: 'manual',
				status: 'active',
				startAt: past,
				endAt: future,
			});

			const active = await getActiveCollections();

			expect(active.map((c) => c._id.toString())).toContainEqual(
				collection._id.toString()
			);
		});

		test('should exclude ended collections', async () => {
			const now = new Date();
			const past = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000);
			const morePast = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

			const collection = await createCollection({
				title: 'Ended',
				type: 'manual',
				status: 'active',
				startAt: past,
				endAt: morePast,
			});

			const active = await getActiveCollections();

			expect(active.map((c) => c._id.toString())).not.toContainEqual(
				collection._id.toString()
			);
		});
	});

	describe('deleteCollection', () => {
		test('should soft delete collection', async () => {
			const collection = await createCollection({
				title: 'Test',
				type: 'manual',
				status: 'active',
			});

			await deleteCollection(collection._id.toString());

			const deleted = await Collection.findById(collection._id);
			expect(deleted?.status).toBe('hidden');
		});
	});

	describe('searchCollections', () => {
		test('should search collections by title', async () => {
			await createCollection({
				title: 'Kurta Fest',
				type: 'manual',
				status: 'active',
			});

			const results = await searchCollections('Kurta');

			expect(results.length).toBeGreaterThan(0);
			expect(results[0].title).toContain('Kurta');
		});

		test('should filter by type', async () => {
			const manual = await createCollection({
				title: 'Manual Test',
				type: 'manual',
				status: 'active',
			});

			const results = await searchCollections('', { type: 'manual' });

			expect(results.length).toBeGreaterThan(0);
			expect(results[0].type).toBe('manual');
		});

		test('should filter by status', async () => {
			const collection = await createCollection({
				title: 'Active Collection',
				type: 'manual',
				status: 'active',
			});

			const results = await searchCollections('', { status: 'active' });

			expect(results.length).toBeGreaterThan(0);
			expect(results.every((c) => c.status === 'active')).toBe(true);
		});
	});
});
