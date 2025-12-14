import { NextRequest, NextResponse } from 'next/server';
import { TestRegistry } from '@/lib/devtest/core';
import { isDevtestEnabled, devtestResponse, devtestError } from '@/lib/devtest/core';

/**
 * GET /api/devtest/results
 * Retrieve test results (filtered and paginated)
 * 
 * Query params:
 * - testId?: string    // Get results for specific test
 * - limit?: number     // Max results (default: 50)
 * - offset?: number    // Pagination offset (default: 0)
 * - category?: string  // Filter by category
 * - status?: string    // Filter by status (passed, failed, skipped)
 * - sortBy?: string    // Sort field (createdAt, duration, testId)
 * - order?: string     // Sort order (asc, desc)
 * 
 * Response:
 * - Array of TestResult objects
 * - Pagination info
 */
export async function GET(request: NextRequest) {
  if (!isDevtestEnabled()) {
    return devtestError('DEVTEST_DISABLED', 'Devtest is not enabled in this environment');
  }
  
  try {
    const { searchParams } = new URL(request.url);
    const testId = searchParams.get('testId');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const order = searchParams.get('order') === 'asc' ? 'asc' : 'desc';
    
    let results = [];
    
    // Get results by test ID
    if (testId) {
      const testResults = TestRegistry.getResults(testId, 1000);
      results = testResults || [];
    } else {
      // Get all results
      results = TestRegistry.getAllResults() || [];
    }
    
    // Filter by category
    if (category) {
      results = results.filter(r => {
        const test = TestRegistry.getTest(r.testId);
        return test?.category === category;
      });
    }
    
    // Filter by status
    if (status) {
      if (status === 'passed') {
        results = results.filter(r => r.passed);
      } else if (status === 'failed') {
        results = results.filter(r => !r.passed);
      } else if (status === 'skipped') {
        results = results.filter(r => r.skipped);
      }
    }
    
    // Sort results
    results.sort((a, b) => {
      let aVal: any, bVal: any;
      
      switch (sortBy) {
        case 'duration':
          aVal = a.duration || 0;
          bVal = b.duration || 0;
          break;
        case 'testId':
          aVal = a.testId;
          bVal = b.testId;
          break;
        case 'createdAt':
        default:
          aVal = a.createdAt?.getTime() || 0;
          bVal = b.createdAt?.getTime() || 0;
          break;
      }
      
      return order === 'asc' ? aVal - bVal : bVal - aVal;
    });
    
    // Paginate
    const total = results.length;
    const paginatedResults = results.slice(offset, offset + limit);
    
    // Calculate summary stats
    const summary = {
      total,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length,
      skipped: results.filter(r => r.skipped).length,
      averageDuration: results.length > 0
        ? results.reduce((sum, r) => sum + (r.duration || 0), 0) / results.length
        : 0,
    };
    
    return devtestResponse({
      success: true,
      results: paginatedResults,
      pagination: {
        offset,
        limit,
        total,
        hasMore: offset + limit < total,
        pages: Math.ceil(total / limit),
        currentPage: Math.floor(offset / limit) + 1,
      },
      summary,
    });
  } catch (error: any) {
    console.error('Results retrieval error:', error);
    return devtestError('RESULTS_RETRIEVAL_ERROR', error.message);
  }
}

/**
 * DELETE /api/devtest/results
 * Clear test results
 * 
 * Query params:
 * - testId?: string    // Clear results for specific test
 * - all?: boolean      // Clear all results
 */
export async function DELETE(request: NextRequest) {
  if (!isDevtestEnabled()) {
    return devtestError('DEVTEST_DISABLED', 'Devtest is not enabled in this environment');
  }
  
  try {
    const { searchParams } = new URL(request.url);
    const testId = searchParams.get('testId');
    const all = searchParams.get('all') === 'true';
    
    if (testId) {
      TestRegistry.clearResults(testId);
      return devtestResponse({
        success: true,
        message: `Cleared results for test: ${testId}`,
      });
    } else if (all) {
      TestRegistry.clearAllResults();
      return devtestResponse({
        success: true,
        message: 'Cleared all test results',
      });
    } else {
      return devtestError('INVALID_REQUEST', 'Provide testId or set all=true');
    }
  } catch (error: any) {
    console.error('Results deletion error:', error);
    return devtestError('RESULTS_DELETION_ERROR', error.message);
  }
}
