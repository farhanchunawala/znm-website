import { NextRequest, NextResponse } from 'next/server';
import { TestRegistry } from '@/lib/devtest/core';
import { isDevtestEnabled, devtestResponse, devtestError } from '@/lib/devtest/core';

/**
 * GET /api/devtest/tests
 * List all available tests, optionally filtered by category or tags
 * 
 * Query params:
 * - category: Filter by category (unit, service, integration, e2e, payment)
 * - tag: Filter by tag
 * - includeResults: Include recent results for each test
 */
export async function GET(request: NextRequest) {
  if (!isDevtestEnabled()) {
    return devtestError('DEVTEST_DISABLED', 'Devtest is not enabled in this environment');
  }
  
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const tag = searchParams.get('tag');
    const includeResults = searchParams.get('includeResults') === 'true';
    
    let tests = TestRegistry.getAllTests();
    
    // Filter by category
    if (category) {
      tests = tests.filter(t => t.category === category);
    }
    
    // Filter by tag
    if (tag) {
      tests = tests.filter(t => t.tags?.includes(tag));
    }
    
    // Optionally include recent results
    if (includeResults) {
      tests = tests.map(test => ({
        ...test,
        recentResults: TestRegistry.getResults(test.id, 5),
      }));
    }
    
    return devtestResponse({
      success: true,
      count: tests.length,
      tests,
      categories: {
        unit: tests.filter(t => t.category === 'unit').length,
        service: tests.filter(t => t.category === 'service').length,
        integration: tests.filter(t => t.category === 'integration').length,
        e2e: tests.filter(t => t.category === 'e2e').length,
        payment: tests.filter(t => t.category === 'payment').length,
      },
    });
  } catch (error: any) {
    return devtestError('LIST_TESTS_FAILED', error.message);
  }
}
