'use client';

import { useState, useEffect } from 'react';
import { TruckIcon, ClockIcon, CheckCircleIcon, PlusIcon } from '@heroicons/react/24/outline';
import styles from './shipments.module.scss';

interface Shipment {
    _id: string;
    shipmentId: string;
    orderId: {
        _id: string;
        orderId: string;
        total: number;
    };
    customerId: {
        _id: string;
        customerId: string;
        firstName: string;
        lastName: string;
        email: string;
    };
    status: 'pending' | 'fulfilled' | 'shipped' | 'in_transit' | 'delivered';
    trackingId?: string;
    carrier?: string;
    fulfilledAt?: string;
    shippedAt?: string;
    deliveredAt?: string;
    notes?: string;
    createdAt: string;
}

export default function ShipmentsPage() {
    const [shipments, setShipments] = useState<Shipment[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'fulfilled' | 'shipped' | 'delivered'>('all');
    const [editingShipment, setEditingShipment] = useState<string | null>(null);
    const [trackingData, setTrackingData] = useState({ trackingId: '', carrier: '' });

    useEffect(() => {
        fetchShipments();
    }, [activeTab]);

    const fetchShipments = async () => {
        try {
            const url = activeTab === 'all'
                ? '/api/admin/shipments'
                : `/api/admin/shipments?status=${activeTab}`;
            const res = await fetch(url);
            const data = await res.json();
            setShipments(data.shipments || []);
        } catch (error) {
            console.error('Failed to fetch shipments:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (shipmentId: string, newStatus: string) => {
        try {
            const res = await fetch(`/api/admin/shipments/${shipmentId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });

            if (res.ok) {
                fetchShipments();
            }
        } catch (error) {
            console.error('Failed to update status:', error);
        }
    };

    const handleAddTracking = async (shipmentId: string) => {
        try {
            const res = await fetch(`/api/admin/shipments/${shipmentId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(trackingData),
            });

            if (res.ok) {
                setEditingShipment(null);
                setTrackingData({ trackingId: '', carrier: '' });
                fetchShipments();
            }
        } catch (error) {
            console.error('Failed to add tracking:', error);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'pending':
                return <ClockIcon />;
            case 'fulfilled':
            case 'shipped':
            case 'in_transit':
                return <TruckIcon />;
            case 'delivered':
                return <CheckCircleIcon />;
            default:
                return <ClockIcon />;
        }
    };

    const filteredShipments = activeTab === 'all'
        ? shipments
        : shipments.filter(s => s.status === activeTab);

    return (
        <div className={styles.shipmentsPage}>
            <div className={styles.header}>
                <h1>Shipment Management</h1>
            </div>

            <div className={styles.tabs}>
                <button
                    className={`${styles.tab} ${activeTab === 'all' ? styles.active : ''}`}
                    onClick={() => setActiveTab('all')}
                >
                    All Shipments
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'pending' ? styles.active : ''}`}
                    onClick={() => setActiveTab('pending')}
                >
                    Pending
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'fulfilled' ? styles.active : ''}`}
                    onClick={() => setActiveTab('fulfilled')}
                >
                    Fulfilled
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'shipped' ? styles.active : ''}`}
                    onClick={() => setActiveTab('shipped')}
                >
                    Shipped
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'delivered' ? styles.active : ''}`}
                    onClick={() => setActiveTab('delivered')}
                >
                    Delivered
                </button>
            </div>

            {loading ? (
                <div className={styles.loading}>Loading shipments...</div>
            ) : filteredShipments.length === 0 ? (
                <div className={styles.empty}>No shipments found</div>
            ) : (
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Shipment ID</th>
                                <th>Order ID</th>
                                <th>Customer</th>
                                <th>Status</th>
                                <th>Tracking</th>
                                <th>Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredShipments.map((shipment) => (
                                <tr key={shipment._id}>
                                    <td className={styles.shipmentId}>{shipment.shipmentId}</td>
                                    <td>{shipment.orderId?.orderId || 'N/A'}</td>
                                    <td>
                                        {shipment.customerId?.firstName} {shipment.customerId?.lastName}
                                        <br />
                                        <span className={styles.email}>{shipment.customerId?.email}</span>
                                    </td>
                                    <td>
                                        <div className={`${styles.status} ${styles[shipment.status]}`}>
                                            {getStatusIcon(shipment.status)}
                                            <span>{shipment.status}</span>
                                        </div>
                                    </td>
                                    <td>
                                        {editingShipment === shipment._id ? (
                                            <div className={styles.trackingForm}>
                                                <input
                                                    type="text"
                                                    placeholder="Tracking ID"
                                                    value={trackingData.trackingId}
                                                    onChange={(e) => setTrackingData({ ...trackingData, trackingId: e.target.value })}
                                                    className={styles.input}
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="Carrier"
                                                    value={trackingData.carrier}
                                                    onChange={(e) => setTrackingData({ ...trackingData, carrier: e.target.value })}
                                                    className={styles.input}
                                                />
                                                <button
                                                    onClick={() => handleAddTracking(shipment._id)}
                                                    className={styles.saveBtn}
                                                >
                                                    Save
                                                </button>
                                                <button
                                                    onClick={() => setEditingShipment(null)}
                                                    className={styles.cancelBtn}
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        ) : shipment.trackingId ? (
                                            <div className={styles.trackingInfo}>
                                                <strong>{shipment.trackingId}</strong>
                                                {shipment.carrier && <span>{shipment.carrier}</span>}
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => {
                                                    setEditingShipment(shipment._id);
                                                    setTrackingData({ trackingId: '', carrier: '' });
                                                }}
                                                className={styles.addTrackingBtn}
                                            >
                                                <PlusIcon />
                                                Add Tracking
                                            </button>
                                        )}
                                    </td>
                                    <td>{new Date(shipment.createdAt).toLocaleDateString()}</td>
                                    <td>
                                        <select
                                            value={shipment.status}
                                            onChange={(e) => handleUpdateStatus(shipment._id, e.target.value)}
                                            className={styles.statusSelect}
                                        >
                                            <option value="pending">Pending</option>
                                            <option value="fulfilled">Fulfilled</option>
                                            <option value="shipped">Shipped</option>
                                            <option value="in_transit">In Transit</option>
                                            <option value="delivered">Delivered</option>
                                        </select>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
