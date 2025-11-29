'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './shipments.module.scss';
import {
    AddIcon,
    ExportIcon,
    ArchiveIcon,
    UnarchiveIcon,
    DeleteIcon,
    EditIcon,
    ShippedIcon,
    LogisticsIcon,
    DeliveredIcon,
} from '@/components/Icons/AdminIcons';

interface Shipment {
    _id: string;
    shipmentId: string;
    orderId: {
        _id: string;
        orderId: string;
    };
    customerId: {
        _id: string;
        customerId: string;
        firstName: string;
        lastName: string;
    };
    status: 'pending' | 'shipped' | 'outForDelivery' | 'delivered';
    trackingId: string;
    carrier: string;
    shippedAt?: string;
    outForDeliveryAt?: string;
    deliveredAt?: string;
    archived: boolean;
    createdAt: string;
}

const STATUS_ICONS: Record<string, any> = {
    pending: ShippedIcon,
    shipped: ShippedIcon,
    outForDelivery: LogisticsIcon,
    delivered: DeliveredIcon,
};

const STATUS_COLORS: Record<string, string> = {
    pending: '#a3a3a3',
    shipped: '#525252',
    outForDelivery: '#404040',
    delivered: '#000',
};

export default function ShipmentsPage() {
    const [shipments, setShipments] = useState<Shipment[]>([]);
    const [loading, setLoading] = useState(true);
    const [showArchived, setShowArchived] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('latest');
    const [selectedShipments, setSelectedShipments] = useState<string[]>([]);
    const [statusFilter, setStatusFilter] = useState<string>('all');

    useEffect(() => {
        fetchShipments();
    }, [showArchived, sortBy]);

    const fetchShipments = async () => {
        try {
            const res = await fetch(`/api/admin/shipments?archived=${showArchived}&sort=${sortBy}`);
            const data = await res.json();
            setShipments(data);
        } catch (error) {
            console.error('Failed to fetch shipments:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleSelectAll = () => {
        if (selectedShipments.length === filteredShipments.length) {
            setSelectedShipments([]);
        } else {
            setSelectedShipments(filteredShipments.map(s => s._id));
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedShipments(prev =>
            prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
        );
    };

    const handleBulkAction = async (action: string) => {
        if (selectedShipments.length === 0) return;

        try {
            const res = await fetch('/api/admin/shipments/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: selectedShipments, action }),
            });

            if (res.ok) {
                setSelectedShipments([]);
                fetchShipments();
            }
        } catch (error) {
            console.error('Bulk operation failed:', error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this shipment?')) return;

        try {
            await fetch(`/api/admin/shipments/${id}`, { method: 'DELETE' });
            fetchShipments();
        } catch (error) {
            console.error('Failed to delete shipment:', error);
        }
    };

    const handleExportCSV = () => {
        const headers = ['Shipment ID', 'Order ID', 'Customer', 'Tracking ID', 'Carrier', 'Status', 'Shipped Date'];
        const rows = filteredShipments.map(s => [
            s.shipmentId,
            s.orderId.orderId,
            `${s.customerId.firstName} ${s.customerId.lastName}`,
            s.trackingId,
            s.carrier,
            s.status,
            s.shippedAt ? new Date(s.shippedAt).toLocaleDateString() : 'N/A',
        ]);

        const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `shipments-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    const getStatusIcon = (status: string) => {
        const IconComponent = STATUS_ICONS[status];
        if (!IconComponent) return null;
        return <IconComponent size={16} className={styles.statusIcon} />;
    };

    const filteredShipments = shipments.filter(shipment => {
        const matchesSearch =
            shipment.shipmentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
            shipment.orderId.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
            shipment.trackingId.toLowerCase().includes(searchTerm.toLowerCase()) ||
            `${shipment.customerId.firstName} ${shipment.customerId.lastName}`.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'all' || shipment.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    return (
        <div className={styles.shipmentsPage}>
            <div className={styles.header}>
                <h1>Shipments</h1>
                <div className={styles.actions}>
                    <Link href="/admin/shipments/new" className={styles.addBtn}>
                        <AddIcon size={18} />
                        Add Shipment
                    </Link>
                    <button onClick={handleExportCSV} className={styles.exportBtn}>
                        <ExportIcon size={18} />
                        Export CSV
                    </button>
                    <button onClick={() => setShowArchived(!showArchived)} className={styles.archiveBtn}>
                        {showArchived ? <UnarchiveIcon size={18} /> : <ArchiveIcon size={18} />}
                        {showArchived ? 'Show Active' : 'Show Archived'}
                    </button>
                </div>
            </div>

            <div className={styles.filters}>
                <input
                    type="text"
                    placeholder="Search by shipment ID, order ID, tracking ID, or customer..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={styles.searchInput}
                />

                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={styles.statusSelect}>
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="shipped">Shipped</option>
                    <option value="outForDelivery">Out for Delivery</option>
                    <option value="delivered">Delivered</option>
                </select>

                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={styles.sortSelect}>
                    <option value="latest">Latest First</option>
                    <option value="oldest">Oldest First</option>
                </select>
            </div>

            {selectedShipments.length > 0 && (
                <div className={styles.bulkActions}>
                    <span>{selectedShipments.length} selected</span>
                    <div className={styles.bulkButtons}>
                        <button onClick={() => handleBulkAction(showArchived ? 'unarchive' : 'archive')} className={styles.bulkBtn}>
                            {showArchived ? <UnarchiveIcon size={16} /> : <ArchiveIcon size={16} />}
                            {showArchived ? 'Unarchive' : 'Archive'}
                        </button>
                        <button onClick={() => handleBulkAction('delete')} className={styles.bulkBtnDanger}>
                            <DeleteIcon size={16} />
                            Delete
                        </button>
                        <button onClick={handleExportCSV} className={styles.bulkBtn}>
                            <ExportIcon size={16} />
                            Export Selected
                        </button>
                    </div>
                </div>
            )}

            {loading ? (
                <div className={styles.loading}>Loading shipments...</div>
            ) : (
                <>
                    <div className={styles.stats}>
                        <span>{filteredShipments.length} shipments found</span>
                        <span>Shipped: {filteredShipments.filter(s => s.status === 'shipped').length}</span>
                        <span>Out for Delivery: {filteredShipments.filter(s => s.status === 'outForDelivery').length}</span>
                        <span>Delivered: {filteredShipments.filter(s => s.status === 'delivered').length}</span>
                    </div>

                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>
                                        <input
                                            type="checkbox"
                                            checked={selectedShipments.length === filteredShipments.length && filteredShipments.length > 0}
                                            onChange={toggleSelectAll}
                                        />
                                    </th>
                                    <th>Shipment ID</th>
                                    <th>Order ID</th>
                                    <th>Customer</th>
                                    <th>Tracking ID</th>
                                    <th>Carrier</th>
                                    <th>Status</th>
                                    <th>Shipped Date</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredShipments.map((shipment) => (
                                    <tr key={shipment._id}>
                                        <td>
                                            <input
                                                type="checkbox"
                                                checked={selectedShipments.includes(shipment._id)}
                                                onChange={() => toggleSelect(shipment._id)}
                                            />
                                        </td>
                                        <td className={styles.shipmentId}>
                                            <Link href={`/admin/shipments/${shipment._id}`} className={styles.link}>
                                                {shipment.shipmentId}
                                            </Link>
                                        </td>
                                        <td>
                                            <Link href={`/admin/orders/${shipment.orderId._id}`} className={styles.orderLink}>
                                                {shipment.orderId.orderId}
                                            </Link>
                                        </td>
                                        <td>
                                            <Link href={`/admin/customers/${shipment.customerId._id}`} className={styles.customerLink}>
                                                {shipment.customerId.firstName} {shipment.customerId.lastName}
                                            </Link>
                                        </td>
                                        <td className={styles.trackingId}>{shipment.trackingId}</td>
                                        <td>{shipment.carrier}</td>
                                        <td>
                                            <div className={styles.statusBadge} style={{ color: STATUS_COLORS[shipment.status] }}>
                                                {getStatusIcon(shipment.status)}
                                                <span>{shipment.status === 'outForDelivery' ? 'Out for Delivery' : shipment.status}</span>
                                            </div>
                                        </td>
                                        <td>{shipment.shippedAt ? new Date(shipment.shippedAt).toLocaleDateString() : 'N/A'}</td>
                                        <td className={styles.actionButtons}>
                                            <Link href={`/admin/shipments/${shipment._id}/edit`} className={styles.editAction} title="Edit">
                                                <EditIcon size={16} />
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(shipment._id)}
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
