'use client';

import { useState, useEffect } from 'react';
import styles from './inventory.module.scss';

interface InventoryItem {
  _id: string;
  variantSku: string;
  stockOnHand: number;
  reserved: number;
  available: number;
  batches: Array<{
    batchId: string;
    qty: number;
    receivedAt: string;
    expiry?: string;
  }>;
  lowStockThreshold: number;
  isLowStock: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AdjustmentModalState {
  isOpen: boolean;
  inventoryId: string | null;
  sku: string | null;
}

interface BatchModalState {
  isOpen: boolean;
  inventoryId: string | null;
}

export default function InventoryPage() {
  const [inventories, setInventories] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('all'); // 'all', 'lowstock', 'critical'
  const [searchTerm, setSearchTerm] = useState('');
  const [adjustmentModal, setAdjustmentModal] = useState<AdjustmentModalState>({
    isOpen: false,
    inventoryId: null,
    sku: null
  });
  const [batchModal, setBatchModal] = useState<BatchModalState>({
    isOpen: false,
    inventoryId: null
  });

  // Fetch inventories
  useEffect(() => {
    const fetchInventories = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/inventory/low-stock');
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response.json();
        setInventories(data.data.items || []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchInventories();
  }, []);

  // Filter inventories
  const filteredInventories = inventories.filter((inv) => {
    const matchesSearch = inv.variantSku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      filter === 'all' ||
      (filter === 'lowstock' && inv.isLowStock && inv.available > 0) ||
      (filter === 'critical' && inv.available === 0);
    return matchesSearch && matchesFilter;
  });

  const handleAdjustStock = async (
    inventoryId: string,
    qty: number,
    reason: string
  ) => {
    try {
      const response = await fetch(`/api/inventory/${inventoryId}/adjust`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qty,
          reason,
          actor: 'admin-user'
        })
      });

      if (!response.ok) throw new Error('Failed to adjust stock');

      const data = await response.json();
      setInventories((prev) =>
        prev.map((inv) =>
          inv._id === inventoryId
            ? {
                ...inv,
                stockOnHand: data.data.stockOnHand,
                available: data.data.available
              }
            : inv
        )
      );

      setAdjustmentModal({ isOpen: false, inventoryId: null, sku: null });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to adjust stock');
    }
  };

  const handleAddBatch = async (
    inventoryId: string,
    batchId: string,
    qty: number,
    supplier: string
  ) => {
    try {
      const response = await fetch(`/api/inventory/${inventoryId}/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batch: {
            batchId,
            qty,
            receivedAt: new Date().toISOString(),
            supplier
          },
          actor: 'admin-user'
        })
      });

      if (!response.ok) throw new Error('Failed to add batch');

      const data = await response.json();
      setInventories((prev) =>
        prev.map((inv) =>
          inv._id === inventoryId
            ? {
                ...inv,
                stockOnHand: data.data.stockOnHand,
                available: data.data.stockOnHand - inv.reserved
              }
            : inv
        )
      );

      setBatchModal({ isOpen: false, inventoryId: null });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add batch');
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading inventory...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>📦 Inventory Management</h1>
        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.label}>Total Items</span>
            <span className={styles.value}>{inventories.length}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.label}>Low Stock</span>
            <span className={styles.value} style={{ color: '#ff9800' }}>
              {inventories.filter((i) => i.isLowStock && i.available > 0).length}
            </span>
          </div>
          <div className={styles.stat}>
            <span className={styles.label}>Critical (Out)</span>
            <span className={styles.value} style={{ color: '#f44336' }}>
              {inventories.filter((i) => i.available === 0).length}
            </span>
          </div>
        </div>
      </div>

      {error && <div className={styles.error}>⚠️ {error}</div>}

      <div className={styles.controls}>
        <input
          type="text"
          className={styles.search}
          placeholder="Search by SKU..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <div className={styles.filters}>
          {['all', 'lowstock', 'critical'].map((f) => (
            <button
              key={f}
              className={`${styles.filterBtn} ${filter === f ? styles.active : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? '📊 All' : f === 'lowstock' ? '⚠️ Low Stock' : '🔴 Critical'}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>SKU</th>
              <th>Stock on Hand</th>
              <th>Reserved</th>
              <th>Available</th>
              <th>Threshold</th>
              <th>Batches</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredInventories.map((inv) => (
              <tr key={inv._id} className={inv.available === 0 ? styles.critical : inv.isLowStock ? styles.warning : ''}>
                <td className={styles.sku}>
                  <code>{inv.variantSku}</code>
                </td>
                <td>{inv.stockOnHand}</td>
                <td className={styles.reserved}>{inv.reserved}</td>
                <td className={styles.available}>
                  <strong>{inv.available}</strong>
                </td>
                <td>{inv.lowStockThreshold}</td>
                <td className={styles.batches}>{inv.batches.length}</td>
                <td className={styles.status}>
                  {inv.available === 0 ? (
                    <span className={styles.statusCritical}>🔴 Out of Stock</span>
                  ) : inv.isLowStock ? (
                    <span className={styles.statusWarning}>⚠️ Low Stock</span>
                  ) : (
                    <span className={styles.statusOk}>✅ Good</span>
                  )}
                </td>
                <td className={styles.actions}>
                  <button
                    className={styles.btnSmall}
                    onClick={() =>
                      setAdjustmentModal({
                        isOpen: true,
                        inventoryId: inv._id,
                        sku: inv.variantSku
                      })
                    }
                    title="Adjust stock"
                  >
                    📝 Adjust
                  </button>
                  <button
                    className={styles.btnSmall}
                    onClick={() => setBatchModal({ isOpen: true, inventoryId: inv._id })}
                    title="Add batch"
                  >
                    📦 Batch
                  </button>
                  <button
                    className={styles.btnSmall}
                    onClick={() => {
                      // Navigate to detail page
                      window.location.href = `/admin/inventory/${inv._id}`;
                    }}
                    title="View details"
                  >
                    👁️ View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredInventories.length === 0 && (
        <div className={styles.empty}>
          <p>No inventory items found</p>
        </div>
      )}

      {/* ADJUSTMENT MODAL */}
      {adjustmentModal.isOpen && (
        <StockAdjustmentModal
          inventoryId={adjustmentModal.inventoryId!}
          sku={adjustmentModal.sku!}
          onSubmit={handleAdjustStock}
          onClose={() => setAdjustmentModal({ isOpen: false, inventoryId: null, sku: null })}
        />
      )}

      {/* BATCH MODAL */}
      {batchModal.isOpen && (
        <AddBatchModal
          inventoryId={batchModal.inventoryId!}
          onSubmit={handleAddBatch}
          onClose={() => setBatchModal({ isOpen: false, inventoryId: null })}
        />
      )}
    </div>
  );
}

// ============================================================================
// STOCK ADJUSTMENT MODAL
// ============================================================================

interface StockAdjustmentModalProps {
  inventoryId: string;
  sku: string;
  onSubmit: (inventoryId: string, qty: number, reason: string) => void;
  onClose: () => void;
}

function StockAdjustmentModal({
  inventoryId,
  sku,
  onSubmit,
  onClose
}: StockAdjustmentModalProps) {
  const [qty, setQty] = useState<number>(0);
  const [reason, setReason] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      alert('Please enter a reason for adjustment');
      return;
    }

    setLoading(true);
    try {
      await onSubmit(inventoryId, qty, reason);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>📝 Adjust Stock: {sku}</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.formGroup}>
            <label>Quantity Change</label>
            <input
              type="number"
              value={qty}
              onChange={(e) => setQty(parseInt(e.target.value) || 0)}
              placeholder="Positive to add, negative to remove"
            />
            <small>
              {qty > 0 ? '➕ Adding stock' : qty < 0 ? '➖ Removing stock' : '⚪ No change'}
            </small>
          </div>

          <div className={styles.formGroup}>
            <label>Reason (Required)</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            >
              <option value="">Select reason...</option>
              <option value="Return from customer">Return from customer</option>
              <option value="Damage writeoff">Damage writeoff</option>
              <option value="Shrinkage">Shrinkage</option>
              <option value="Physical count recount">Physical count recount</option>
              <option value="Supplier return">Supplier return</option>
              <option value="Correction">Correction</option>
            </select>
            {!reason && <small style={{ color: '#f44336' }}>This field is required</small>}
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button
            className={styles.btnSecondary}
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className={styles.btnPrimary}
            onClick={handleSubmit}
            disabled={!reason.trim() || loading}
          >
            {loading ? 'Adjusting...' : 'Adjust Stock'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ADD BATCH MODAL
// ============================================================================

interface AddBatchModalProps {
  inventoryId: string;
  onSubmit: (inventoryId: string, batchId: string, qty: number, supplier: string) => void;
  onClose: () => void;
}

function AddBatchModal({
  inventoryId,
  onSubmit,
  onClose
}: AddBatchModalProps) {
  const [batchId, setBatchId] = useState<string>('');
  const [qty, setQty] = useState<number>(0);
  const [supplier, setSupplier] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!batchId.trim() || qty <= 0 || !supplier.trim()) {
      alert('Please fill all fields');
      return;
    }

    setLoading(true);
    try {
      await onSubmit(inventoryId, batchId, qty, supplier);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>📦 Add Batch</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.formGroup}>
            <label>Batch ID (Lot Number)</label>
            <input
              type="text"
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              placeholder="e.g., LOT-2025-001"
            />
          </div>

          <div className={styles.formGroup}>
            <label>Quantity</label>
            <input
              type="number"
              value={qty}
              onChange={(e) => setQty(parseInt(e.target.value) || 0)}
              placeholder="0"
              min="0"
            />
          </div>

          <div className={styles.formGroup}>
            <label>Supplier</label>
            <input
              type="text"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              placeholder="Supplier name"
            />
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button
            className={styles.btnSecondary}
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className={styles.btnPrimary}
            onClick={handleSubmit}
            disabled={!batchId.trim() || qty <= 0 || !supplier.trim() || loading}
          >
            {loading ? 'Adding...' : 'Add Batch'}
          </button>
        </div>
      </div>
    </div>
  );
}
