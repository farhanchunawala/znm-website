import { NextRequest, NextResponse } from 'next/server';
import { TestRegistry, TestExecutor } from '@/lib/devtest/core';
import { isDevtestEnabled, devtestResponse, devtestError } from '@/lib/devtest/core';

/**
 * POST /api/devtest/execute
 * Execute a single test
 * 
 * Body:
 * {
 *   testId: string,  // Test ID to execute
 *   timeout?: number // Custom timeout in ms (default: 30000)
 * }
 * 
 * Response:
 * - TestResult object with full details
 */
export async function POST(request: NextRequest) {
  if (!isDevtestEnabled()) {
    return devtestError('DEVTEST_DISABLED', 'Devtest is not enabled in this environment');
  }
  
  try {
    const body = await request.json();
    const { testId, timeout } = body;
    
    if (!testId) {
      return devtestError('INVALID_REQUEST', 'testId is required');
    }
    
    // Get test definition
    const test = TestRegistry.getTest(testId);
    if (!test) {
      return devtestError('TEST_NOT_FOUND', `Test not found: ${testId}`);
    }
    
    // Execute test
    const result = await TestExecutor.executeTest(test, timeout);
    
    // Store result in registry
    TestRegistry.storeResult(result);
    
    return devtestResponse({
      success: result.passed,
      result,
    });
  } catch (error: any) {
    console.error('Test execution error:', error);
    return devtestError('EXECUTION_ERROR', error.message);
  }
}
