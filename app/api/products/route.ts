import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Product, { IProduct } from '@/models/ProductModel';
import { ProductCreateSchema } from '@/lib/validations/productValidation';
import {
	generateSlug,
	generateMasterSKU,
	searchProducts,
} from '@/lib/services/productService';
import { handleError } from '@/lib/utils/errors';

/**
 * POST /api/products - Create product
 */
export async function POST(req: NextRequest) {
	try {
		await dbConnect();

		// Parse and validate request
		const body = await req.json();
		const validated = ProductCreateSchema.parse(body);

		// Generate slug and master SKU if not provided
		const slug = await generateSlug(validated.title);
		const sku = validated.sku || (await generateMasterSKU(validated.title));

		// Create product
		const product = new Product({
			...validated,
			slug,
			sku,
		});

		await product.save();

		return NextResponse.json(
			{
				success: true,
				data: product,
				meta: { timestamp: new Date().toISOString() },
			},
			{ status: 201 }
		);
	} catch (error) {
		return handleError(error);
	}
}

/**
 * GET /api/products - List products with filters and search
 */
export async function GET(req: NextRequest) {
	try {
		await dbConnect();

		const { searchParams } = new URL(req.url);

		// Parse query parameters
		const q = searchParams.get('q') || '';
		const category = searchParams.get('category') || '';
		const tag = searchParams.get('tag') || '';
		const status = (searchParams.get('status') as any) || 'active';
		const minPrice = searchParams.get('minPrice')
			? parseInt(searchParams.get('minPrice')!)
			: undefined;
		const maxPrice = searchParams.get('maxPrice')
			? parseInt(searchParams.get('maxPrice')!)
			: undefined;
		const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
		const limit = Math.min(
			100,
			parseInt(searchParams.get('limit') || '10')
		);
		const skip = (page - 1) * limit;

		// Build filters object
		const filters = {
			category: category || undefined,
			tag: tag || undefined,
			status: status || undefined,
			minPrice,
			maxPrice,
			skip,
			limit,
		};

		// Search with filters
		const { products, total } = await searchProducts(q, filters);

		return NextResponse.json({
			success: true,
			data: products,
			meta: {
				total,
				page,
				limit,
				pages: Math.ceil(total / limit),
				timestamp: new Date().toISOString(),
			},
		});
	} catch (error) {
		return handleError(error);
	}
}
