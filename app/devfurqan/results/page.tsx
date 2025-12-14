'use client';

import React, { useState, useEffect } from 'react';
import styles from './results.module.scss';

/**
 * Results Viewer Component
 * View and analyze test execution history
 */

interface TestResult {
  _id?: string;
  testId: string;
  testName: string;
  passed: boolean;
  skipped: boolean;
  reason?: string;
  duration?: number;
  createdAt: string;
  assertions?: Array<{
    name: string;
    passed: boolean;
    expected?: any;
    actual?: any;
  }>;
  stateChanges?: Array<{
    entity: string;
    action: string;
    before: Record<string, any>;
    after: Record<string, any>;
  }>;
}

interface ResultsData {
  results: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    averageDuration: number;
  };
  pagination: {
    offset: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

const ResultsViewer: React.FC = () => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [data, setData] = useState<ResultsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    status: 'all', // all, passed, failed
    category: '',
    limit: 50,
    offset: 0,
  });
  const [selectedResult, setSelectedResult] = useState<TestResult | null>(null);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  
  useEffect(() => {
    fetchResults();
  }, [filter.status, filter.category, filter.limit, filter.offset, sortBy, sortOrder]);
  
  const fetchResults = async () => {
    try {
      setLoading(true);
      
      let query = `?limit=${filter.limit}&offset=${filter.offset}&sortBy=${sortBy}&order=${sortOrder}`;
      
      if (filter.status !== 'all') {
        query += `&status=${filter.status}`;
      }
      
      if (filter.category) {
        query += `&category=${filter.category}`;
      }
      
      const res = await fetch(`/api/devtest/results${query}`);
      const data = await res.json();
      
      if (data.success) {
        setResults(data.results || []);
        setData(data);
      }
    } catch (err) {
      console.error('Failed to fetch results:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleClearResults = async (testId?: string) => {
    if (!window.confirm('Are you sure? This action cannot be undone.')) {
      return;
    }
    
    try {
      const query = testId ? `?testId=${testId}` : '?all=true';
      const res = await fetch(`/api/devtest/results${query}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        fetchResults();
      }
    } catch (err) {
      console.error('Failed to clear results:', err);
    }
  };
  
  const getPassPercentage = () => {
    if (!data || data.summary.total === 0) return 0;
    return ((data.summary.passed / data.summary.total) * 100).toFixed(1);
  };
  
  const goToPage = (page: number) => {
    const newOffset = (page - 1) * filter.limit;
    setFilter({ ...filter, offset: newOffset });
  };
  
  const currentPage = Math.floor(filter.offset / filter.limit) + 1;
  const totalPages = data ? Math.ceil(data.pagination.total / filter.limit) : 1;
  
  return (
    <div className={styles.resultsViewer}>
      <div className={styles.header}>
        <h1>Results Viewer</h1>
        <p>Review and analyze test execution history</p>
      </div>
      
      {/* Summary Stats */}
      {data && (
        <div className={styles.summaryStats}>
          <div className={`${styles.stat} ${styles.total}`}>
            <span className={styles.label}>Total Runs</span>
            <span className={styles.value}>{data.summary.total}</span>
          </div>
          <div className={`${styles.stat} ${styles.passed}`}>
            <span className={styles.label}>Passed</span>
            <span className={styles.value}>{data.summary.passed}</span>
          </div>
          <div className={`${styles.stat} ${styles.failed}`}>
            <span className={styles.label}>Failed</span>
            <span className={styles.value}>{data.summary.failed}</span>
          </div>
          <div className={`${styles.stat} ${styles.rate}`}>
            <span className={styles.label}>Success Rate</span>
            <span className={styles.value}>{getPassPercentage()}%</span>
          </div>
          <div className={`${styles.stat} ${styles.duration}`}>
            <span className={styles.label}>Avg Duration</span>
            <span className={styles.value}>{data.summary.averageDuration.toFixed(0)}ms</span>
          </div>
        </div>
      )}
      
      {/* Filters & Controls */}
      <div className={styles.controls}>
        <div className={styles.filterGroup}>
          <select
            value={filter.status}
            onChange={(e) => setFilter({ ...filter, status: e.target.value, offset: 0 })}
            className={styles.select}
          >
            <option value="all">All Status</option>
            <option value="passed">Passed</option>
            <option value="failed">Failed</option>
          </select>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className={styles.select}
          >
            <option value="createdAt">Sort by Date</option>
            <option value="duration">Sort by Duration</option>
            <option value="testId">Sort by Test</option>
          </select>
          
          <button
            className={styles.sortBtn}
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            title="Toggle sort order"
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
          
          <button
            className={styles.clearBtn}
            onClick={() => handleClearResults()}
            title="Clear all results"
          >
            🗑️ Clear All
          </button>
        </div>
      </div>
      
      {/* Results List */}
      <div className={styles.resultsList}>
        {loading ? (
          <div className={styles.loading}>Loading results...</div>
        ) : results.length === 0 ? (
          <div className={styles.empty}>No results found</div>
        ) : (
          <>
            {results.map((result, idx) => (
              <div
                key={idx}
                className={`${styles.resultCard} ${
                  result.passed ? styles.passed : styles.failed
                } ${selectedResult === result ? styles.selected : ''}`}
                onClick={() => setSelectedResult(selectedResult === result ? null : result)}
              >
                <div className={styles.resultCardHeader}>
                  <span className={styles.status}>
                    {result.passed ? '✓' : '✗'}
                  </span>
                  <div className={styles.resultInfo}>
                    <h4>{result.testName}</h4>
                    <p className={styles.testId}>{result.testId}</p>
                  </div>
                  <span className={styles.duration}>
                    {result.duration}ms
                  </span>
                  <span className={styles.time}>
                    {new Date(result.createdAt).toLocaleString()}
                  </span>
                </div>
                
                {selectedResult === result && (
                  <div className={styles.resultDetails}>
                    {result.reason && (
                      <div className={styles.section}>
                        <h5>Failure Reason</h5>
                        <p>{result.reason}</p>
                      </div>
                    )}
                    
                    {result.assertions && result.assertions.length > 0 && (
                      <div className={styles.section}>
                        <h5>Assertions ({result.assertions.length})</h5>
                        <div className={styles.assertionsList}>
                          {result.assertions.map((assertion, aIdx) => (
                            <div
                              key={aIdx}
                              className={`${styles.assertion} ${
                                assertion.passed ? styles.passed : styles.failed
                              }`}
                            >
                              <span className={styles.status}>
                                {assertion.passed ? '✓' : '✗'}
                              </span>
                              <span className={styles.name}>{assertion.name}</span>
                              {!assertion.passed && (
                                <div className={styles.diff}>
                                  <small>
                                    Expected: <code>{JSON.stringify(assertion.expected)}</code>
                                    <br />
                                    Got: <code>{JSON.stringify(assertion.actual)}</code>
                                  </small>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {result.stateChanges && result.stateChanges.length > 0 && (
                      <div className={styles.section}>
                        <h5>State Changes ({result.stateChanges.length})</h5>
                        <div className={styles.stateChangesList}>
                          {result.stateChanges.map((change, cIdx) => (
                            <div key={cIdx} className={styles.stateChange}>
                              <strong>{change.entity}</strong> ({change.action})
                              <pre className={styles.diff}>
                                {JSON.stringify(
                                  {
                                    before: change.before,
                                    after: change.after,
                                  },
                                  null,
                                  2
                                )}
                              </pre>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className={styles.resultActions}>
                      <button
                        className={styles.deleteBtn}
                        onClick={() => handleClearResults(result.testId)}
                      >
                        Delete Result
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>
      
      {/* Pagination */}
      {data && data.pagination.total > filter.limit && (
        <div className={styles.pagination}>
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className={styles.pageBtn}
          >
            ← Previous
          </button>
          
          <div className={styles.pageInfo}>
            Page {currentPage} of {totalPages}
          </div>
          
          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={styles.pageBtn}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
};

export default ResultsViewer;
