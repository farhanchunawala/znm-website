'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './order-detail.module.scss';

interface OrderItem {
    title: string;
    quantity: number;
    size: string;
    price: number;
    image?: string;
}

interface Order {
    _id: string;
    orderId: string;
    customerId: string;
    customerName?: string;
    items: OrderItem[];
    total: number;
    paymentStatus: 'prepaid' | 'unpaid';
    shippingInfo: {
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
        address: string;
        city: string;
        state: string;
        country: string;
        zipCode: string;
    };
    createdAt: string;
    archived: boolean;
}

export default function OrderDetailPage({ params }: { params: { id: string } }) {
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const router = useRouter();

    useEffect(() => {
        fetchOrderDetails();
    }, [params.id]);

    const fetchOrderDetails = async () => {
        try {
            const res = await fetch(`/api/admin/orders/${params.id}/details`);
            const data = await res.json();
            setOrder(data);
        } catch (error) {
            console.error('Failed to fetch order details:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePaymentStatusChange = async (newStatus: 'prepaid' | 'unpaid') => {
        if (!order) return;
        setUpdating(true);
        try {
            await fetch(`/api/admin/orders/${order._id}/payment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ paymentStatus: newStatus }),
            });
            setOrder({ ...order, paymentStatus: newStatus });
        } catch (error) {
            console.error('Failed to update payment status:', error);
        } finally {
            setUpdating(false);
        }
    };

    if (loading) {
        return <div className={styles.loading}>Loading order details...</div>;
    }

    if (!order) {
        return <div className={styles.loading}>Order not found</div>;
    }

    return (
        <div className={styles.orderDetail}>
            <div className={styles.topBar}>
                <button onClick={() => router.back()} className={styles.backBtn}>
                    ← Back
                </button>
                <div className={styles.actions}>
                    <button className={styles.printBtn} onClick={() => window.print()}>
                        🖨️ Print Invoice
                    </button>
                </div>
            </div>

            <div className={styles.header}>
                <div className={styles.titleGroup}>
                    <h1>Order #{order.orderId}</h1>
                    <span className={styles.date}>
                        {new Date(order.createdAt).toLocaleString()}
                    </span>
                </div>
                <div className={styles.statusGroup}>
                    <select
                        value={order.paymentStatus}
                        onChange={(e) => handlePaymentStatusChange(e.target.value as 'prepaid' | 'unpaid')}
                        disabled={updating}
                        className={`${styles.statusSelect} ${styles[order.paymentStatus]}`}
                    >
                        <option value="unpaid">Unpaid</option>
                        <option value="prepaid">Prepaid</option>
                    </select>
                </div>
            </div>

            <div className={styles.grid}>
                {/* Customer & Shipping Info */}
                <div className={styles.card}>
                    <h3>Customer Details</h3>
                    <div className={styles.infoRow}>
                        <span className={styles.label}>Name:</span>
                        <Link href={`/admin/customers/${order.customerId}`} className={styles.link}>
                            {order.shippingInfo.firstName} {order.shippingInfo.lastName}
                        </Link>
                    </div>
                    <div className={styles.infoRow}>
                        <span className={styles.label}>Email:</span>
                        <a href={`mailto:${order.shippingInfo.email}`} className={styles.link}>
                            {order.shippingInfo.email}
                        </a>
                    </div>
                    <div className={styles.infoRow}>
                        <span className={styles.label}>Phone:</span>
                        <a href={`tel:${order.shippingInfo.phone}`} className={styles.link}>
                            {order.shippingInfo.phone}
                        </a>
                    </div>

                    <h3 className={styles.subHeader}>Shipping Address</h3>
                    <div className={styles.address}>
                        {order.shippingInfo.address}<br />
                        {order.shippingInfo.city}, {order.shippingInfo.state}<br />
                        {order.shippingInfo.country} - {order.shippingInfo.zipCode}
                    </div>
                </div>

                {/* Order Items */}
                <div className={styles.card}>
                    <h3>Order Items ({order.items.length})</h3>
                    <div className={styles.itemsList}>
                        {order.items.map((item, index) => (
                            <div key={index} className={styles.itemRow}>
                                <div className={styles.itemInfo}>
                                    <span className={styles.itemName}>{item.title}</span>
                                    <span className={styles.itemMeta}>Size: {item.size} | Qty: {item.quantity}</span>
                                </div>
                                <div className={styles.itemPrice}>
                                    ₹{(item.price * item.quantity).toLocaleString()}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className={styles.summary}>
                        <div className={styles.summaryRow}>
                            <span>Subtotal</span>
                            <span>₹{order.total.toLocaleString()}</span>
                        </div>
                        <div className={styles.summaryRow}>
                            <span>Shipping</span>
                            <span>Free</span>
                        </div>
                        <div className={`${styles.summaryRow} ${styles.total}`}>
                            <span>Total</span>
                            <span>₹{order.total.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
