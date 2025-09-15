import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || '';

if (!MONGODB_URI) {
	throw new Error(
		'Please define the MONGODB_URI environment variable inside .env.local'
	);
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = global.mongoose;

if (!cached) {
	cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
	if (cached.conn) {
		return cached.conn;
	}

	if (!cached.promise) {
		const opts = {
			bufferCommands: false,
		};

		cached.promise = mongoose
			.connect(MONGODB_URI!, opts) // using ! to bypass type error
			.then((mongoose) => mongoose)
			.catch((err) => {
				console.warn(
					'Mongoose connection failed, but continuing:',
					err.message
				);
				return null; // optional: return null so app continues
			});
	}
	cached.conn = await cached.promise;
	return cached.conn;
}

export default dbConnect;
