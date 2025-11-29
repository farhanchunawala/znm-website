'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './new-order.module.scss';
import { AddIcon } from '@/components/Icons/AdminIcons';

interface Customer {
    _id: string;
    customerId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    phoneCode: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
}

interface OrderItem {
    title: string;
    quantity: number;
    size: string;
    price: number;
}

export default function NewOrderPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [items, setItems] = useState<OrderItem[]>([
        { title: '', quantity: 1, size: '', price: 0 }
    ]);
    const [paymentStatus, setPaymentStatus] = useState<'prepaid' | 'unpaid'>('unpaid');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        try {
            const res = await fetch('/api/admin/customers');
            const data = await res.json();
            setCustomers(data);
        } catch (error) {
            console.error('Failed to fetch customers:', error);
        }
    };

    const filteredCustomers = customers.filter(c =>
        c.customerId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const addItem = () => {
        setItems([...items, { title: '', quantity: 1, size: '', price: 0 }]);
    };

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const updateItem = (index: number, field: keyof OrderItem, value: any) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    const calculateTotal = () => {
        return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedCustomer) {
            alert('Please select a customer');
            return;
        }

        if (items.some(item => !item.title || !item.size || item.price <= 0)) {
            alert('Please fill in all item details');
            return;
        }

        setLoading(true);

        try {
            const orderData = {
                customerId: selectedCustomer.customerId,
                items: items.map(item => ({
                    title: item.title,
                    quantity: item.quantity,
                    size: item.size,
                    price: item.price,
                })),
                total: calculateTotal(),
                paymentStatus,
                notes,
                shippingInfo: {
                    firstName: selectedCustomer.firstName,
                    lastName: selectedCustomer.lastName,
                    email: selectedCustomer.email,
                    phone: selectedCustomer.phone,
                    phoneCode: selectedCustomer.phoneCode,
                    address: selectedCustomer.address,
                    city: selectedCustomer.city,
                    state: selectedCustomer.state,
                    zipCode: selectedCustomer.zipCode,
                    country: selectedCustomer.country,
                },
            };

            const res = await fetch('/api/admin/orders/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData),
            });

            if (res.ok) {
                router.push('/admin/orders');
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to create order');
            }
        } catch (error) {
            console.error('Failed to create order:', error);
            alert('Failed to create order');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.newOrderPage}>
            <div className={styles.header}>
                <h1>Create New Order</h1>
                <button onClick={() => router.back()} className={styles.backBtn}>
                    Cancel
                </button>
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
                {/* Customer Selection */}
                <div className={styles.section}>
                    <h2>1. Select Customer</h2>
                    <input
                        type="text"
                        placeholder="Search by customer ID, name, or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={styles.searchInput}
                    />

                    {selectedCustomer ? (
                        <div className={styles.selectedCustomer}>
                            <div className={styles.customerInfo}>
                                <strong>{selectedCustomer.customerId}</strong>
                                <span>{selectedCustomer.firstName} {selectedCustomer.lastName}</span>
                                <span>{selectedCustomer.email}</span>
                                <span>{selectedCustomer.phoneCode}{selectedCustomer.phone}</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedCustomer(null)}
                                className={styles.changeBtn}
                            >
                                Change
                            </button>
                        </div>
                    ) : (
                        <div className={styles.customerList}>
                            {filteredCustomers.slice(0, 5).map(customer => (
                                <div
                                    key={customer._id}
                                    onClick={() => setSelectedCustomer(customer)}
                                    className={styles.customerItem}
                                >
                                    <div>
                                        <strong>{customer.customerId}</strong>
                                        <span>{customer.firstName} {customer.lastName}</span>
                                    </div>
                                    <span className={styles.email}>{customer.email}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Order Items */}
                <div className={styles.section}>
                    <h2>2. Add Items</h2>
                    {items.map((item, index) => (
                        <div key={index} className={styles.itemRow}>
                            <input
                                type="text"
                                placeholder="Item name"
                                value={item.title}
                                onChange={(e) => updateItem(index, 'title', e.target.value)}
                                className={styles.itemInput}
                                required
                            />
                            <input
                                type="text"
                                placeholder="Size"
                                value={item.size}
                                onChange={(e) => updateItem(index, 'size', e.target.value)}
                                className={styles.sizeInput}
                                required
                            />
                            <input
                                type="number"
                                placeholder="Qty"
                                value={item.quantity}
                                onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                                className={styles.qtyInput}
                                min="1"
                                required
                            />
                            <input
                                type="number"
                                placeholder="Price"
                                value={item.price}
                                onChange={(e) => updateItem(index, 'price', parseFloat(e.target.value) || 0)}
                                className={styles.priceInput}
                                min="0"
                                step="0.01"
                                required
                            />
                            <div className={styles.itemTotal}>
                                ₹{(item.price * item.quantity).toLocaleString()}
                            </div>
                            {items.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => removeItem(index)}
                                    className={styles.removeBtn}
                                >
                                    ×
                                </button>
                            )}
                        </div>
                    ))}
                    <button type="button" onClick={addItem} className={styles.addItemBtn}>
                        <AddIcon size={16} />
                        Add Another Item
                    </button>
                </div>

                {/* Payment & Notes */}
                <div className={styles.section}>
                    <h2>3. Payment & Notes</h2>
                    <div className={styles.paymentRow}>
                        <label>Payment Status:</label>
                        <select
                            value={paymentStatus}
                            onChange={(e) => setPaymentStatus(e.target.value as 'prepaid' | 'unpaid')}
                            className={styles.paymentSelect}
                        >
                            <option value="unpaid">Unpaid</option>
                            <option value="prepaid">Prepaid</option>
                        </select>
                    </div>
                    <textarea
                        placeholder="Order notes (optional)"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className={styles.notesInput}
                        rows={4}
                    />
                </div>

                {/* Order Summary */}
                <div className={styles.summary}>
                    <h3>Order Summary</h3>
                    <div className={styles.summaryRow}>
                        <span>Subtotal:</span>
                        <span>₹{calculateTotal().toLocaleString()}</span>
                    </div>
                    <div className={styles.summaryRow}>
                        <span>Items:</span>
                        <span>{items.reduce((sum, item) => sum + item.quantity, 0)}</span>
                    </div>
                    <div className={styles.summaryTotal}>
                        <span>Total:</span>
                        <span>₹{calculateTotal().toLocaleString()}</span>
                    </div>
                </div>

                {/* Submit */}
                <div className={styles.actions}>
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className={styles.cancelBtn}
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className={styles.submitBtn}
                        disabled={loading || !selectedCustomer}
                    >
                        {loading ? 'Creating...' : 'Create Order'}
                    </button>
                </div>
            </form>
        </div>
    );
}
