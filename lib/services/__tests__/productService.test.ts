/**
 * Product Service Tests
 * Tests slug generation, SKU uniqueness, variant validation, publish rules, and search filters
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import Product from '@/models/ProductModel';
import {
	generateSlug,
	generateMasterSKU,
	generateVariantSKU,
	validatePricing,
	validatePublish,
	isSKUUnique,
	normalizeOption,
	addVariantToProduct,
	removeVariantFromProduct,
	searchProducts,
	softDeleteProduct,
} from '@/lib/services/productService';
import dbConnect from '@/lib/mongodb';

describe('Product Service Tests', () => {
	beforeAll(async () => {
		await dbConnect();
		// Clear products collection
		await Product.deleteMany({});
	});

	afterAll(async () => {
		await Product.deleteMany({});
	});

	describe('Slug Generation', () => {
		it('should generate unique slug from title', async () => {
			const slug = await generateSlug('Rustic Orange Kurta');
			expect(slug).toBe('rustic-orange-kurta');
		});

		it('should handle slug collisions', async () => {
			const title = 'Test Product';

			// Create first product
			const product1 = new Product({
				title,
				slug: 'test-product',
				sku: 'TP-001',
				variants: [{ sku: 'TP-001-S', price: 100 }],
			});
			await product1.save();

			// Generate slug for second product with same title
			const slug2 = await generateSlug(title);
			expect(slug2).not.toBe('test-product');
			expect(slug2).toMatch(/test-product-\d+/);
		});

		it('should handle special characters in slug', async () => {
			const slug = await generateSlug('Kurta @ Sale! (50% OFF)');
			expect(slug).toBe('kurta-sale-50-off');
		});
	});

	describe('SKU Generation', () => {
		it('should generate unique master SKU', async () => {
			const sku = await generateMasterSKU('Test Product');
			expect(sku).toMatch(/^TP-\d{6}$/);
		});

		it('should generate variant SKU from options', async () => {
			const masterSKU = 'KURTA-001';
			const options = [
				{ name: 'size', value: 'medium' },
				{ name: 'color', value: 'red' },
			];

			const variantSKU = await generateVariantSKU(masterSKU, options);
			expect(variantSKU).toMatch(/^KURTA-001-/);
		});

		it('should prevent duplicate variant SKUs', async () => {
			const product = new Product({
				title: 'Test',
				slug: 'test-sku',
				sku: 'TEST-SKU-001',
				variants: [
					{
						sku: 'TEST-SKU-001-MRE',
						price: 100,
						options: [
							{ name: 'size', value: 'M' },
							{ name: 'color', value: 'red' },
						],
					},
				],
			});
			await product.save();

			const duplicate = await generateVariantSKU('TEST-SKU-001', [
				{ name: 'size', value: 'M' },
				{ name: 'color', value: 'red' },
			]);

			expect(duplicate).not.toBe('TEST-SKU-001-MRE');
		});
	});

	describe('Price Validation', () => {
		it('should accept valid price', () => {
			expect(() => validatePricing(100)).not.toThrow();
		});

		it('should reject zero or negative price', () => {
			expect(() => validatePricing(0)).toThrow();
			expect(() => validatePricing(-50)).toThrow();
		});

		it('should accept comparePrice >= price', () => {
			expect(() => validatePricing(100, 150)).not.toThrow();
			expect(() => validatePricing(100, 100)).not.toThrow();
		});

		it('should reject comparePrice < price', () => {
			expect(() => validatePricing(100, 50)).toThrow(
				/Compare price must be greater/
			);
		});
	});

	describe('Publish Validation', () => {
		it('should prevent publish without title', async () => {
			const product = new Product({
				slug: 'no-title',
				sku: 'NO-TITLE-001',
				variants: [{ sku: 'NO-TITLE-001-M', price: 100 }],
			});
			await product.save();

			await expect(
				validatePublish(product._id.toString())
			).rejects.toThrow(/title before publishing/);
		});

		it('should prevent publish without variants', async () => {
			const product = new Product({
				title: 'No Variants',
				slug: 'no-variants',
				sku: 'NO-VAR-001',
				variants: [],
			});
			await product.save();

			await expect(
				validatePublish(product._id.toString())
			).rejects.toThrow(/at least 1 variant/);
		});

		it('should allow publish with title and variants', async () => {
			const product = new Product({
				title: 'Valid Product',
				slug: 'valid-product',
				sku: 'VALID-001',
				variants: [
					{
						sku: 'VALID-001-M',
						price: 100,
						options: [{ name: 'size', value: 'M' }],
					},
				],
			});
			await product.save();

			const validated = await validatePublish(product._id.toString());
			expect(validated).toBeDefined();
			expect(validated.title).toBe('Valid Product');
		});
	});

	describe('SKU Uniqueness', () => {
		it('should detect duplicate master SKU', async () => {
			const product = new Product({
				title: 'SKU Test',
				slug: 'sku-test',
				sku: 'SKU-UNIQUE',
				variants: [{ sku: 'SKU-UNIQUE-1', price: 100 }],
			});
			await product.save();

			const isUnique = await isSKUUnique('SKU-UNIQUE');
			expect(isUnique).toBe(false);
		});

		it('should detect duplicate variant SKU', async () => {
			const product = new Product({
				title: 'Variant SKU Test',
				slug: 'variant-sku-test',
				sku: 'VAR-SKU-TEST',
				variants: [
					{
						sku: 'VAR-SKU-TEST-DUP',
						price: 100,
						options: [{ name: 'size', value: 'M' }],
					},
				],
			});
			await product.save();

			const isUnique = await isSKUUnique(
				'VAR-SKU-TEST-DUP',
				undefined,
				true
			);
			expect(isUnique).toBe(false);
		});

		it('should allow SKU for same product (update)', async () => {
			const product = new Product({
				title: 'Update SKU Test',
				slug: 'update-sku-test',
				sku: 'UPDATE-SKU-TEST',
				variants: [{ sku: 'UPDATE-SKU-TEST-1', price: 100 }],
			});
			await product.save();

			// Should allow same SKU for this product
			const isUnique = await isSKUUnique(
				'UPDATE-SKU-TEST',
				product._id.toString()
			);
			expect(isUnique).toBe(true);
		});
	});

	describe('Option Normalization', () => {
		it('should normalize option values', () => {
			const normalized = normalizeOption('Size', '  MEDIUM  ');
			expect(normalized).toEqual({ name: 'size', value: 'medium' });
		});

		it('should handle special characters', () => {
			const normalized = normalizeOption('COLOUR', 'Rust-Red');
			expect(normalized).toEqual({ name: 'colour', value: 'rust-red' });
		});
	});

	describe('Variant Management', () => {
		it('should add variant to product', async () => {
			const product = new Product({
				title: 'Add Variant Test',
				slug: 'add-variant-test',
				sku: 'ADD-VAR-TEST',
				variants: [
					{
						sku: 'ADD-VAR-TEST-S',
						price: 100,
						options: [{ name: 'size', value: 's' }],
					},
				],
			});
			await product.save();

			const newVariant = {
				sku: 'ADD-VAR-TEST-M',
				price: 100,
				options: [{ name: 'size', value: 'm' }],
				images: [],
				isActive: true,
			};

			const updated = await addVariantToProduct(
				product._id.toString(),
				newVariant
			);
			expect(updated.variants).toHaveLength(2);
			expect(updated.variants[1].sku).toBe('ADD-VAR-TEST-M');
		});

		it('should prevent duplicate variant SKU on add', async () => {
			const product = new Product({
				title: 'Dup Variant Test',
				slug: 'dup-variant-test',
				sku: 'DUP-VAR-TEST',
				variants: [
					{
						sku: 'DUP-VAR-TEST-S',
						price: 100,
						options: [{ name: 'size', value: 's' }],
					},
				],
			});
			await product.save();

			const duplicate = {
				sku: 'DUP-VAR-TEST-S',
				price: 100,
				options: [{ name: 'size', value: 's' }],
				images: [],
				isActive: true,
			};

			await expect(
				addVariantToProduct(product._id.toString(), duplicate)
			).rejects.toThrow(/already exists/);
		});

		it('should prevent removing last variant', async () => {
			const product = new Product({
				title: 'Last Variant Test',
				slug: 'last-variant-test',
				sku: 'LAST-VAR-TEST',
				variants: [
					{
						sku: 'LAST-VAR-TEST-S',
						price: 100,
						options: [{ name: 'size', value: 's' }],
					},
				],
			});
			await product.save();

			await expect(
				removeVariantFromProduct(
					product._id.toString(),
					product.variants[0]._id!.toString()
				)
			).rejects.toThrow(/Cannot delete the only variant/);
		});
	});

	describe('Search and Filters', () => {
		beforeAll(async () => {
			// Clear and create test data
			await Product.deleteMany({});

			const testProducts = [
				{
					title: 'Silk Kurta Blue',
					slug: 'silk-kurta-blue',
					sku: 'KURTA-BLUE-001',
					status: 'active',
					tags: ['silk', 'kurta', 'blue'],
					variants: [
						{
							sku: 'KURTA-BLUE-001-S',
							price: 1500,
							comparePrice: 2000,
							options: [],
						},
						{
							sku: 'KURTA-BLUE-001-M',
							price: 1500,
							comparePrice: 2000,
							options: [],
						},
					],
				},
				{
					title: 'Cotton Shirt White',
					slug: 'cotton-shirt-white',
					sku: 'SHIRT-WHITE-001',
					status: 'active',
					tags: ['cotton', 'shirt', 'white'],
					variants: [
						{
							sku: 'SHIRT-WHITE-001-S',
							price: 800,
							comparePrice: 1200,
							options: [],
						},
					],
				},
				{
					title: 'Wool Shawl Red',
					slug: 'wool-shawl-red',
					sku: 'SHAWL-RED-001',
					status: 'draft',
					tags: ['wool', 'shawl', 'red'],
					variants: [
						{
							sku: 'SHAWL-RED-001-OS',
							price: 3000,
							comparePrice: 4500,
							options: [],
						},
					],
				},
			];

			for (const p of testProducts) {
				const product = new Product(p);
				await product.save();
			}
		});

		it('should search by text', async () => {
			const { products } = await searchProducts('silk');
			expect(products.length).toBeGreaterThan(0);
			expect(products[0].title).toContain('Silk');
		});

		it('should filter by status', async () => {
			const { products } = await searchProducts('', { status: 'active' });
			expect(products.every((p) => p.status === 'active')).toBe(true);
		});

		it('should filter by tag', async () => {
			const { products } = await searchProducts('', { tag: 'cotton' });
			expect(products.length).toBeGreaterThan(0);
			expect(products[0].tags).toContain('cotton');
		});

		it('should filter by price range', async () => {
			const { products } = await searchProducts('', {
				minPrice: 1000,
				maxPrice: 2000,
			});
			expect(products.length).toBeGreaterThan(0);
		});

		it('should paginate results', async () => {
			const { products: page1, total } = await searchProducts('', {
				skip: 0,
				limit: 2,
			});
			expect(page1.length).toBeLessThanOrEqual(2);
			expect(total).toBeGreaterThan(0);
		});
	});

	describe('Soft Delete', () => {
		it('should archive product instead of hard delete', async () => {
			const product = new Product({
				title: 'Delete Test',
				slug: 'delete-test',
				sku: 'DELETE-TEST',
				status: 'active',
				variants: [{ sku: 'DELETE-TEST-S', price: 100, options: [] }],
			});
			await product.save();

			const archived = await softDeleteProduct(product._id.toString());
			expect(archived.status).toBe('archived');

			// Verify product still exists in DB
			const found = await Product.findById(product._id);
			expect(found).toBeDefined();
			expect(found?.status).toBe('archived');
		});
	});
});
