'use client';

import { useState, useEffect } from 'react';
import {
  ExclamationTriangleIcon,
  ShoppingBagIcon,
  ArrowLeftIcon,
  ChartBarIcon,
  Square3Stack3DIcon,
  DocumentTextIcon,
  NoSymbolIcon
} from '@heroicons/react/24/outline';
import styles from '../inventory.module.scss';

interface InventoryDetail {
  _id: string;
  productId: string;
  variantSku: string;
  stockOnHand: number;
  reserved: number;
  available: number;
  batches: Array<{
    batchId: string;
    qty: number;
    receivedAt: string;
    expiry?: string;
    location?: string;
    supplier?: string;
  }>;
  lowStockThreshold: number;
  isLowStock: boolean;
  locationId?: string;
  auditCount: number;
  createdAt: string;
  updatedAt: string;
}

interface AuditEntry {
  action: string;
  qty: number;
  actor: string;
  timestamp: string;
  metadata?: {
    orderId?: string;
    reason?: string;
    batchId?: string;
  };
}

export default function InventoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [inventory, setInventory] = useState<InventoryDetail | null>(null);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'overview' | 'batches' | 'audit'>('overview');

  const [id, setId] = useState<string | null>(null);

  useEffect(() => {
    params.then((p) => setId(p.id));
  }, [params]);

  useEffect(() => {
    if (!id) return;

    const fetchInventory = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/inventory/${id}`);
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response.json();
        setInventory(data.data);
        setError(null);

        // TODO: Fetch audit trail separately
        // const auditRes = await fetch(`/api/inventory/${id}/audit`);
        // const auditData = await auditRes.json();
        // setAudit(auditData.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchInventory();
  }, [id]);

  if (loading) {
    return <div className={styles.container}>Loading...</div>;
  }

  if (!inventory) {
    return (
      <div className={styles.container}>
        <div className={styles.error}><ExclamationTriangleIcon className={styles.errorIcon} /> Inventory not found</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1><ShoppingBagIcon className={styles.headerIcon} /> Inventory: {inventory.variantSku}</h1>
        <div className={styles.breadcrumb}>
          <a href="/admin/inventory"><ArrowLeftIcon className={styles.backIcon} /> Back to Inventory</a>
        </div>
      </div>

      <div className={styles.tabsContainer}>
        <div className={styles.tabs}>
          {(['overview', 'batches', 'audit'] as const).map((t) => (
            <button
              key={t}
              className={`${styles.tab} ${tab === t ? styles.active : ''}`}
              onClick={() => setTab(t)}
            >
              {t === 'overview' ? (
                <>
                  <ChartBarIcon className={styles.tabIcon} /> Overview
                </>
              ) : t === 'batches' ? (
                <>
                  <Square3Stack3DIcon className={styles.tabIcon} /> Batches
                </>
              ) : (
                <>
                  <DocumentTextIcon className={styles.tabIcon} /> Audit Trail
                </>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* OVERVIEW TAB */}
      {tab === 'overview' && (
        <div className={styles.tabContent}>
          <div className={styles.grid}>
            {/* Stock Metrics */}
            <div className={styles.card}>
              <h3>Stock Metrics</h3>
              <div className={styles.metric}>
                <span className={styles.label}>Stock on Hand:</span>
                <span className={styles.value}>{inventory.stockOnHand}</span>
              </div>
              <div className={styles.metric}>
                <span className={styles.label}>Reserved:</span>
                <span className={styles.value} style={{ color: '#2196f3' }}>
                  {inventory.reserved}
                </span>
              </div>
              <div className={styles.metric}>
                <span className={styles.label}>Available:</span>
                <span
                  className={styles.value}
                  style={{
                    color:
                      inventory.available === 0
                        ? '#f44336'
                        : inventory.isLowStock
                          ? '#ff9800'
                          : '#4caf50'
                  }}
                >
                  {inventory.available}
                </span>
              </div>
              <div className={styles.divider}></div>
              <div className={styles.metric}>
                <span className={styles.label}>Low Stock Threshold:</span>
                <span className={styles.value}>{inventory.lowStockThreshold}</span>
              </div>
              {inventory.isLowStock && (
                <div className={styles.alert}>
                  <ExclamationTriangleIcon className={styles.alertIcon} /> Stock is below threshold
                </div>
              )}
            </div>

            {/* Batch Info */}
            <div className={styles.card}>
              <h3>Batch Information</h3>
              <div className={styles.metric}>
                <span className={styles.label}>Active Batches:</span>
                <span className={styles.value}>{inventory.batches.length}</span>
              </div>
              <div className={styles.metric}>
                <span className={styles.label}>Total Batch Qty:</span>
                <span className={styles.value}>
                  {inventory.batches.reduce((sum, b) => sum + b.qty, 0)}
                </span>
              </div>

              {inventory.batches.length > 0 && (
                <>
                  <div className={styles.divider}></div>
                  <h4>Oldest Batch (FIFO)</h4>
                  {inventory.batches[0] && (
                    <div className={styles.batchInfo}>
                      <p>
                        <strong>{inventory.batches[0].batchId}</strong> ({inventory.batches[0].qty} units)
                      </p>
                      <p className={styles.secondary}>
                        Received: {new Date(inventory.batches[0].receivedAt).toLocaleDateString()}
                      </p>
                      {inventory.batches[0].expiry && (
                        <p className={styles.secondary}>
                          Expires: {new Date(inventory.batches[0].expiry).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Location & Metadata */}
            <div className={styles.card}>
              <h3>Metadata</h3>
              <div className={styles.metric}>
                <span className={styles.label}>Location:</span>
                <span className={styles.value}>{inventory.locationId || 'Default'}</span>
              </div>
              <div className={styles.metric}>
                <span className={styles.label}>Created:</span>
                <span className={styles.secondary}>
                  {new Date(inventory.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className={styles.metric}>
                <span className={styles.label}>Last Updated:</span>
                <span className={styles.secondary}>
                  {new Date(inventory.updatedAt).toLocaleDateString()}
                </span>
              </div>
              <div className={styles.metric}>
                <span className={styles.label}>Audit Entries:</span>
                <span className={styles.value}>{inventory.auditCount}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BATCHES TAB */}
      {tab === 'batches' && (
        <div className={styles.tabContent}>
          {inventory.batches.length === 0 ? (
            <div className={styles.empty}>
              <p>No batches yet</p>
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Batch ID</th>
                    <th>Quantity</th>
                    <th>Received</th>
                    <th>Expiry</th>
                    <th>Supplier</th>
                    <th>Location</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.batches.map((batch, idx) => (
                    <tr key={idx}>
                      <td>
                        <code>{batch.batchId}</code>
                      </td>
                      <td>{batch.qty}</td>
                      <td>{new Date(batch.receivedAt).toLocaleDateString()}</td>
                      <td>
                        {batch.expiry ? (
                          <>
                            {new Date(batch.expiry).toLocaleDateString()}
                            {new Date(batch.expiry) < new Date() && (
                              <span style={{ color: '#f44336', marginLeft: '8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <NoSymbolIcon style={{ width: '14px', height: '14px' }} />
                                EXPIRED
                              </span>
                            )}
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>{batch.supplier || '—'}</td>
                      <td>{batch.location || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* AUDIT TAB */}
      {tab === 'audit' && (
        <div className={styles.tabContent}>
          {audit.length === 0 ? (
            <div className={styles.empty}>
              <p>No audit entries yet</p>
            </div>
          ) : (
            <div className={styles.auditList}>
              {audit.map((entry, idx) => (
                <div key={idx} className={styles.auditEntry}>
                  <div className={styles.auditAction}>{entry.action.toUpperCase()}</div>
                  <div className={styles.auditDetails}>
                    <p>
                      <strong>Qty:</strong> {entry.qty} | <strong>Actor:</strong> {entry.actor}
                    </p>
                    <p className={styles.timestamp}>
                      {new Date(entry.timestamp).toLocaleString()}
                    </p>
                    {entry.metadata?.reason && (
                      <p className={styles.secondary}>Reason: {entry.metadata.reason}</p>
                    )}
                    {entry.metadata?.orderId && (
                      <p className={styles.secondary}>Order: {entry.metadata.orderId}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
