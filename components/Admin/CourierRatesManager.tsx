'use client';

import { useState, useEffect } from 'react';
import styles from './CourierRatesManager.module.scss';

interface WeightSlab {
  minWeight: number;
  maxWeight: number;
  price: number;
}

interface Zone {
  name: string;
  pincodes: string[];
}

interface CourierRate {
  _id: string;
  courierName: string;
  zones: Zone[];
  weightSlabs: WeightSlab[];
  codExtraCharge: number;
  prepaidDiscount: number;
  minOrderValue: number;
  status: 'active' | 'inactive' | 'archived';
  createdAt: string;
}

export default function CourierRatesManager() {
  const [rates, setRates] = useState<CourierRate[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    courierName: 'Delhivery',
    zones: [{ name: 'North', pincodes: '' }],
    weightSlabs: [{ minWeight: 0, maxWeight: 5, price: 100 }],
    codExtraCharge: 5,
    prepaidDiscount: 10,
    minOrderValue: 500,
    status: 'active' as const,
  });

  // Fetch rates on mount
  useEffect(() => {
    fetchRates();
  }, []);

  const fetchRates = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/courier-rates', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to fetch rates');

      const data = await response.json();
      setRates(data.rates || []);
      setError(null);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleAddRate = () => {
    setEditingId(null);
    setFormData({
      courierName: 'Delhivery',
      zones: [{ name: 'North', pincodes: '' }],
      weightSlabs: [{ minWeight: 0, maxWeight: 5, price: 100 }],
      codExtraCharge: 5,
      prepaidDiscount: 10,
      minOrderValue: 500,
      status: 'active',
    });
    setShowForm(true);
  };

  const handleEditRate = (rate: CourierRate) => {
    setEditingId(rate._id);
    setFormData({
      courierName: rate.courierName,
      zones: rate.zones,
      weightSlabs: rate.weightSlabs,
      codExtraCharge: rate.codExtraCharge,
      prepaidDiscount: rate.prepaidDiscount,
      minOrderValue: rate.minOrderValue,
      status: rate.status,
    });
    setShowForm(true);
  };

  const handleSaveRate = async () => {
    try {
      setLoading(true);

      // Parse pincodes from string to array
      const zones = formData.zones.map((z) => ({
        name: z.name,
        pincodes: z.pincodes.split(',').map((p) => p.trim()),
      }));

      const payload = {
        ...formData,
        zones,
      };

      const url = editingId ? `/api/courier-rates/${editingId}` : '/api/courier-rates';
      const method = editingId ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Failed to save rate');

      setShowForm(false);
      await fetchRates();
      setError(null);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this rate?')) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/courier-rates/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete rate');

      await fetchRates();
      setError(null);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Courier Rates Management</h2>
        <button
          className={styles.btnPrimary}
          onClick={handleAddRate}
          disabled={loading}
        >
          + Add Courier Rate
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {showForm && (
        <div className={styles.formPanel}>
          <h3>{editingId ? 'Edit' : 'Add'} Courier Rate</h3>

          <div className={styles.formGroup}>
            <label>Courier Name</label>
            <select
              value={formData.courierName}
              onChange={(e) =>
                setFormData({ ...formData, courierName: e.target.value })
              }
              className={styles.input}
            >
              <option>Delhivery</option>
              <option>Shiprocket</option>
              <option>Fedex</option>
              <option>DTDC</option>
              <option>Ecom</option>
              <option>BlueDart</option>
              <option>Other</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>Status</label>
            <select
              value={formData.status}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  status: e.target.value as any,
                })
              }
              className={styles.input}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>COD Extra Charge (%)</label>
            <input
              type="number"
              value={formData.codExtraCharge}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  codExtraCharge: parseFloat(e.target.value),
                })
              }
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Prepaid Discount (%)</label>
            <input
              type="number"
              value={formData.prepaidDiscount}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  prepaidDiscount: parseFloat(e.target.value),
                })
              }
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Min Order Value for Free Shipping</label>
            <input
              type="number"
              value={formData.minOrderValue}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  minOrderValue: parseFloat(e.target.value),
                })
              }
              className={styles.input}
            />
          </div>

          <div className={styles.formActions}>
            <button
              className={styles.btnSecondary}
              onClick={() => setShowForm(false)}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              className={styles.btnPrimary}
              onClick={handleSaveRate}
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Rate'}
            </button>
          </div>
        </div>
      )}

      <div className={styles.ratesTable}>
        {loading && !showForm ? (
          <div className={styles.loading}>Loading...</div>
        ) : rates.length === 0 ? (
          <div className={styles.empty}>No courier rates found</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Courier</th>
                <th>Status</th>
                <th>Zones</th>
                <th>Slabs</th>
                <th>COD Extra</th>
                <th>Prepaid Discount</th>
                <th>Min Order Value</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rates.map((rate) => (
                <tr key={rate._id} className={styles.row}>
                  <td className={styles.bold}>{rate.courierName}</td>
                  <td>
                    <span
                      className={`${styles.status} ${styles[`status-${rate.status}`]}`}
                    >
                      {rate.status}
                    </span>
                  </td>
                  <td>{rate.zones.length}</td>
                  <td>{rate.weightSlabs.length}</td>
                  <td>{rate.codExtraCharge}%</td>
                  <td>{rate.prepaidDiscount}%</td>
                  <td>₹{rate.minOrderValue}</td>
                  <td className={styles.actions}>
                    <button
                      className={styles.btnEdit}
                      onClick={() => handleEditRate(rate)}
                      disabled={loading}
                    >
                      Edit
                    </button>
                    <button
                      className={styles.btnDelete}
                      onClick={() => handleDeleteRate(rate._id)}
                      disabled={loading}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
