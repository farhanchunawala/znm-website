'use client';

import { useAppSelector } from '@/lib/hooks';
import { selectCartItems, selectCartTotal } from '@/lib/features/cartSlice';
import styles from './checkout.module.scss';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CheckoutPage() {
    const cartItems = useAppSelector(selectCartItems);
    const cartTotal = useAppSelector(selectCartTotal);
    const router = useRouter();

    const [formData, setFormData] = useState({
        email: '',
        firstName: '',
        lastName: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        phone: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Here you would typically process the order
        alert('Order placed successfully! (This is a demo)');
        // Optionally clear cart and redirect
        // dispatch(clearCart());
        // router.push('/order-confirmation');
    };

    if (cartItems.length === 0) {
        return (
            <div className={styles.main}>
                <h1>CHECKOUT</h1>
                <div className={styles.emptyCart}>
                    <p>Your cart is empty.</p>
                    <Link href="/">CONTINUE SHOPPING</Link>
                </div>
            </div>
        );
    }

    const shipping = 0; // Free shipping for demo
    const tax = cartTotal * 0.1; // 10% tax for demo
    const total = cartTotal + shipping + tax;

    return (
        <div className={styles.main}>
            <h1>CHECKOUT</h1>
            <div className={styles.checkoutContainer}>
                <form className={styles.checkoutForm} onSubmit={handleSubmit}>
                    <div className={styles.formSection}>
                        <h3>Contact Information</h3>
                        <div className={styles.formGroup}>
                            <label htmlFor="email">Email</label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>

                    <div className={styles.formSection}>
                        <h3>Shipping Address</h3>
                        <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                                <label htmlFor="firstName">First Name</label>
                                <input
                                    type="text"
                                    id="firstName"
                                    name="firstName"
                                    value={formData.firstName}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label htmlFor="lastName">Last Name</label>
                                <input
                                    type="text"
                                    id="lastName"
                                    name="lastName"
                                    value={formData.lastName}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>
                        <div className={styles.formGroup}>
                            <label htmlFor="address">Address</label>
                            <input
                                type="text"
                                id="address"
                                name="address"
                                value={formData.address}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                                <label htmlFor="city">City</label>
                                <input
                                    type="text"
                                    id="city"
                                    name="city"
                                    value={formData.city}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label htmlFor="state">State</label>
                                <input
                                    type="text"
                                    id="state"
                                    name="state"
                                    value={formData.state}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label htmlFor="zipCode">ZIP Code</label>
                                <input
                                    type="text"
                                    id="zipCode"
                                    name="zipCode"
                                    value={formData.zipCode}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>
                        <div className={styles.formGroup}>
                            <label htmlFor="phone">Phone</label>
                            <input
                                type="tel"
                                id="phone"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>
                </form>

                <div className={styles.orderSummary}>
                    <h2>Order Summary</h2>
                    {cartItems.map((item) => (
                        <div key={`${item.id}-${item.size}`} className={styles.summaryItem}>
                            <Image src={item.image} alt={item.title} width={60} height={80} />
                            <div className={styles.itemInfo}>
                                <h4>{item.title}</h4>
                                <p>Size: {item.size}</p>
                                <p>Qty: {item.quantity}</p>
                            </div>
                            <div className={styles.itemPrice}>
                                Rs. {(item.price * item.quantity).toLocaleString()}
                            </div>
                        </div>
                    ))}
                    <div className={styles.summaryRow}>
                        <span>Subtotal</span>
                        <span>Rs. {cartTotal.toLocaleString()}</span>
                    </div>
                    <div className={styles.summaryRow}>
                        <span>Shipping</span>
                        <span>{shipping === 0 ? 'FREE' : `Rs. ${shipping.toLocaleString()}`}</span>
                    </div>
                    <div className={styles.summaryRow}>
                        <span>Tax</span>
                        <span>Rs. {tax.toFixed(2)}</span>
                    </div>
                    <div className={`${styles.summaryRow} ${styles.total}`}>
                        <span>Total</span>
                        <span>Rs. {total.toFixed(2)}</span>
                    </div>
                    <button
                        type="submit"
                        className={styles.placeOrderButton}
                        onClick={handleSubmit}
                    >
                        PLACE ORDER
                    </button>
                </div>
            </div>
        </div>
    );
}
