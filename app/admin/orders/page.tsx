'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './orders.module.scss';
import {
    ExportIcon,
    ImportIcon,
    ArchiveIcon,
    UnarchiveIcon,
    DeleteIcon,
    EditIcon,
    AddIcon,
    PrepaidIcon,
    UnpaidIcon,
    PendingIcon,
    FulfilledIcon,
    ShippedIcon,
    LogisticsIcon,
    DeliveredIcon,
    GroupIcon,
} from '@/components/Icons/AdminIcons';

interface Order {
    _id: string;
    orderId: string;
    customerId: string;
    customerName?: string;
    customer_internal_id?: string;
    items: Array<{
        title: string;
        quantity: number;
        size: string;
        price: number;
    }>;
    total: number;
    paymentStatus: 'prepaid' | 'unpaid';
    status: 'pending' | 'fulfilled' | 'shipped' | 'logistics' | 'delivered';
    archived: boolean;
    createdAt: string;
    shippingInfo: {
        firstName: string;
        lastName: string;
        city: string;
        state: string;
    };
}

const STATUS_ICONS: Record<string, any> = {
    pending: PendingIcon,
    fulfilled: FulfilledIcon,
    shipped: ShippedIcon,
    logistics: LogisticsIcon,
    delivered: DeliveredIcon,
};

const STATUS_COLORS: Record<string, string> = {
    pending: '#a3a3a3',
    fulfilled: '#525252',
    shipped: '#404040',
    logistics: '#262626',
    delivered: '#000',
};

