import mongoose, { Mongoose } from 'mongoose';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface MongooseCache {
	conn: Mongoose | null;
	promise: Promise<Mongoose | null> | null;
}

declare global {
	// eslint-disable-next-line no-var
	var mongoose: MongooseCache | undefined;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
	throw new Error(
		'❌ MongoDB URI not configured. Please set MONGODB_URI in your .env.local file'
	);
}

// ============================================================================
// CACHE INITIALIZATION
// ============================================================================

let cached: MongooseCache = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
	global.mongoose = cached;
}

// ============================================================================
// CONNECTION FUNCTION
// ============================================================================

/**
 * Establish or retrieve cached MongoDB connection
 *
 * Features:
 * - Caches connection to avoid duplicates during hot reload
 * - Returns null if connection fails (non-blocking)
 * - Fully typed for TypeScript strict mode
 * - Safe for Next.js App Router
 *
 * @returns Promise<Mongoose | null> - Mongoose instance or null if offline
 *
 * @example
 * import dbConnect from '@/lib/mongodb';
 *
 * async function myHandler() {
 *   const mongoose = await dbConnect();
 *   if (!mongoose) {
 *     return new NextResponse({ error: 'Database unavailable' }, { status: 503 });
 *   }
 *   // Use your models...
 * }
 */
async function dbConnect(): Promise<Mongoose | null> {
	// Return cached connection if available
	if (cached.conn) {
		console.log('📦 Using cached MongoDB connection');
		return cached.conn;
	}

	// Return pending promise if connection is in progress
	if (cached.promise) {
		console.log('⏳ Waiting for MongoDB connection in progress...');
		return cached.promise;
	}

	// Establish new connection
	try {
		console.log('🔗 Establishing new MongoDB connection...');

		cached.promise = mongoose
			.connect(MONGODB_URI!, {
				bufferCommands: false,
				connectTimeoutMS: 10000,
				serverSelectionTimeoutMS: 10000,
				socketTimeoutMS: 45000,
			})
			.then((instance) => {
				console.log('✅ MongoDB connected successfully');
				return instance;
			})
			.catch((error) => {
				console.error('❌ MongoDB connection failed:', {
					message: error.message,
					code: error.code,
				});
				// Return null instead of throwing to allow app to continue
				return null;
			});

		cached.conn = await cached.promise;
		return cached.conn;
	} catch (error) {
		console.error('❌ Unexpected error during MongoDB connection:', error);
		return null;
	}
}

// ============================================================================
// EXPORTS
// ============================================================================

export default dbConnect;

// Export as named export for compatibility
export { dbConnect };

// Export alias for backward compatibility
export { dbConnect as connectDB };
