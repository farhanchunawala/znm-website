'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './dashboard.module.scss';

/**
 * System Verification Dashboard - Home Page
 * Main landing page with navigation and system health overview
 */

interface DashboardStats {
  totalTests: number;
  testsRun: number;
  testsPassed: number;
  testsFailed: number;
  averageDuration: number;
  lastRunTime?: string;
}

interface GatewayStatus {
  name: string;
  status: 'connected' | 'disconnected' | 'error';
  lastChecked: string;
}

const DevtestDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [gateways, setGateways] = useState<GatewayStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);
  
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch tests
      const testsRes = await fetch('/api/devtest/tests');
      const testsData = await testsRes.json();
      
      // Fetch results summary
      const resultsRes = await fetch('/api/devtest/results?limit=100');
      const resultsData = await resultsRes.json();
      
      // Fetch payment gateway info
      const paymentRes = await fetch('/api/devtest/payment?info=gateways');
      const paymentData = await paymentRes.json();
      
      if (testsData.success && resultsData.success) {
        const results = resultsData.results || [];
        
        setStats({
          totalTests: testsData.count || 0,
          testsRun: results.length,
          testsPassed: results.filter((r: any) => r.passed).length,
          testsFailed: results.filter((r: any) => !r.passed).length,
          averageDuration: resultsData.summary?.averageDuration || 0,
          lastRunTime: results[0]?.createdAt,
        });
        
        // Mock gateway statuses
        if (paymentData.success && paymentData.gateways) {
          setGateways(
            paymentData.gateways.map((g: any) => ({
              name: g.name,
              status: 'connected' as const,
              lastChecked: new Date().toISOString(),
            }))
          );
        }
      } else {
        setError('Failed to load dashboard data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };
  
  const successRate = stats && stats.testsRun > 0
    ? ((stats.testsPassed / stats.testsRun) * 100).toFixed(1)
    : 0;
  
  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h1 className={styles.title}>System Verification Dashboard</h1>
          <p className={styles.subtitle}>
            Comprehensive testing platform for order management, payments, and integrations
          </p>
        </div>
        <button
          className={styles.refreshBtn}
          onClick={fetchDashboardData}
          disabled={loading}
        >
          {loading ? 'Loading...' : '🔄 Refresh'}
        </button>
      </div>
      
      {error && (
        <div className={styles.errorBanner}>
          <span>⚠️ {error}</span>
        </div>
      )}
      
      {/* Stats Grid */}
      <section className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.primary}`}>
          <h3 className={styles.statLabel}>Total Tests</h3>
          <div className={styles.statValue}>{stats?.totalTests || 0}</div>
          <p className={styles.statDesc}>Available test cases</p>
        </div>
        
        <div className={`${styles.statCard} ${stats && stats.testsPassed === stats.testsRun && stats.testsRun > 0 ? styles.success : styles.neutral}`}>
          <h3 className={styles.statLabel}>Tests Run</h3>
          <div className={styles.statValue}>{stats?.testsRun || 0}</div>
          <p className={styles.statDesc}>Total executions</p>
        </div>
        
        <div className={`${styles.statCard} ${styles.success}`}>
          <h3 className={styles.statLabel}>Passed</h3>
          <div className={styles.statValue}>{stats?.testsPassed || 0}</div>
          <p className={styles.statDesc}>{successRate}% success rate</p>
        </div>
        
        <div className={`${styles.statCard} ${stats?.testsFailed ? styles.danger : styles.success}`}>
          <h3 className={styles.statLabel}>Failed</h3>
          <div className={styles.statValue}>{stats?.testsFailed || 0}</div>
          <p className={styles.statDesc}>Requires attention</p>
        </div>
        
        <div className={`${styles.statCard} ${styles.neutral}`}>
          <h3 className={styles.statLabel}>Avg Duration</h3>
          <div className={styles.statValue}>{(stats?.averageDuration || 0).toFixed(0)}ms</div>
          <p className={styles.statDesc}>Per test average</p>
        </div>
        
        <div className={`${styles.statCard} ${styles.neutral}`}>
          <h3 className={styles.statLabel}>Last Run</h3>
          <div className={styles.statValue}>
            {stats?.lastRunTime
              ? new Date(stats.lastRunTime).toLocaleTimeString()
              : 'Never'
            }
          </div>
          <p className={styles.statDesc}>Recent activity</p>
        </div>
      </section>
      
      {/* Quick Actions */}
      <section className={styles.quickActions}>
        <h2 className={styles.sectionTitle}>Quick Actions</h2>
        <div className={styles.actionGrid}>
          <Link href="/devfurqan/runner" className={styles.actionCard}>
            <div className={styles.actionIcon}>▶️</div>
            <h3>Test Runner</h3>
            <p>Execute tests and view real-time results</p>
          </Link>
          
          <Link href="/devfurqan/results" className={styles.actionCard}>
            <div className={styles.actionIcon}>📊</div>
            <h3>Results Viewer</h3>
            <p>Review test history and compare runs</p>
          </Link>
          
          <Link href="/devfurqan/payment-simulator" className={styles.actionCard}>
            <div className={styles.actionIcon}>💳</div>
            <h3>Payment Simulator</h3>
            <p>Test payment flows with sandboxed gateways</p>
          </Link>
          
          <Link href="/devfurqan/architect" className={styles.actionCard}>
            <div className={styles.actionIcon}>🏗️</div>
            <h3>Architecture Visualizer</h3>
            <p>Validate system flows and architecture</p>
          </Link>
          
          <Link href="/devfurqan/data-manager" className={styles.actionCard}>
            <div className={styles.actionIcon}>🗄️</div>
            <h3>Data Manager</h3>
            <p>Seed, reset, and manage test data</p>
          </Link>
          
          <Link href="/devfurqan/documentation" className={styles.actionCard}>
            <div className={styles.actionIcon}>📚</div>
            <h3>Documentation</h3>
            <p>View testing guides and API documentation</p>
          </Link>
        </div>
      </section>
      
      {/* Gateway Status */}
      <section className={styles.gatewaySection}>
        <h2 className={styles.sectionTitle}>Payment Gateway Status</h2>
        <div className={styles.gatewayList}>
          {gateways.map(gateway => (
            <div key={gateway.name} className={styles.gatewayItem}>
              <div className={styles.gatewayStatus}>
                <span className={`${styles.statusBadge} ${styles[gateway.status]}`}>
                  {gateway.status === 'connected' ? '✓' : '✗'} {gateway.name}
                </span>
              </div>
              <p className={styles.gatewayTime}>
                Last checked: {new Date(gateway.lastChecked).toLocaleTimeString()}
              </p>
            </div>
          ))}
        </div>
      </section>
      
      {/* Key Features */}
      <section className={styles.features}>
        <h2 className={styles.sectionTitle}>Key Features</h2>
        <ul className={styles.featureList}>
          <li>✓ <strong>Unit Tests:</strong> Service layer validation</li>
          <li>✓ <strong>Service Tests:</strong> Business logic verification</li>
          <li>✓ <strong>Integration Tests:</strong> Module interactions</li>
          <li>✓ <strong>E2E Tests:</strong> Complete user flows</li>
          <li>✓ <strong>Payment Sandbox:</strong> Safe payment testing (Razorpay & Stripe)</li>
          <li>✓ <strong>Architecture Validation:</strong> Planned vs Actual flow comparison</li>
          <li>✓ <strong>Data Management:</strong> Seed, reset, and cleanup test data</li>
          <li>✓ <strong>Result Tracking:</strong> Historical data and comparisons</li>
          <li>✓ <strong>Webhook Testing:</strong> Delivery, signature verification, retries</li>
          <li>✓ <strong>API Documentation:</strong> Interactive API explorer</li>
        </ul>
      </section>
      
      {/* Test Categories */}
      <section className={styles.categories}>
        <h2 className={styles.sectionTitle}>Test Categories</h2>
        <div className={styles.categoryGrid}>
          <div className={styles.categoryCard}>
            <h3>Unit Tests</h3>
            <p>Individual function and method testing with isolated dependencies</p>
            <Link href="/devfurqan/runner?category=unit">View Tests →</Link>
          </div>
          
          <div className={styles.categoryCard}>
            <h3>Service Tests</h3>
            <p>Business logic validation with controlled dependencies</p>
            <Link href="/devfurqan/runner?category=service">View Tests →</Link>
          </div>
          
          <div className={styles.categoryCard}>
            <h3>Integration Tests</h3>
            <p>Module interaction and database integration testing</p>
            <Link href="/devfurqan/runner?category=integration">View Tests →</Link>
          </div>
          
          <div className={styles.categoryCard}>
            <h3>E2E Tests</h3>
            <p>End-to-end user flows and complete scenarios</p>
            <Link href="/devfurqan/runner?category=e2e">View Tests →</Link>
          </div>
          
          <div className={styles.categoryCard}>
            <h3>Payment Tests</h3>
            <p>Payment processing with sandbox gateways and webhooks</p>
            <Link href="/devfurqan/payment-simulator">Test Payments →</Link>
          </div>
        </div>
      </section>
      
      {/* Documentation Links */}
      <section className={styles.docLinks}>
        <h2 className={styles.sectionTitle}>Getting Started</h2>
        <p className={styles.docIntro}>
          New to the System Verification Dashboard? Start here:
        </p>
        <ul className={styles.linkList}>
          <li>
            <a href="/devfurqan/documentation">📖 View Full Documentation</a>
            <span>Complete guide with examples and best practices</span>
          </li>
          <li>
            <a href="/api/devtest/tests">📝 API Endpoint: /api/devtest/tests</a>
            <span>List all available tests and test metadata</span>
          </li>
          <li>
            <a href="/devfurqan/runner">🚀 Start Running Tests</a>
            <span>Execute tests and view results in real-time</span>
          </li>
        </ul>
      </section>
    </div>
  );
};

export default DevtestDashboard;
