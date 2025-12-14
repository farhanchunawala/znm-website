'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from '../orders.module.scss';

interface OrderDetail {
  _id: string;
  orderNumber: string;
  customerId: string;
  orderStatus: string;
  paymentStatus: string;
  items: Array<any>;
  totals: any;
  address: any;
  timeline: Array<any>;
  createdAt: string;
  updatedAt: string;
}

interface AddItemModalState {
  isOpen: boolean;
  productId: string;
  variantSku: string;
  qty: number;
  priceOverride: string;
  loading: boolean;
  error: string;
}

interface EditItemModalState {
  isOpen: boolean;
  itemId: string;
  qty: number;
  priceOverride: string;
  variantSku: string;
  loading: boolean;
  error: string;
}

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [addItemModal, setAddItemModal] = useState<AddItemModalState>({
    isOpen: false,
    productId: '',
    variantSku: '',
    qty: 1,
    priceOverride: '',
    loading: false,
    error: '',
  });
  const [editItemModal, setEditItemModal] = useState<EditItemModalState>({
    isOpen: false,
    itemId: '',
    qty: 1,
    priceOverride: '',
    variantSku: '',
    loading: false,
    error: '',
  });
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/orders/${params.id}`);
        const data = await res.json();
        setOrder(data);
        setNewStatus(data.orderStatus);
      } catch (error) {
        console.error('Error fetching order:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [params.id]);

  const handleStatusUpdate = async () => {
    if (!order || newStatus === order.orderStatus) return;

    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/orders/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderStatus: newStatus }),
      });

      if (res.ok) {
        const updated = await res.json();
        setOrder(updated);
      }
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleAddItem = async () => {
    if (!addItemModal.productId || !addItemModal.variantSku || addItemModal.qty < 1) {
      setAddItemModal((prev) => ({ ...prev, error: 'Fill all required fields' }));
      return;
    }

    setAddItemModal((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const res = await fetch(`/api/orders/${params.id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: addItemModal.productId,
          variantSku: addItemModal.variantSku,
          qty: addItemModal.qty,
          priceOverride: addItemModal.priceOverride ? parseFloat(addItemModal.priceOverride) : undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setOrder((prev) => prev ? { ...prev, ...data } : null);
        setAddItemModal({
          isOpen: false,
          productId: '',
          variantSku: '',
          qty: 1,
          priceOverride: '',
          loading: false,
          error: '',
        });
      } else {
        const error = await res.json();
        setAddItemModal((prev) => ({ ...prev, error: error.error || 'Failed to add item' }));
      }
    } catch (error: any) {
      setAddItemModal((prev) => ({ ...prev, error: error.message || 'Error adding item' }));
    } finally {
      setAddItemModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleEditItem = async () => {
    if (editItemModal.qty < 1) {
      setEditItemModal((prev) => ({ ...prev, error: 'Quantity must be at least 1' }));
      return;
    }

    setEditItemModal((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const res = await fetch(`/api/orders/${params.id}/items/${editItemModal.itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qty: editItemModal.qty,
          priceOverride: editItemModal.priceOverride ? parseFloat(editItemModal.priceOverride) : undefined,
          variantSku: editItemModal.variantSku || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setOrder((prev) => prev ? { ...prev, ...data } : null);
        setEditItemModal({
          isOpen: false,
          itemId: '',
          qty: 1,
          priceOverride: '',
          variantSku: '',
          loading: false,
          error: '',
        });
      } else {
        const error = await res.json();
        setEditItemModal((prev) => ({ ...prev, error: error.error || 'Failed to update item' }));
      }
    } catch (error: any) {
      setEditItemModal((prev) => ({ ...prev, error: error.message || 'Error updating item' }));
    } finally {
      setEditItemModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    setDeleting(itemId);
    try {
      const res = await fetch(`/api/orders/${params.id}/items/${itemId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'admin-removed' }),
      });

      if (res.ok) {
        const data = await res.json();
        setOrder((prev) => prev ? { ...prev, ...data } : null);
      }
    } catch (error) {
      console.error('Error deleting item:', error);
    } finally {
      setDeleting(null);
    }
  };

  if (loading) return <div className={styles.loading}>Loading order...</div>;
  if (!order) return <div className={styles.empty}>Order not found</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link href="/admin/orders" className={styles.backBtn}>← Back to Orders</Link>
        <h1>Order {order.orderNumber}</h1>
      </div>

      <div className={styles.detailWrapper}>
        {/* Status Update Section */}
        <div className={styles.statusSection}>
          <h3>Order Status</h3>
          <div className={styles.statusControl}>
            <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="packed">Packed</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <button onClick={handleStatusUpdate} disabled={updatingStatus || newStatus === order.orderStatus}>
              {updatingStatus ? 'Updating...' : 'Update Status'}
            </button>
          </div>
        </div>

        {/* Order Items */}
        <div className={styles.itemsSection}>
          <div className={styles.itemsHeader}>
            <h3>Items ({order.items.length})</h3>
            <button 
              className={styles.addItemBtn}
              onClick={() => setAddItemModal((prev) => ({ ...prev, isOpen: true }))}
              disabled={['shipped', 'delivered', 'cancelled'].includes(order.orderStatus)}
            >
              + Add Item
            </button>
          </div>
          {order.items.length > 0 ? (
            <table className={styles.itemsTable}>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Subtotal</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item: any) => (
                  <tr key={item._id}>
                    <td>{item.titleSnapshot || 'Product'}</td>
                    <td>{item.variantSku}</td>
                    <td>{item.qty}</td>
                    <td>₹{item.price.toFixed(2)}</td>
                    <td>₹{item.subtotal.toFixed(2)}</td>
                    <td className={styles.actions}>
                      <button
                        className={styles.editBtn}
                        onClick={() => {
                          setEditItemModal({
                            isOpen: true,
                            itemId: item._id,
                            qty: item.qty,
                            priceOverride: item.price.toString(),
                            variantSku: item.variantSku,
                            loading: false,
                            error: '',
                          });
                        }}
                        disabled={['shipped', 'delivered', 'cancelled'].includes(order.orderStatus)}
                      >
                        Edit
                      </button>
                      <button
                        className={styles.deleteBtn}
                        onClick={() => handleDeleteItem(item._id)}
                        disabled={['shipped', 'delivered', 'cancelled'].includes(order.orderStatus) || deleting === item._id}
                      >
                        {deleting === item._id ? 'Deleting...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className={styles.emptyItems}>No items in this order</p>
          )}
        </div>

        {/* Totals */}
        <div className={styles.totalsSection}>
          <h3>Order Total</h3>
          <div className={styles.totalRow}>
            <span>Subtotal:</span>
            <span>₹{order.totals.subtotal.toFixed(2)}</span>
          </div>
          <div className={styles.totalRow}>
            <span>Tax:</span>
            <span>₹{order.totals.tax.toFixed(2)}</span>
          </div>
          <div className={styles.totalRow}>
            <span>Discount:</span>
            <span>-₹{order.totals.discount.toFixed(2)}</span>
          </div>
          <div className={styles.totalRow}>
            <span>Shipping:</span>
            <span>₹{order.totals.shipping.toFixed(2)}</span>
          </div>
          <div className={styles.totalRowGrand}>
            <span>Grand Total:</span>
            <span>₹{order.totals.grandTotal.toFixed(2)}</span>
          </div>
        </div>

        {/* Address */}
        <div className={styles.addressSection}>
          <h3>Shipping Address</h3>
          <p>{order.address.recipientName}</p>
          <p>{order.address.streetAddress}</p>
          <p>{order.address.city}, {order.address.state} {order.address.postalCode}</p>
          <p>{order.address.country}</p>
          <p>Phone: {order.address.phoneNumber}</p>
        </div>

        {/* Timeline */}
        <div className={styles.timelineSection}>
          <h3>Timeline</h3>
          <div className={styles.timeline}>
            {order.timeline.map((event, idx) => (
              <div key={idx} className={styles.timelineEvent}>
                <div className={styles.timelineTime}>
                  {new Date(event.timestamp).toLocaleString()}
                </div>
                <div className={styles.timelineAction}>
                  <strong>{event.action}</strong>
                  <span className={styles.actor}>{event.actor}</span>
                  {event.note && <p>{event.note}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ADD ITEM MODAL */}
      {addItemModal.isOpen && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Add Item</h2>
              <button 
                className={styles.closeBtn}
                onClick={() => setAddItemModal((prev) => ({ ...prev, isOpen: false }))}
              >
                ✕
              </button>
            </div>
            {addItemModal.error && <div className={styles.error}>{addItemModal.error}</div>}
            <div className={styles.formGroup}>
              <label>Product ID</label>
              <input
                type="text"
                placeholder="e.g., 507f1f77bcf86cd799439011"
                value={addItemModal.productId}
                onChange={(e) => setAddItemModal((prev) => ({ ...prev, productId: e.target.value }))}
                disabled={addItemModal.loading}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Variant SKU</label>
              <input
                type="text"
                placeholder="e.g., SKU-001-M-BLK"
                value={addItemModal.variantSku}
                onChange={(e) => setAddItemModal((prev) => ({ ...prev, variantSku: e.target.value }))}
                disabled={addItemModal.loading}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Quantity</label>
              <input
                type="number"
                min="1"
                max="100"
                value={addItemModal.qty}
                onChange={(e) => setAddItemModal((prev) => ({ ...prev, qty: parseInt(e.target.value) }))}
                disabled={addItemModal.loading}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Price Override (optional)</label>
              <input
                type="number"
                step="0.01"
                placeholder="Leave empty for variant price"
                value={addItemModal.priceOverride}
                onChange={(e) => setAddItemModal((prev) => ({ ...prev, priceOverride: e.target.value }))}
                disabled={addItemModal.loading}
              />
            </div>
            <div className={styles.modalActions}>
              <button 
                className={styles.cancelBtn}
                onClick={() => setAddItemModal((prev) => ({ ...prev, isOpen: false }))}
                disabled={addItemModal.loading}
              >
                Cancel
              </button>
              <button 
                className={styles.submitBtn}
                onClick={handleAddItem}
                disabled={addItemModal.loading}
              >
                {addItemModal.loading ? 'Adding...' : 'Add Item'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT ITEM MODAL */}
      {editItemModal.isOpen && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Edit Item</h2>
              <button 
                className={styles.closeBtn}
                onClick={() => setEditItemModal((prev) => ({ ...prev, isOpen: false }))}
              >
                ✕
              </button>
            </div>
            {editItemModal.error && <div className={styles.error}>{editItemModal.error}</div>}
            <div className={styles.formGroup}>
              <label>Quantity</label>
              <input
                type="number"
                min="1"
                max="100"
                value={editItemModal.qty}
                onChange={(e) => setEditItemModal((prev) => ({ ...prev, qty: parseInt(e.target.value) }))}
                disabled={editItemModal.loading}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Price Override (optional)</label>
              <input
                type="number"
                step="0.01"
                value={editItemModal.priceOverride}
                onChange={(e) => setEditItemModal((prev) => ({ ...prev, priceOverride: e.target.value }))}
                disabled={editItemModal.loading}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Variant SKU (optional)</label>
              <input
                type="text"
                placeholder="Leave empty to keep current variant"
                value={editItemModal.variantSku}
                onChange={(e) => setEditItemModal((prev) => ({ ...prev, variantSku: e.target.value }))}
                disabled={editItemModal.loading}
              />
            </div>
            <div className={styles.modalActions}>
              <button 
                className={styles.cancelBtn}
                onClick={() => setEditItemModal((prev) => ({ ...prev, isOpen: false }))}
                disabled={editItemModal.loading}
              >
                Cancel
              </button>
              <button 
                className={styles.submitBtn}
                onClick={handleEditItem}
                disabled={editItemModal.loading}
              >
                {editItemModal.loading ? 'Updating...' : 'Update Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
