'use client';

import React, { useState, useEffect, useCallback } from 'react';
import styles from './runner.module.scss';

/**
 * Test Runner Component
 * Execute individual or batch tests with real-time results
 */

interface Test {
  id: string;
  name: string;
  description?: string;
  category: string;
  tags?: string[];
  recentResults?: any[];
}

interface TestResult {
  testId: string;
  testName: string;
  passed: boolean;
  skipped: boolean;
  reason?: string;
  duration?: number;
  assertions?: Array<{
    name: string;
    passed: boolean;
    expected?: any;
    actual?: any;
  }>;
  createdAt: string;
}

const TestRunner: React.FC = () => {
  const [tests, setTests] = useState<Test[]>([]);
  const [selectedTests, setSelectedTests] = useState<Set<string>>(new Set());
  const [category, setCategory] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'results'>('list');
  const [executionProgress, setExecutionProgress] = useState(0);
  
  useEffect(() => {
    fetchTests();
  }, [category]);
  
  const fetchTests = async () => {
    try {
      setLoading(true);
      const query = category ? `?category=${category}` : '';
      const res = await fetch(`/api/devtest/tests${query}`);
      const data = await res.json();
      
      if (data.success) {
        setTests(data.tests || []);
      }
    } catch (err) {
      console.error('Failed to fetch tests:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSelectTest = (testId: string) => {
    const newSelected = new Set(selectedTests);
    if (newSelected.has(testId)) {
      newSelected.delete(testId);
    } else {
      newSelected.add(testId);
    }
    setSelectedTests(newSelected);
  };
  
  const handleSelectAll = () => {
    if (selectedTests.size === tests.length) {
      setSelectedTests(new Set());
    } else {
      setSelectedTests(new Set(tests.map(t => t.id)));
    }
  };
  
  const executeTests = useCallback(async () => {
    if (selectedTests.size === 0) {
      alert('Please select at least one test');
      return;
    }
    
    try {
      setExecuting(true);
      setResults([]);
      setViewMode('results');
      
      const testIds = Array.from(selectedTests);
      const res = await fetch('/api/devtest/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testIds,
          timeout: 30000,
          parallel: false,
        }),
      });
      
      const data = await res.json();
      
      if (data.success && data.results) {
        setResults(data.results);
        setExecutionProgress(100);
      }
    } catch (err) {
      console.error('Test execution failed:', err);
      alert('Failed to execute tests');
    } finally {
      setExecuting(false);
    }
  }, [selectedTests]);
  
  const executeSingleTest = async (testId: string) => {
    try {
      setExecuting(true);
      const res = await fetch('/api/devtest/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testId }),
      });
      
      const data = await res.json();
      
      if (data.success && data.result) {
        setResults([data.result]);
        setViewMode('results');
      }
    } catch (err) {
      console.error('Test execution failed:', err);
    } finally {
      setExecuting(false);
    }
  };
  
  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;
  const totalTime = results.reduce((sum, r) => sum + (r.duration || 0), 0);
  
  return (
    <div className={styles.runner}>
      <div className={styles.header}>
        <h1>Test Runner</h1>
        <p>Execute and monitor test cases in real-time</p>
      </div>
      
      {viewMode === 'list' ? (
        <>
          {/* Filters */}
          <div className={styles.filters}>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={styles.select}
            >
              <option value="">All Categories</option>
              <option value="unit">Unit Tests</option>
              <option value="service">Service Tests</option>
              <option value="integration">Integration Tests</option>
              <option value="e2e">E2E Tests</option>
              <option value="payment">Payment Tests</option>
            </select>
            
            <div className={styles.selectionInfo}>
              {selectedTests.size > 0 && (
                <span>{selectedTests.size} test(s) selected</span>
              )}
            </div>
          </div>
          
          {/* Test List */}
          <div className={styles.testList}>
            <div className={styles.listHeader}>
              <label className={styles.selectAllLabel}>
                <input
                  type="checkbox"
                  checked={selectedTests.size === tests.length && tests.length > 0}
                  onChange={handleSelectAll}
                  disabled={tests.length === 0}
                />
                <span>Select All ({tests.length})</span>
              </label>
              
              <button
                className={styles.executeBtn}
                onClick={executeTests}
                disabled={selectedTests.size === 0 || executing}
              >
                {executing ? 'Executing...' : '▶ Execute Tests'}
              </button>
            </div>
            
            {loading ? (
              <div className={styles.loading}>Loading tests...</div>
            ) : tests.length === 0 ? (
              <div className={styles.empty}>No tests found</div>
            ) : (
              <div className={styles.tests}>
                {tests.map(test => (
                  <div
                    key={test.id}
                    className={`${styles.testItem} ${
                      selectedTests.has(test.id) ? styles.selected : ''
                    }`}
                  >
                    <label className={styles.testCheckbox}>
                      <input
                        type="checkbox"
                        checked={selectedTests.has(test.id)}
                        onChange={() => handleSelectTest(test.id)}
                      />
                    </label>
                    
                    <div className={styles.testInfo}>
                      <h3>{test.name}</h3>
                      {test.description && <p>{test.description}</p>}
                      
                      <div className={styles.testMeta}>
                        <span className={`${styles.badge} ${styles[test.category]}`}>
                          {test.category}
                        </span>
                        {test.tags?.map(tag => (
                          <span key={tag} className={`${styles.badge} ${styles.tag}`}>
                            {tag}
                          </span>
                        ))}
                      </div>
                      
                      {test.recentResults && test.recentResults.length > 0 && (
                        <div className={styles.recentResults}>
                          <small>
                            Recent: {test.recentResults.filter((r: any) => r.passed).length}/
                            {test.recentResults.length} passed
                          </small>
                        </div>
                      )}
                    </div>
                    
                    <button
                      className={styles.runBtn}
                      onClick={() => executeSingleTest(test.id)}
                      title="Run this test only"
                    >
                      ▶
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Results View */}
          <div className={styles.resultsHeader}>
            <div className={styles.summaryStats}>
              <div className={styles.stat}>
                <span className={styles.label}>Total</span>
                <span className={styles.value}>{results.length}</span>
              </div>
              <div className={`${styles.stat} ${styles.passed}`}>
                <span className={styles.label}>Passed</span>
                <span className={styles.value}>{passedCount}</span>
              </div>
              <div className={`${styles.stat} ${styles.failed}`}>
                <span className={styles.label}>Failed</span>
                <span className={styles.value}>{failedCount}</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.label}>Time</span>
                <span className={styles.value}>{totalTime}ms</span>
              </div>
            </div>
            
            <button
              className={styles.backBtn}
              onClick={() => setViewMode('list')}
            >
              ← Back to Tests
            </button>
          </div>
          
          <div className={styles.resultsList}>
            {results.map((result, idx) => (
              <div
                key={idx}
                className={`${styles.resultItem} ${
                  result.passed ? styles.resultPassed : styles.resultFailed
                }`}
              >
                <div className={styles.resultHeader}>
                  <span className={styles.resultStatus}>
                    {result.passed ? '✓' : '✗'}
                  </span>
                  <h3>{result.testName}</h3>
                  <span className={styles.resultTime}>{result.duration}ms</span>
                </div>
                
                {result.reason && (
                  <p className={styles.resultReason}>{result.reason}</p>
                )}
                
                {result.assertions && result.assertions.length > 0 && (
                  <div className={styles.assertions}>
                    {result.assertions.map((assertion, aIdx) => (
                      <div
                        key={aIdx}
                        className={`${styles.assertion} ${
                          assertion.passed ? styles.passed : styles.failed
                        }`}
                      >
                        <span className={styles.assertionStatus}>
                          {assertion.passed ? '✓' : '✗'}
                        </span>
                        <span className={styles.assertionName}>{assertion.name}</span>
                        {!assertion.passed && (
                          <div className={styles.assertionDiff}>
                            <small>
                              Expected: {JSON.stringify(assertion.expected)}
                              <br />
                              Got: {JSON.stringify(assertion.actual)}
                            </small>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default TestRunner;
