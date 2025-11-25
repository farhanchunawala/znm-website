'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './customer-detail.module.scss';

interface Customer {
    _id: string;
    customerId: string;
    firstName: string;
    lastName: string;
    emails: string[];
    phone: string;
    phoneCode: string;
    address: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
    createdAt: string;
}

interface Order {
    orderId: string;
    total: number;
    paymentStatus: string;
    createdAt: string;
    items: Array<{ title: string; quantity: number; price: number }>;
}

export default function CustomerDetailPage({ params }: { params: { id: string } }) {
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        fetchCustomerDetails();
    }, [params.id]);

    const fetchCustomerDetails = async () => {
        try {
            const [customerRes, ordersRes] = await Promise.all([
                fetch(`/api/admin/customers/${params.id}/details`),
                fetch(`/api/admin/customers/${params.id}/orders`),
            ]);

            const customerData = await customerRes.json();
            const ordersData = await ordersRes.json();

            if (customerRes.ok) {
                setCustomer(customerData);
            }

            if (ordersRes.ok && Array.isArray(ordersData)) {
                setOrders(ordersData);
            } else {
                setOrders([]);
            }
        } catch (error) {
            console.error('Failed to fetch customer details:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className={styles.loading}>Loading customer details...</div>;
    }

    if (!customer || (customer as any).error) {
        return <div className={styles.loading}>Customer not found</div>;
    }

    const totalSpent = orders.reduce((sum, order) => sum + (order.total || 0), 0);

    return (
        <div className={styles.customerDetail}>
            <button onClick={() => router.back()} className={styles.backBtn}>
                ← Back
            </button>

            <div className={styles.header}>
                <h1>{customer.firstName} {customer.lastName}</h1>
                <span className={styles.customerId}>{customer.customerId}</span>
            </div>

            <div className={styles.infoGrid}>
                <div className={styles.infoCard}>
                    <h3>Contact Information</h3>
                    <div className={styles.infoRow}>
                        <span className={styles.label}>Email:</span>
                        <span>{customer.emails?.join(', ') || 'N/A'}</span>
                    </div>
                    <div className={styles.infoRow}>
                        <span className={styles.label}>Phone:</span>
                        <span>{customer.phoneCode}{customer.phone}</span>
                    </div>
                </div>

                <div className={styles.infoCard}>
                    <h3>Address</h3>
                    <div className={styles.address}>
                        {customer.address}<br />
                        {customer.city}, {customer.state} {customer.zipCode}<br />
                        {customer.country}
                    </div>
                </div>

                <div className={styles.infoCard}>
                    <h3>Statistics</h3>
                    <div className={styles.infoRow}>
                        <span className={styles.label}>Total Orders:</span>
                        <span className={styles.value}>{orders.length}</span>
                    </div>
                    <div className={styles.infoRow}>
                        <span className={styles.label}>Total Spent:</span>
                        <span className={styles.value}>₹{totalSpent.toLocaleString()}</span>
                    </div>
                    <div className={styles.infoRow}>
                        <span className={styles.label}>Customer Since:</span>
                        <span>{new Date(customer.createdAt).toLocaleDateString()}</span>
                    </div>
                </div>
            </div>

            <div className={styles.ordersSection}>
                <h2>Order History ({orders.length})</h2>
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Order ID</th>
                                <th>Date</th>
                                <th>Items</th>
                                <th>Total</th>
                                <th>Payment Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map((order) => (
                                <tr
                                    key={order.orderId}
                                    onClick={() => router.push(`/admin/orders/${order.orderId}`)}
                                    className={styles.clickableRow}
                                >
                                    <td className={styles.orderId}>{order.orderId}</td>
                                    <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                                    <td>
                                        {order.items.map((item, idx) => (
                                            <div key={idx}>{item.title} x{item.quantity}</div>
                                        ))}
                                    </td>
                                    <td className={styles.amount}>₹{order.total.toLocaleString()}</td>
                                    <td>
                                        <span className={`${styles.badge} ${styles[order.paymentStatus]}`}>
                                            {order.paymentStatus}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
