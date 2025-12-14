import dbConnect from '@/lib/mongodb';
import { Collection } from '@/models/CategoryModel';
import { evaluateCollectionRules } from '@/lib/services/collectionService';

/**
 * Background job to evaluate dynamic collections periodically
 * Run with: node -r ts-node/register lib/workers/collectionEvaluator.ts
 * Or schedule with cron: 0 * * * * (every hour)
 */

class CollectionEvaluator {
	private isRunning = false;
	private intervalId: NodeJS.Timeout | null = null;
	private evaluationIntervalMs = 60 * 60 * 1000; // 1 hour default

	constructor(intervalMs?: number) {
		if (intervalMs) {
			this.evaluationIntervalMs = intervalMs;
		}
	}

	/**
	 * Start the evaluator service
	 */
	async start(): Promise<void> {
		if (this.isRunning) {
			console.log('CollectionEvaluator is already running');
			return;
		}

		await dbConnect();
		this.isRunning = true;

		console.log(
			`CollectionEvaluator started. Will evaluate every ${
				this.evaluationIntervalMs / 1000 / 60
			} minutes`
		);

		// Run immediately on start
		await this.evaluateAllDynamicCollections();

		// Then run on interval
		this.intervalId = setInterval(
			() => this.evaluateAllDynamicCollections(),
			this.evaluationIntervalMs
		);
	}

	/**
	 * Stop the evaluator service
	 */
	stop(): void {
		if (this.intervalId) {
			clearInterval(this.intervalId);
		}
		this.isRunning = false;
		console.log('CollectionEvaluator stopped');
	}

	/**
	 * Evaluate all active dynamic collections
	 */
	private async evaluateAllDynamicCollections(): Promise<void> {
		try {
			const startTime = Date.now();

			// Find all dynamic collections
			const dynamicCollections = await Collection.find({
				type: 'dynamic',
				status: { $ne: 'hidden' },
			});

			if (dynamicCollections.length === 0) {
				console.log(
					`[${new Date().toISOString()}] No dynamic collections to evaluate`
				);
				return;
			}

			console.log(
				`[${new Date().toISOString()}] Evaluating ${dynamicCollections.length} dynamic collections...`
			);

			// Evaluate each collection
			let successCount = 0;
			let errorCount = 0;

			for (const collection of dynamicCollections) {
				try {
					const evaluated = await evaluateCollectionRules(
						collection._id.toString()
					);

					console.log(
						`  ✓ ${collection.title}: ${evaluated?.cachedProductIds?.length || 0} products matched`
					);
					successCount++;
				} catch (error) {
					console.error(
						`  ✗ Error evaluating collection "${collection.title}":`,
						error
					);
					errorCount++;
				}
			}

			const duration = Date.now() - startTime;

			console.log(
				`[${new Date().toISOString()}] Evaluation complete: ${successCount} succeeded, ${errorCount} failed (${duration}ms)`
			);
		} catch (error) {
			console.error('Error in evaluateAllDynamicCollections:', error);
		}
	}

	/**
	 * Evaluate specific collection
	 */
	async evaluateCollection(collectionId: string): Promise<void> {
		if (!this.isRunning) {
			await dbConnect();
		}

		try {
			const collection = await Collection.findById(collectionId);

			if (!collection) {
				console.error(`Collection ${collectionId} not found`);
				return;
			}

			if (collection.type !== 'dynamic') {
				console.warn(`Collection ${collectionId} is not dynamic`);
				return;
			}

			console.log(`Evaluating collection "${collection.title}"...`);

			const evaluated = await evaluateCollectionRules(collectionId);

			console.log(
				`✓ Evaluation complete: ${evaluated?.cachedProductIds?.length || 0} products matched`
			);
		} catch (error) {
			console.error('Error evaluating collection:', error);
		}
	}

	/**
	 * Get evaluation stats
	 */
	async getStats(): Promise<{
		totalDynamicCollections: number;
		lastEvaluationStats: Array<{
			name: string;
			matchedProducts: number;
			evaluatedAt: Date | null;
		}>;
	}> {
		if (!this.isRunning) {
			await dbConnect();
		}

		const collections = await Collection.find({
			type: 'dynamic',
			status: { $ne: 'hidden' },
		});

		return {
			totalDynamicCollections: collections.length,
			lastEvaluationStats: collections.map((c) => ({
				name: c.title,
				matchedProducts: c.cachedProductIds?.length || 0,
				evaluatedAt: c.cachedAt || null,
			})),
		};
	}
}

// Create and export singleton instance
export const collectionEvaluator = new CollectionEvaluator();

// Run if executed directly
if (require.main === module) {
	collectionEvaluator
		.start()
		.then(() => {
			// Keep running
			console.log('Press Ctrl+C to stop');
		})
		.catch((error) => {
			console.error('Failed to start evaluator:', error);
			process.exit(1);
		});

	// Handle graceful shutdown
	process.on('SIGINT', () => {
		console.log('\nShutting down...');
		collectionEvaluator.stop();
		process.exit(0);
	});
}