export default function OrdersPage() {
    const router = useRouter();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'all' | 'prepaid' | 'unpaid'>('all');
    const [showArchived, setShowArchived] = useState(false);
    const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('latest');
    const [showBulkActions, setShowBulkActions] = useState(false);

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

    const exportToCSV = () => {
        const headers = ['Order ID', 'Customer ID', 'Customer Name', 'Date', 'Items', 'Total', 'Payment Status', 'Order Status'];
        const rows = filteredOrders.map(o => [
            o.orderId,
            o.customerId,
            o.customerName || `${o.shippingInfo.firstName} ${o.shippingInfo.lastName}`,
            new Date(o.createdAt).toLocaleDateString(),
            o.items.map(i => `${i.title} (${i.quantity})`).join('; '),
            o.total,
            o.paymentStatus,
            o.status,
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
        const matchesSearch =
            order.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.customerId.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (order.customerName && order.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
            `${order.shippingInfo.firstName} ${order.shippingInfo.lastName}`.toLowerCase().includes(searchTerm.toLowerCase());

        return matchesTab && matchesSearch;
    }).sort((a, b) => {
        if (sortBy === 'latest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        if (sortBy === 'highestTotal') return b.total - a.total;
        if (sortBy === 'lowestTotal') return a.total - b.total;
        return 0;
    });

    const toggleSelectAll = () => {
        if (selectedOrders.length === filteredOrders.length) {
            setSelectedOrders([]);
        } else {
            setSelectedOrders(filteredOrders.map(o => o._id));
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedOrders(prev =>
            prev.includes(id) ? prev.filter(oid => oid !== id) : [...prev, id]
        );
    };

    const handleBulkAction = async (action: string, groupId?: string) => {
        if (selectedOrders.length === 0) return;

        try {
            const res = await fetch('/api/admin/orders/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: selectedOrders, action, groupId }),
            });

            if (res.ok) {
                setSelectedOrders([]);
                setShowBulkActions(false);
                fetchOrders();
            }
        } catch (error) {
            console.error('Bulk operation failed:', error);
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

    const getStatusIcon = (status: string) => {
        const Icon = STATUS_ICONS[status] || PendingIcon;
        return <Icon size={16} className={styles.statusIcon} />;
    };

    return (
        <div className={styles.ordersPage}>
            <div className={styles.header}>
                <h1>Order Management</h1>
                <div className={styles.actions}>
                    <Link href="/admin/orders/new" className={styles.addBtn}>
                        <AddIcon size={18} />
                        Add Order
                    </Link>
                    <Link href="/admin/orders/import" className={styles.importBtn}>
                        <ImportIcon size={18} />
                        Import CSV
                    </Link>
                    <button onClick={exportToCSV} className={styles.exportBtn}>
                        <ExportIcon size={18} />
                        Export CSV
                    </button>
                    <button onClick={() => setShowArchived(!showArchived)} className={styles.archiveBtn}>
                        {showArchived ? <UnarchiveIcon size={18} /> : <ArchiveIcon size={18} />}
                        {showArchived ? 'Show Active' : 'Show Archived'}
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
                    <PrepaidIcon size={16} />
                    Prepaid ({orders.filter(o => o.paymentStatus === 'prepaid').length})
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'unpaid' ? styles.active : ''}`}
                    onClick={() => setActiveTab('unpaid')}
                >
                    <UnpaidIcon size={16} />
                    Unpaid ({orders.filter(o => o.paymentStatus === 'unpaid').length})
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

            {selectedOrders.length > 0 && (
                <div className={styles.bulkActionsBar}>
                    <span>{selectedOrders.length} selected</span>
                    <div className={styles.bulkButtons}>
                        <button onClick={() => handleBulkAction('archive')} className={styles.bulkBtn}>
                            <ArchiveIcon size={16} />
                            Archive
                        </button>
                        <button onClick={() => handleBulkAction('delete')} className={styles.bulkBtnDanger}>
                            <DeleteIcon size={16} />
                            Delete
                        </button>
                        <button onClick={() => setShowBulkActions(true)} className={styles.bulkBtn}>
                            <GroupIcon size={16} />
                            Add to Group
                        </button>
                        <button onClick={exportToCSV} className={styles.bulkBtn}>
                            <ExportIcon size={16} />
                            Export Selected
                        </button>
                    </div>
                </div>
            )}

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
                                    <th>
                                        <input
                                            type="checkbox"
                                            checked={selectedOrders.length === filteredOrders.length && filteredOrders.length > 0}
                                            onChange={toggleSelectAll}
                                        />
                                    </th>
                                    <th>Order ID</th>
                                    <th>Customer</th>
                                    <th>Date</th>
                                    <th>Items</th>
                                    <th>Total</th>
                                    <th>Payment</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredOrders.map((order) => (
                                    <tr key={order._id}>
                                        <td>
                                            <input
                                                type="checkbox"
                                                checked={selectedOrders.includes(order._id)}
                                                onChange={() => toggleSelect(order._id)}
                                            />
                                        </td>
                                        <td className={styles.orderId}>
                                            <Link href={`/admin/orders/${order._id}`} className={styles.orderLink}>
                                                {order.orderId}
                                            </Link>
                                        </td>
                                        <td>
                                            <div className={styles.customerInfo}>
                                                {order.customer_internal_id ? (
                                                    <Link href={`/admin/customers/${order.customer_internal_id}`} className={styles.customerId}>
                                                        {order.customerId}
                                                    </Link>
                                                ) : (
                                                    <span className={styles.customerId}>{order.customerId}</span>
                                                )}
                                                <span className={styles.customerName}>
                                                    {order.customerName || `${order.shippingInfo.firstName} ${order.shippingInfo.lastName}`}
                                                </span>
                                            </div>
                                        </td>
                                        <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                                        <td>{order.items.length} items</td>
                                        <td className={styles.total}>₹{order.total.toLocaleString()}</td>
                                        <td>
                                            <select
                                                value={order.paymentStatus}
                                                onChange={(e) => handlePaymentStatusChange(order._id, e.target.value as 'prepaid' | 'unpaid')}
                                                className={`${styles.paymentStatus} ${styles[order.paymentStatus]}`}
                                            >
                                                <option value="prepaid">Prepaid</option>
                                                <option value="unpaid">Unpaid</option>
                                            </select>
                                        </td>
                                        <td>
                                            <div className={styles.statusBadge} style={{ color: STATUS_COLORS[order.status] }}>
                                                {getStatusIcon(order.status)}
                                                <span>{order.status}</span>
                                            </div>
                                        </td>
                                        <td className={styles.actionButtons}>
                                            <Link href={`/admin/orders/${order._id}/edit`} className={styles.editAction} title="Edit">
                                                <EditIcon size={16} />
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(order._id)}
                                                className={styles.deleteAction}
                                                title="Delete"
                                            >
                                                <DeleteIcon size={16} />
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
