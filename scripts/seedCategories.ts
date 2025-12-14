import dbConnect from '@/lib/mongodb';
import Category from '@/models/CategoryModel';
import { Collection } from '@/models/CategoryModel';
import { createCategory, createCollection } from '@/lib/services';

/**
 * Seed default categories and collections
 */
export async function seedCategoriesAndCollections() {
	await dbConnect();

	// Clear existing
	await Category.deleteMany({});
	await Collection.deleteMany({});

	console.log('Seeding categories...');

	// Create root categories
	const menCategory = await createCategory({
		name: 'Men',
		description: "Men's clothing collection",
		status: 'active',
	});

	const womenCategory = await createCategory({
		name: 'Women',
		description: "Women's clothing collection",
		status: 'active',
	});

	const boysCategory = await createCategory({
		name: 'Boys',
		description: "Boys' clothing collection",
		status: 'active',
	});

	const girlsCategory = await createCategory({
		name: 'Girls',
		description: "Girls' clothing collection",
		status: 'active',
	});

	// Create subcategories for Men
	const kurtaCategory = await createCategory({
		name: 'Kurtas',
		description: 'Traditional and contemporary kurtas',
		parentId: menCategory._id.toString(),
		status: 'active',
	});

	const shirtsCategory = await createCategory({
		name: 'Shirts',
		description: 'Casual and formal shirts',
		parentId: menCategory._id.toString(),
		status: 'active',
	});

	const suitsCategory = await createCategory({
		name: 'Suits',
		description: 'Formal and wedding suits',
		parentId: menCategory._id.toString(),
		status: 'active',
	});

	console.log('Seeding collections...');

	// Create manual collection
	const kurtaFestCollection = new Collection({
		title: 'Kurta Fest',
		handle: 'kurta-fest',
		description: 'Curated collection of premium kurtas',
		type: 'manual',
		productIds: [],
		priority: 10,
		status: 'active',
	});

	await kurtaFestCollection.save();

	// Create dynamic collection (New Arrivals)
	const newArrivalsCollection = new Collection({
		title: 'New Arrivals',
		handle: 'new-arrivals',
		description: 'Products added in the last 30 days',
		type: 'dynamic',
		rules: [
			{
				field: 'createdAt',
				operator: 'dateRange',
				value: {
					start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
					end: new Date(),
				},
			},
		],
		priority: 5,
		status: 'active',
	});

	await newArrivalsCollection.save();

	// Create dynamic collection (Best Sellers)
	const bestSellersCollection = new Collection({
		title: 'Best Sellers',
		handle: 'best-sellers',
		description: 'Top selling products',
		type: 'dynamic',
		rules: [
			{
				field: 'status',
				operator: 'eq',
				value: 'active',
			},
		],
		priority: 8,
		status: 'active',
	});

	await bestSellersCollection.save();

	console.log('✅ Seed data created successfully');
	return {
		categories: {
			men: menCategory,
			women: womenCategory,
			boys: boysCategory,
			girls: girlsCategory,
			kurtas: kurtaCategory,
			shirts: shirtsCategory,
			suits: suitsCategory,
		},
		collections: {
			kurtaFest: kurtaFestCollection,
			newArrivals: newArrivalsCollection,
			bestSellers: bestSellersCollection,
		},
	};
}

// Run seed
if (require.main === module) {
	seedCategoriesAndCollections().catch(console.error);
}
