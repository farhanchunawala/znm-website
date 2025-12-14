'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import styles from './orders.module.scss';

interface Order {
  _id: string;
  orderNumber: string;
  customerId: string;
  orderStatus: string;
  paymentStatus: string;
  totals: { grandTotal: number };
  createdAt: string;
  address: { recipientName: string };
  totalItems: number;
  isOverdue?: boolean;
}

const statusColors: Record<string, string> = {
  pending: '#ff9800',
  confirmed: '#2196f3',
  packed: '#9c27b0',
  shipped: '#00bcd4',
  delivered: '#4caf50',
  cancelled: '#f44336',
};

const paymentStatusColors: Record<string, string> = {
  pending: '#ff9800',
  paid: '#4caf50',
  failed: '#f44336',
  refunded: '#2196f3',
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    orderStatus: '',
    paymentStatus: '',
    searchOrderNumber: '',
  });

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });

      if (filters.orderStatus) params.append('orderStatus', filters.orderStatus);
      if (filters.paymentStatus) params.append('paymentStatus', filters.paymentStatus);
      if (filters.searchOrderNumber) params.append('searchOrderNumber', filters.searchOrderNumber);

      const res = await fetch(`/api/orders?${params.toString()}`);
      const data = await res.json();

      setOrders(data.orders || []);
      setTotalPages(data.pages || 1);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    setPage(1); // Reset to page 1 when filters change
  }, [filters.orderStatus, filters.paymentStatus, filters.searchOrderNumber]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Orders</h1>
        <p>Manage customer orders, track shipments, and handle refunds</p>
      </div>

      {/* Filters */}
      <div className={styles.filtersPanel}>
        <div className={styles.filterGroup}>
          <label>Order Status</label>
          <select
            value={filters.orderStatus}
            onChange={(e) => setFilters({ ...filters, orderStatus: e.target.value })}
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="packed">Packed</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label>Payment Status</label>
          <select
            value={filters.paymentStatus}
            onChange={(e) => setFilters({ ...filters, paymentStatus: e.target.value })}
          >
            <option value="">All Payments</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label>Search Order #</label>
          <input
            type="text"
            placeholder="ORD-2025-00001"
            value={filters.searchOrderNumber}
            onChange={(e) => setFilters({ ...filters, searchOrderNumber: e.target.value })}
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className={styles.tableWrapper}>
        {loading ? (
          <div className={styles.loading}>Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className={styles.empty}>No orders found</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Order #</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Total</th>
                <th>Order Status</th>
                <th>Payment Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order._id} className={order.isOverdue ? styles.overdue : ''}>
                  <td>
                    <Link href={`/admin/orders/${order._id}`} className={styles.link}>
                      {order.orderNumber}
                    </Link>
                  </td>
                  <td>{order.address.recipientName}</td>
                  <td className={styles.center}>{order.totalItems}</td>
                  <td className={styles.amount}>₹{order.totals.grandTotal.toFixed(2)}</td>
                  <td>
                    <span
                      className={styles.badge}
                      style={{ backgroundColor: statusColors[order.orderStatus] }}
                    >
                      {order.orderStatus.charAt(0).toUpperCase() + order.orderStatus.slice(1)}
                    </span>
                  </td>
                  <td>
                    <span
                      className={styles.badge}
                      style={{ backgroundColor: paymentStatusColors[order.paymentStatus] }}
                    >
                      {order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}
                    </span>
                  </td>
                  <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                  <td>
                    <Link href={`/admin/orders/${order._id}`} className={styles.actionBtn}>
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className={styles.paginationBtn}
          >
            Previous
          </button>
          <span className={styles.pageInfo}>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className={styles.paginationBtn}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
