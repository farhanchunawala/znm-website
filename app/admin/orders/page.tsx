'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './orders.module.scss';

interface Order {
    _id: string;
    orderId: string;
    customerId: string;
    customerName?: string;
    items: Array<{
        title: string;
        quantity: number;
        size: string;
        price: number;
    }>;
    total: number;
    paymentStatus: 'prepaid' | 'unpaid';
    archived: boolean;
    createdAt: string;
    shippingInfo: {
        firstName: string;
        lastName: string;
        city: string;
        state: string;
    };
}

export default function OrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'all' | 'prepaid' | 'unpaid'>('all');
    const [showArchived, setShowArchived] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('latest');

    useEffect(() => {
        fetchOrders();
    }, [showArchived, sortBy]);

    const fetchOrders = async () => {
        try {
            const res = await fetch(`/api/admin/orders?archived=${showArchived}&sort=${sortBy}`);
            const data = await res.json();
            setOrders(data);
        } catch (error) {
            console.error('Failed to fetch orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this order? This will permanently remove it from the database.')) return;

        try {
            await fetch(`/api/admin/orders/${id}`, { method: 'DELETE' });
            fetchOrders();
        } catch (error) {
            console.error('Failed to delete order:', error);
        }
    };

    const handleArchive = async (id: string, currentStatus: boolean) => {
        try {
            await fetch(`/api/admin/orders/${id}/archive`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ archived: !currentStatus }),
            });
            fetchOrders();
        } catch (error) {
            console.error('Failed to archive order:', error);
        }
    };

    const handlePaymentStatusChange = async (id: string, newStatus: 'prepaid' | 'unpaid') => {
        try {
            await fetch(`/api/admin/orders/${id}/payment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ paymentStatus: newStatus }),
            });
            fetchOrders();
        } catch (error) {
            console.error('Failed to update payment status:', error);
        }
    };

    const exportToCSV = () => {
        const headers = ['Order ID', 'Customer ID', 'Customer Name', 'Date', 'Items', 'Total', 'Payment Status'];
        const rows = filteredOrders.map(o => [
            o.orderId,
            o.customerId,
            o.customerName || `${o.shippingInfo.firstName} ${o.shippingInfo.lastName}`,
            new Date(o.createdAt).toLocaleDateString(),
            o.items.map(i => `${i.title} (${i.quantity})`).join('; '),
            o.total,
            o.paymentStatus,
        ]);

        const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `orders-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    const filteredOrders = orders.filter(order => {
        const matchesTab = activeTab === 'all' || order.paymentStatus === activeTab;
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch =
            order.orderId.toLowerCase().includes(searchLower) ||
            order.customerId.toLowerCase().includes(searchLower) ||
            (order.customerName && order.customerName.toLowerCase().includes(searchLower)) ||
            `${order.shippingInfo.firstName} ${order.shippingInfo.lastName}`.toLowerCase().includes(searchLower);

        return matchesTab && matchesSearch;
    });

    return (
        <div className={styles.ordersPage}>
            <div className={styles.header}>
                <h1>Order Management</h1>
                <div className={styles.actions}>
                    <button onClick={exportToCSV} className={styles.exportBtn}>
                        📥 Export CSV
                    </button>
                    <button onClick={() => setShowArchived(!showArchived)} className={styles.archiveBtn}>
                        {showArchived ? '📋 Show Active' : '📁 Show Archived'}
                    </button>
                </div>
            </div>

            <div className={styles.tabs}>
                <button
                    className={`${styles.tab} ${activeTab === 'all' ? styles.active : ''}`}
                    onClick={() => setActiveTab('all')}
                >
                    All Orders ({orders.length})
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'prepaid' ? styles.active : ''}`}
                    onClick={() => setActiveTab('prepaid')}
                >
                    💳 Prepaid ({orders.filter(o => o.paymentStatus === 'prepaid').length})
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'unpaid' ? styles.active : ''}`}
                    onClick={() => setActiveTab('unpaid')}
                >
                    ⏳ Unpaid ({orders.filter(o => o.paymentStatus === 'unpaid').length})
                </button>
            </div>

            <div className={styles.filters}>
                <input
                    type="text"
                    placeholder="Search by order ID, customer ID, or name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={styles.searchInput}
                />

                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={styles.sortSelect}>
                    <option value="latest">Latest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="highestTotal">Highest Total</option>
                    <option value="lowestTotal">Lowest Total</option>
                </select>
            </div>

            {loading ? (
                <div className={styles.loading}>Loading orders...</div>
            ) : (
                <>
                    <div className={styles.stats}>
                        <span>{filteredOrders.length} orders found</span>
                        <span>Total: ₹{filteredOrders.reduce((sum, o) => sum + o.total, 0).toLocaleString()}</span>
                    </div>

                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Order ID</th>
                                    <th>Customer</th>
                                    <th>Date</th>
                                    <th>Items</th>
                                    <th>Total</th>
                                    <th>Payment</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredOrders.map((order) => (
                                    <tr key={order._id}>
                                        <td className={styles.orderId}>
                                            <Link href={`/admin/orders/${order.orderId}`} className={styles.orderLink}>
                                                {order.orderId}
                                            </Link>
                                        </td>
                                        <td>
                                            <div className={styles.customerInfo}>
                                                <Link href={`/admin/customers`} className={styles.customerId}>
                                                    {order.customerId}
                                                </Link>
                                                <span className={styles.customerName}>
                                                    {order.customerName || `${order.shippingInfo.firstName} ${order.shippingInfo.lastName}`}
                                                </span>
                                            </div>
                                        </td>
                                        <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                                        <td>
                                            <div className={styles.items}>
                                                {order.items.slice(0, 2).map((item, idx) => (
                                                    <div key={idx} className={styles.item}>
                                                        {item.title} x{item.quantity}
                                                    </div>
                                                ))}
                                                {order.items.length > 2 && (
                                                    <span className={styles.moreItems}>+{order.items.length - 2} more</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className={styles.amount}>₹{order.total.toLocaleString()}</td>
                                        <td>
                                            <select
                                                value={order.paymentStatus}
                                                onChange={(e) => handlePaymentStatusChange(order._id, e.target.value as 'prepaid' | 'unpaid')}
                                                className={`${styles.paymentSelect} ${styles[order.paymentStatus]}`}
                                            >
                                                <option value="unpaid">Unpaid</option>
                                                <option value="prepaid">Prepaid</option>
                                            </select>
                                        </td>
                                        <td className={styles.actions}>
                                            <button
                                                onClick={() => handleArchive(order._id, order.archived)}
                                                className={styles.archiveAction}
                                                title={order.archived ? 'Unarchive' : 'Archive'}
                                            >
                                                {order.archived ? '📤' : '📁'}
                                            </button>
                                            <button
                                                onClick={() => handleDelete(order._id)}
                                                className={styles.deleteAction}
                                                title="Delete"
                                            >
                                                🗑️
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}
