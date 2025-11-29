'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './order-edit.module.scss';
import {
    PendingIcon,
    FulfilledIcon,
    ShippedIcon,
    LogisticsIcon,
    DeliveredIcon,
    DeleteIcon,
    AddIcon,
} from '@/components/Icons/AdminIcons';

interface OrderItem {
    title: string;
    quantity: number;
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
    status: 'pending' | 'fulfilled' | 'shipped' | 'outForDelivery' | 'delivered';
    notes?: string;
    shippingInfo: {
        firstName: string;
        lastName: string;
        address: string;
        city: string;
        state: string;
        zipCode: string;
        country: string;
    };
}

const STATUS_OPTIONS = [
    { value: 'pending', label: 'Pending', icon: PendingIcon },
    { value: 'fulfilled', label: 'Fulfilled', icon: FulfilledIcon },
    { value: 'shipped', label: 'Shipped', icon: ShippedIcon },
    { value: 'outForDelivery', label: 'Out for Delivery', icon: LogisticsIcon },
    { value: 'delivered', label: 'Delivered', icon: DeliveredIcon },
];

export default function OrderEditPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const [order, setOrder] = useState<Order | null>(null);
    const [items, setItems] = useState<OrderItem[]>([]);
    const [status, setStatus] = useState('pending');
    const [paymentStatus, setPaymentStatus] = useState<'prepaid' | 'unpaid'>('unpaid');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchOrder();
    }, [params.id]);

    const fetchOrder = async () => {
        try {
            const res = await fetch(`/api/admin/orders/${params.id}`);
            const data = await res.json();

            if (data.error) {
                alert('Order not found');
                router.push('/admin/orders');
                return;
            }

            setOrder(data);
            setItems(data.items || []);
            setStatus(data.status || 'pending');
            setPaymentStatus(data.paymentStatus || 'unpaid');
            setNotes(data.notes || '');
        } catch (error) {
            console.error('Failed to fetch order:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleItemChange = (index: number, field: keyof OrderItem, value: any) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    const handleRemoveItem = (index: number) => {
        if (confirm('Remove this item from the order?')) {
            setItems(items.filter((_, i) => i !== index));
        }
    };

    const handleAddItem = () => {
        setItems([...items, { title: '', quantity: 1, price: 0 }]);
    };

    const calculateTotal = () => {
        return items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    };

    const handleSave = async () => {
        if (items.length === 0) {
            alert('Order must have at least one item');
            return;
        }

        setSaving(true);
        try {
            const res = await fetch(`/api/admin/orders/${params.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items,
                    total: calculateTotal(),
                    paymentStatus,
                    notes,
                }),
            });

            if (res.ok) {
                // Update status separately if changed
                if (status !== order?.status) {
                    await fetch(`/api/admin/orders/${params.id}/status`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status }),
                    });
                }

                alert('Order updated successfully!');
                router.push(`/admin/orders/${params.id}`);
            } else {
                alert('Failed to update order');
            }
        } catch (error) {
            console.error('Failed to save order:', error);
            alert('Failed to update order');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className={styles.loading}>Loading order...</div>;
    }

    if (!order) {
        return <div className={styles.error}>Order not found</div>;
    }

    return (
        <div className={styles.orderEdit}>
            <div className={styles.header}>
                <div>
                    <h1>Edit Order {order.orderId}</h1>
                    <p className={styles.subtitle}>
                        Customer: <Link href={`/admin/customers/${order.customerId}`}>{order.customerName || order.customerId}</Link>
                    </p>
                </div>
                <div className={styles.actions}>
                    <button onClick={() => router.back()} className={styles.cancelBtn}>
                        Cancel
                    </button>
                    <button onClick={handleSave} disabled={saving} className={styles.saveBtn}>
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>

            <div className={styles.content}>
                <div className={styles.section}>
                    <h2>Order Status</h2>
                    <div className={styles.statusGrid}>
                        {STATUS_OPTIONS.map((option) => {
                            const IconComponent = option.icon;
                            return (
                                <button
                                    key={option.value}
                                    onClick={() => setStatus(option.value)}
                                    className={`${styles.statusBtn} ${status === option.value ? styles.active : ''}`}
                                >
                                    <IconComponent size={20} />
                                    {option.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className={styles.section}>
                    <h2>Payment Status</h2>
                    <div className={styles.paymentButtons}>
                        <button
                            onClick={() => setPaymentStatus('prepaid')}
                            className={`${styles.paymentBtn} ${paymentStatus === 'prepaid' ? styles.active : ''}`}
                        >
                            Prepaid
                        </button>
                        <button
                            onClick={() => setPaymentStatus('unpaid')}
                            className={`${styles.paymentBtn} ${paymentStatus === 'unpaid' ? styles.active : ''}`}
                        >
                            Unpaid
                        </button>
                    </div>
                </div>

                <div className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2>Order Items</h2>
                        <button onClick={handleAddItem} className={styles.addItemBtn}>
                            <AddIcon size={16} />
                            Add Item
                        </button>
                    </div>

                    <div className={styles.itemsList}>
                        {items.map((item, index) => (
                            <div key={index} className={styles.itemRow}>
                                <div className={styles.itemNumber}>{index + 1}</div>
                                <div className={styles.itemFields}>
                                    <input
                                        type="text"
                                        placeholder="Product name"
                                        value={item.title}
                                        onChange={(e) => handleItemChange(index, 'title', e.target.value)}
                                        className={styles.itemInput}
                                    />
                                    <input
                                        type="number"
                                        placeholder="Qty"
                                        value={item.quantity}
                                        onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                                        className={styles.qtyInput}
                                        min="1"
                                    />
                                    <input
                                        type="number"
                                        placeholder="Price"
                                        value={item.price}
                                        onChange={(e) => handleItemChange(index, 'price', parseFloat(e.target.value) || 0)}
                                        className={styles.priceInput}
                                        min="0"
                                        step="0.01"
                                    />
                                    <div className={styles.itemTotal}>
                                        ₹{(item.quantity * item.price).toLocaleString()}
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleRemoveItem(index)}
                                    className={styles.removeBtn}
                                    title="Remove item"
                                >
                                    <DeleteIcon size={16} />
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className={styles.totalRow}>
                        <span>Order Total:</span>
                        <span className={styles.totalAmount}>₹{calculateTotal().toLocaleString()}</span>
                    </div>
                </div>

                <div className={styles.section}>
                    <h2>Notes</h2>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add notes about this order..."
                        className={styles.notesInput}
                        rows={4}
                    />
                </div>

                <div className={styles.section}>
                    <h2>Shipping Information</h2>
                    <div className={styles.shippingInfo}>
                        <p><strong>Name:</strong> {order.shippingInfo.firstName} {order.shippingInfo.lastName}</p>
                        <p><strong>Address:</strong> {order.shippingInfo.address}</p>
                        <p><strong>City:</strong> {order.shippingInfo.city}, {order.shippingInfo.state} {order.shippingInfo.zipCode}</p>
                        <p><strong>Country:</strong> {order.shippingInfo.country}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
