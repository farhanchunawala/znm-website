import { NextRequest, NextResponse } from 'next/server';

/**
 * Core types for the System Verification Dashboard
 */

export interface TestAssertion {
  name: string;
  passed: boolean;
  expected: any;
  actual: any;
  message?: string;
}

export interface StateChange {
  entity: string;           // 'Order', 'Payment', 'Inventory', etc.
  action: string;           // 'created', 'updated', 'deleted'
  before?: Record<string, any>;
  after?: Record<string, any>;
}

export interface TestError {
  code: string;
  message: string;
  stack?: string;
}

export interface TestResult {
  // Identification
  testId: string;
  testName: string;
  category: 'unit' | 'service' | 'integration' | 'e2e' | 'payment';
  tags: string[];
  
  // Status
  status: 'PASS' | 'FAIL' | 'SKIP' | 'ERROR' | 'TIMEOUT';
  reason?: string;
  
  // Timing
  startTime: Date;
  endTime: Date;
  duration: number;         // milliseconds
  
  // Component
  affectedComponent: string;
  
  // Assertions
  assertions: TestAssertion[];
  passedAssertions: number;
  failedAssertions: number;
  
  // State Changes
  stateChanges: StateChange[];
  
  // Error
  error?: TestError;
  
  // Expected vs Actual
  expectedResult?: Record<string, any>;
  actualResult?: Record<string, any>;
  
  // Test Data
  testData?: {
    created: Record<string, any>;
    used: Record<string, any>;
  };
  
  // Flow
  flowSteps: Array<{
    step: number;
    name: string;
    status: 'pending' | 'running' | 'passed' | 'failed';
    duration?: number;
    error?: TestError;
  }>;
}

export interface TestCase {
  id: string;
  name: string;
  description: string;
  category: 'unit' | 'service' | 'integration' | 'e2e' | 'payment';
  tags: string[];
  timeout?: number;           // milliseconds
  dependencies?: string[];    // IDs of tests that must run first
  execute: (context: TestContext) => Promise<TestResult>;
  cleanup: (context: TestContext) => Promise<void>;
}

export interface TestContext {
  testId: string;
  startTime: Date;
  assertions: TestAssertion[];
  stateChanges: StateChange[];
  flowSteps: TestResult['flowSteps'];
  testData: {
    created: Record<string, any>;
    used: Record<string, any>;
  };
  
  // Helper methods
  assert: (condition: boolean, name: string, expected: any, actual: any) => void;
  recordStateChange: (change: StateChange) => void;
  recordFlowStep: (step: number, name: string, status: 'pending' | 'running' | 'passed' | 'failed', error?: TestError) => void;
  skipTest: (reason: string) => void;
  
  // Test data helpers
  createTestData: (type: string, data: Record<string, any>) => Promise<any>;
  getTestData: (type: string, filter: Record<string, any>) => Promise<any>;
  cleanupTestData: (type: string, id: string) => Promise<void>;
}

/**
 * Test Registry for managing all test cases
 */
export class TestRegistry {
  private static tests: Map<string, TestCase> = new Map();
  private static results: Map<string, TestResult[]> = new Map();
  
  static register(test: TestCase) {
    this.tests.set(test.id, test);
  }
  
  static getTest(id: string): TestCase | undefined {
    return this.tests.get(id);
  }
  
  static getAllTests(): TestCase[] {
    return Array.from(this.tests.values());
  }
  
  static getTestsByCategory(category: string): TestCase[] {
    return Array.from(this.tests.values()).filter(t => t.category === category);
  }
  
  static getTestsByTag(tag: string): TestCase[] {
    return Array.from(this.tests.values()).filter(t => t.tags.includes(tag));
  }
  
  static addResult(testId: string, result: TestResult) {
    if (!this.results.has(testId)) {
      this.results.set(testId, []);
    }
    this.results.get(testId)!.push(result);
  }
  
  static getResults(testId?: string): TestResult[] {
    if (testId) {
      return this.results.get(testId) || [];
    }
    return Array.from(this.results.values()).flat();
  }
  
  static getLatestResult(testId: string): TestResult | undefined {
    const results = this.results.get(testId);
    return results?.[results.length - 1];
  }
  
  static clearResults(testId?: string) {
    if (testId) {
      this.results.delete(testId);
    } else {
      this.results.clear();
    }
  }
}

/**
 * Test Executor - runs individual tests with proper context
 */
