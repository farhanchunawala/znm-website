'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './shipment-detail.module.scss';
import StatusNavigation from '@/components/Admin/StatusNavigation';
import { PrintIcon } from '@/components/Icons/AdminIcons';

interface Shipment {
    _id: string;
    shipmentId: string;
    orderId: {
        _id: string;
        orderId: string;
        total: number;
        items: Array<{
            title: string;
            quantity: number;
            price: number;
            image?: string;
        }>;
        paymentStatus: string;
        invoiceNumber?: string;
    };
    customerId: {
        _id: string;
        customerId: string;
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
    };
    status: 'pending' | 'fulfilled' | 'shipped' | 'outForDelivery' | 'delivered';
    trackingId: string;
    carrier: string;
    shippedAt?: string;
    outForDeliveryAt?: string;
    deliveredAt?: string;
    createdAt: string;
}

export default function ShipmentDetailPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const [shipment, setShipment] = useState<Shipment | null>(null);
    const [loading, setLoading] = useState(true);
    const [printing, setPrinting] = useState(false);
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);

    useEffect(() => {
        fetchShipment();
    }, [params.id]);

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setZoomedImage(null);
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, []);

    const fetchShipment = async () => {
        try {
            const res = await fetch(`/api/admin/shipments/${params.id}`);
            const data = await res.json();

            if (data.error) {
                alert('Shipment not found');
                router.push('/admin/shipments');
                return;
            }

            setShipment(data);
        } catch (error) {
            console.error('Failed to fetch shipment:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (newStatus: string, data?: any) => {
        try {
            const res = await fetch(`/api/admin/shipments/${params.id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: newStatus,
                    ...data,
                }),
            });

            if (res.ok) {
                await fetchShipment(); // Refresh data
            } else {
                throw new Error('Failed to update status');
            }
        } catch (error) {
            console.error('Failed to update status:', error);
            throw error;
        }
    };

    const handlePrintInvoice = async () => {
        if (!shipment?.orderId._id) return;

        setPrinting(true);
        try {
            const res = await fetch(`/api/admin/orders/${shipment.orderId._id}/invoice`);
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `invoice-${shipment.orderId.orderId}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Failed to print invoice:', error);
            alert('Failed to download invoice');
        } finally {
            setPrinting(false);
        }
    };

    if (loading) {
        return <div className={styles.loading}>Loading shipment...</div>;
    }

    if (!shipment) {
        return <div className={styles.error}>Shipment not found</div>;
    }

    return (
        <div className={styles.shipmentDetail}>
            <button onClick={() => router.back()} className={styles.backBtn}>
                ← Back
            </button>

            <div className={styles.header}>
                <div>
                    <h1>Shipment {shipment.shipmentId}</h1>
                    <p className={styles.subtitle}>
                        Order: <Link href={`/admin/orders/${shipment.orderId._id}`}>{shipment.orderId.orderId}</Link>
                    </p>
                </div>
                <button onClick={handlePrintInvoice} disabled={printing} className={styles.printBtn}>
                    <PrintIcon size={16} />
                    {printing ? 'Downloading...' : 'Print Invoice'}
                </button>
            </div>

            <div className={styles.content}>
                <div className={styles.section}>
                    <h2>Shipment Information</h2>
                    <div className={styles.infoGrid}>
                        <div className={styles.infoItem}>
                            <label>Tracking ID</label>
                            <span className={styles.trackingId}>{shipment.trackingId}</span>
                        </div>
                        <div className={styles.infoItem}>
                            <label>Carrier</label>
                            <span>{shipment.carrier}</span>
                        </div>
                        <div className={styles.infoItem}>
                            <label>Created</label>
                            <span>{new Date(shipment.createdAt).toLocaleString()}</span>
                        </div>
                        {shipment.shippedAt && (
                            <div className={styles.infoItem}>
                                <label>Shipped At</label>
                                <span>{new Date(shipment.shippedAt).toLocaleString()}</span>
                            </div>
                        )}
                        {shipment.outForDeliveryAt && (
                            <div className={styles.infoItem}>
                                <label>Out for Delivery At</label>
                                <span>{new Date(shipment.outForDeliveryAt).toLocaleString()}</span>
                            </div>
                        )}
                        {shipment.deliveredAt && (
                            <div className={styles.infoItem}>
                                <label>Delivered At</label>
                                <span>{new Date(shipment.deliveredAt).toLocaleString()}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className={styles.section}>
                    <h2>Order Items</h2>
                    <div className={styles.itemsList}>
                        {shipment.orderId.items.map((item, index) => (
                            <div key={index} className={styles.itemCard}>
                                {item.image && (
                                    <div
                                        className={styles.itemImage}
                                        onClick={() => setZoomedImage(item.image!)}
                                        title="Click to zoom"
                                    >
                                        <img src={item.image} alt={item.title} />
                                    </div>
                                )}
                                <div className={styles.itemDetails}>
                                    <h4>{item.title}</h4>
                                    <p>Quantity: {item.quantity}</p>
                                    <p className={styles.price}>₹{item.price.toLocaleString()} each</p>
                                </div>
                                <div className={styles.itemTotal}>
                                    ₹{(item.quantity * item.price).toLocaleString()}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className={styles.orderTotal}>
                        <span>Order Total:</span>
                        <span className={styles.totalAmount}>₹{shipment.orderId.total.toLocaleString()}</span>
                    </div>
                </div>

                <div className={styles.section}>
                    <h2>Customer Information</h2>
                    <div className={styles.infoGrid}>
                        <div className={styles.infoItem}>
                            <label>Customer ID</label>
                            <Link href={`/admin/customers/${shipment.customerId._id}`} className={styles.link}>
                                {shipment.customerId.customerId}
                            </Link>
                        </div>
                        <div className={styles.infoItem}>
                            <label>Name</label>
                            <span>{shipment.customerId.firstName} {shipment.customerId.lastName}</span>
                        </div>
                        <div className={styles.infoItem}>
                            <label>Email</label>
                            <span>{shipment.customerId.email}</span>
                        </div>
                        <div className={styles.infoItem}>
                            <label>Phone</label>
                            <span>{shipment.customerId.phone}</span>
                        </div>
                    </div>
                </div>

                <div className={styles.section}>
                    <h2>Payment Information</h2>
                    <div className={styles.infoGrid}>
                        <div className={styles.infoItem}>
                            <label>Payment Status</label>
                            <span className={`${styles.badge} ${styles[shipment.orderId.paymentStatus]}`}>
                                {shipment.orderId.paymentStatus}
                            </span>
                        </div>
                        {shipment.orderId.invoiceNumber && (
                            <div className={styles.infoItem}>
                                <label>Invoice Number</label>
                                <span className={styles.invoiceNumber}>{shipment.orderId.invoiceNumber}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <StatusNavigation
                currentStatus={shipment.status}
                onStatusChange={handleStatusChange}
                entityType="shipment"
                entityId={shipment._id}
            />

            {zoomedImage && (
                <div className={styles.imageZoom} onClick={() => setZoomedImage(null)}>
                    <div className={styles.zoomContent} onClick={(e) => e.stopPropagation()}>
                        <img src={zoomedImage} alt="Zoomed product" />
                        <button onClick={() => setZoomedImage(null)} className={styles.closeZoom}>
                            ✕
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
