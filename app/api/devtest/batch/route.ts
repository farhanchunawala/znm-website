import { NextRequest, NextResponse } from 'next/server';
import { TestRegistry, TestExecutor } from '@/lib/devtest/core';
import { isDevtestEnabled, devtestResponse, devtestError } from '@/lib/devtest/core';

/**
 * POST /api/devtest/batch
 * Execute multiple tests (filter by IDs, category, or tags)
 * 
 * Body (one of these):
 * {
 *   testIds: string[]  // Array of test IDs
 * }
 * OR
 * {
 *   category: 'unit' | 'service' | 'integration' | 'e2e' | 'payment'
 * }
 * OR
 * {
 *   tags: string[]     // Array of tags
 * }
 * 
 * Optional:
 * {
 *   timeout?: number,  // Per-test timeout in ms
 *   parallel?: boolean // Execute in parallel (default: false)
 * }
 * 
 * Response:
 * - Array of TestResult objects
 * - Summary with pass/fail counts
 */
export async function POST(request: NextRequest) {
  if (!isDevtestEnabled()) {
    return devtestError('DEVTEST_DISABLED', 'Devtest is not enabled in this environment');
  }
  
  try {
    const body = await request.json();
    const { testIds, category, tags, timeout = 30000, parallel = false } = body;
    
    let testsToExecute = [];
    
    // Get tests by IDs
    if (testIds && Array.isArray(testIds)) {
      testsToExecute = testIds
        .map(id => TestRegistry.getTest(id))
        .filter(t => t !== null);
    }
    // Get tests by category
    else if (category) {
      testsToExecute = TestRegistry.getAllTests().filter(t => t.category === category);
    }
    // Get tests by tags
    else if (tags && Array.isArray(tags)) {
      testsToExecute = TestRegistry.getAllTests().filter(t =>
        tags.some(tag => t.tags?.includes(tag))
      );
    }
    // Default: execute all tests
    else {
      testsToExecute = TestRegistry.getAllTests();
    }
    
    if (testsToExecute.length === 0) {
      return devtestResponse({
        success: true,
        count: 0,
        results: [],
        summary: {
          total: 0,
          passed: 0,
          failed: 0,
          skipped: 0,
          duration: 0,
        },
      });
    }
    
    // Execute tests
    const results = parallel
      ? await TestExecutor.executeBatch(testsToExecute, timeout)
      : await TestExecutor.executeBatch(testsToExecute, timeout);
    
    // Store all results
    for (const result of results) {
      TestRegistry.storeResult(result);
    }
    
    // Calculate summary
    const summary = {
      total: results.length,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length,
      skipped: results.filter(r => r.skipped).length,
      duration: results.reduce((sum, r) => sum + (r.duration || 0), 0),
    };
    
    const allPassed = summary.failed === 0 && summary.skipped === 0;
    
    return devtestResponse({
      success: allPassed,
      count: results.length,
      results,
      summary,
    });
  } catch (error: any) {
    console.error('Batch execution error:', error);
    return devtestError('BATCH_EXECUTION_ERROR', error.message);
  }
}