export class TestExecutor {
  static async executeTest(testCase: TestCase): Promise<TestResult> {
    const startTime = new Date();
    const result: TestResult = {
      testId: testCase.id,
      testName: testCase.name,
      category: testCase.category,
      tags: testCase.tags,
      status: 'RUNNING' as any,
      startTime,
      endTime: startTime,
      duration: 0,
      affectedComponent: '',
      assertions: [],
      passedAssertions: 0,
      failedAssertions: 0,
      stateChanges: [],
      flowSteps: [],
      testData: {
        created: {},
        used: {},
      },
    };
    
    const context: TestContext = {
      testId: testCase.id,
      startTime,
      assertions: result.assertions,
      stateChanges: result.stateChanges,
      flowSteps: result.flowSteps,
      testData: result.testData,
      
      assert: (condition, name, expected, actual) => {
        const assertion: TestAssertion = {
          name,
          passed: condition,
          expected,
          actual,
        };
        result.assertions.push(assertion);
        
        if (condition) {
          result.passedAssertions++;
        } else {
          result.failedAssertions++;
        }
      },
      
      recordStateChange: (change) => {
        result.stateChanges.push(change);
      },
      
      recordFlowStep: (step, name, status, error) => {
        result.flowSteps.push({ step, name, status, error });
      },
      
      skipTest: (reason) => {
        result.status = 'SKIP';
        result.reason = reason;
      },
      
      createTestData: async (type, data) => {
        // Implemented in child classes
        return null;
      },
      
      getTestData: async (type, filter) => {
        // Implemented in child classes
        return null;
      },
      
      cleanupTestData: async (type, id) => {
        // Implemented in child classes
      },
    };
    
    try {
      // Check for timeout
      const timeout = testCase.timeout || 30000;
      const executePromise = testCase.execute(context);
      
      const timeoutPromise = new Promise<TestResult>((_, reject) => {
        setTimeout(() => reject(new Error('Test timeout')), timeout);
      });
      
      await Promise.race([executePromise, timeoutPromise]);
      
      result.status = result.status === 'SKIP' ? 'SKIP' : (result.failedAssertions === 0 ? 'PASS' : 'FAIL');
    } catch (error: any) {
      result.status = error.message === 'Test timeout' ? 'TIMEOUT' : 'ERROR';
      result.error = {
        code: error.code || 'UNKNOWN_ERROR',
        message: error.message || 'Unknown error',
        stack: error.stack,
      };
    }
    
    result.endTime = new Date();
    result.duration = result.endTime.getTime() - startTime.getTime();
    
    // Cleanup
    try {
      await testCase.cleanup(context);
    } catch (error: any) {
      console.error(`Cleanup failed for test ${testCase.id}:`, error);
    }
    
    // Store result
    TestRegistry.addResult(testCase.id, result);
    
    return result;
  }
  
  static async executeBatch(testIds: string[]): Promise<TestResult[]> {
    const results: TestResult[] = [];
    
    for (const testId of testIds) {
      const testCase = TestRegistry.getTest(testId);
      if (testCase) {
        const result = await this.executeTest(testCase);
        results.push(result);
      }
    }
    
    return results;
  }
  
  static async executeByCategory(category: string): Promise<TestResult[]> {
    const tests = TestRegistry.getTestsByCategory(category);
    const testIds = tests.map(t => t.id);
    return this.executeBatch(testIds);
  }
  
  static async executeByTag(tag: string): Promise<TestResult[]> {
    const tests = TestRegistry.getTestsByTag(tag);
    const testIds = tests.map(t => t.id);
    return this.executeBatch(testIds);
  }
}

/**
 * Middleware check for development mode
 */
export function isDevtestEnabled(): boolean {
  // Only enable in development
  if (process.env.NODE_ENV !== 'development') {
    return false;
  }
  
  // Optional: Check for specific feature flag
  return process.env.DEVTEST_ENABLED !== 'false';
}

/**
 * Standard response for devtest APIs
 */
export function devtestResponse(data: any, status: number = 200) {
  return NextResponse.json(
    {
      success: status >= 200 && status < 300,
      data,
      timestamp: new Date(),
    },
    { status }
  );
}

/**
 * Error response for devtest APIs
 */
export function devtestError(message: string, code: string, status: number = 400) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
      },
      timestamp: new Date(),
    },
    { status }
  );
}
