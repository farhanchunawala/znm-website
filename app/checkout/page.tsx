'use client';

import { useAppSelector } from '@/lib/hooks';
import { selectCartItems, selectCartTotal } from '@/lib/features/cartSlice';
import styles from './checkout.module.scss';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Country, State, City } from 'country-state-city';

export default function CheckoutPage() {
    const cartItems = useAppSelector(selectCartItems);
    const cartTotal = useAppSelector(selectCartTotal);
    const router = useRouter();

    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [checkingAuth, setCheckingAuth] = useState(true);
    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
    const [couponError, setCouponError] = useState('');

    const [formData, setFormData] = useState({
        email: '',
        firstName: '',
        lastName: '',
        address: '',
        city: '',
        state: '',
        country: '',
        zipCode: '',
        phoneCode: '+91', // Default to India
        phone: '',
    });

    const [notification, setNotification] = useState<{
        message: string;
        type: 'success' | 'error';
    } | null>(null);

    const [isLoading, setIsLoading] = useState(false);

    // Check authentication on mount
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const response = await fetch('/api/user/profile');
                setIsAuthenticated(response.ok);
                if (!response.ok) {
                    // Redirect to login
                    router.push('/login?redirect=/checkout');
                }
            } catch (error) {
                setIsAuthenticated(false);
                router.push('/login?redirect=/checkout');
            } finally {
                setCheckingAuth(false);
            }
        };
        checkAuth();
    }, [router]);

    // Get location data
    const countries = useMemo(() => Country.getAllCountries(), []);

    // Get phone codes from countries
    const phoneCodes = useMemo(() => {
        return countries.map(country => ({
            code: country.isoCode,
            name: country.name,
            phoneCode: country.phonecode
        })).filter(c => c.phoneCode).sort((a, b) => a.name.localeCompare(b.name));
    }, [countries]);

    const states = useMemo(() => {
        if (!formData.country) return [];
        return State.getStatesOfCountry(formData.country);
    }, [formData.country]);

    const cities = useMemo(() => {
        if (!formData.country || !formData.state) return [];
        return City.getCitiesOfState(formData.country, formData.state);
    }, [formData.country, formData.state]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        // Reset dependent fields when parent changes
        if (name === 'country') {
            setFormData((prev) => ({
                ...prev,
                country: value,
                state: '',
                city: '',
            }));
        } else if (name === 'state') {
            setFormData((prev) => ({
                ...prev,
                state: value,
                city: '',
            }));
        } else {
            setFormData((prev) => ({
                ...prev,
                [name]: value,
            }));
        }
    };

    const handleApplyCoupon = async () => {
        setCouponError('');
        if (!couponCode.trim()) {
            setCouponError('Please enter a coupon code');
            return;
        }

        try {
            const response = await fetch('/api/coupons/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: couponCode }),
            });
            const data = await response.json();

            if (response.ok && data.valid) {
                setAppliedCoupon(data.coupon);
                setCouponCode('');
            } else {
                setCouponError(data.error || 'Invalid coupon code');
            }
        } catch (error) {
            setCouponError('Failed to apply coupon');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const response = await fetch('/api/orders/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ formData, cartItems, total }),
            });
            const data = await response.json();
            if (response.ok && data.emailSent) {
                setNotification({
                    message: 'Order placed successfully! Check your email for details.',
                    type: 'success',
                });
                setTimeout(() => setNotification(null), 5000);
                // TODO: clear cart if needed (dispatch clearCart)
                // router.push('/order-confirmation');
            } else {
                setNotification({
                    message: 'Failed to place order. Please try again.',
                    type: 'error',
                });
                setTimeout(() => setNotification(null), 5000);
            }
        } catch (err) {
            console.error('Error placing order:', err);
            setNotification({
                message: 'An error occurred while placing the order.',
                type: 'error',
            });
            setTimeout(() => setNotification(null), 5000);
        } finally {
            setIsLoading(false);
        }
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

    const shipping: number = 0; // Free shipping for demo
    const tax = cartTotal * 0.1; // 10% tax for demo

    // Calculate discount
    const discount = appliedCoupon
        ? appliedCoupon.discountType === 'percentage'
            ? cartTotal * appliedCoupon.discount / 100
            : appliedCoupon.discount
        : 0;

    const total = cartTotal - discount + shipping + tax;

    return (
        <div className={`${styles.main} ${isLoading ? styles.loadingCursor : ''}`}>
            <h1>CHECKOUT</h1>
            <div className={styles.checkoutContainer}>
                <form id="checkout-form" className={styles.checkoutForm} onSubmit={handleSubmit}>
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
                        <div className={styles.formGroup}>
                            <label htmlFor="country">Country</label>
                            <select
                                id="country"
                                name="country"
                                value={formData.country}
                                onChange={handleChange}
                                required
                            >
                                <option value="">Select Country</option>
                                {countries.map((country) => (
                                    <option key={country.isoCode} value={country.isoCode}>
                                        {country.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                                <label htmlFor="state">State</label>
                                <select
                                    id="state"
                                    name="state"
                                    value={formData.state}
                                    onChange={handleChange}
                                    required
                                    disabled={!formData.country}
                                >
                                    <option value="">Select State</option>
                                    {states.map((state) => (
                                        <option key={state.isoCode} value={state.isoCode}>
                                            {state.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className={styles.formGroup}>
                                <label htmlFor="city">City</label>
                                <select
                                    id="city"
                                    name="city"
                                    value={formData.city}
                                    onChange={handleChange}
                                    required
                                    disabled={!formData.state}
                                >
                                    <option value="">Select City</option>
                                    {cities.map((city) => (
                                        <option key={city.name} value={city.name}>
                                            {city.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className={styles.formRow}>
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
                            <label htmlFor="phone">Phone Number</label>
                            <div className={styles.phoneInputGroup}>
                                <select
                                    id="phoneCode"
                                    name="phoneCode"
                                    value={formData.phoneCode}
                                    onChange={handleChange}
                                    className={styles.phoneCodeSelect}
                                    required
                                >
                                    {phoneCodes.map((country) => (
                                        <option key={country.code} value={`+${country.phoneCode}`}>
                                            {country.name} (+{country.phoneCode})
                                        </option>
                                    ))}
                                </select>
                                <input
                                    type="tel"
                                    id="phone"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    placeholder="Phone number"
                                    className={styles.phoneInput}
                                    required
                                />
                            </div>
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

                    {/* Coupon Section */}
                    <div className={styles.couponSection}>
                        <h3>Have a Coupon?</h3>
                        {!appliedCoupon ? (
                            <div className={styles.couponInput}>
                                <input
                                    type="text"
                                    placeholder="Enter coupon code"
                                    value={couponCode}
                                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                />
                                <button onClick={handleApplyCoupon} type="button">
                                    Apply
                                </button>
                            </div>
                        ) : (
                            <div className={styles.appliedCoupon}>
                                <span>✓ {appliedCoupon.code} applied</span>
                                <button onClick={() => setAppliedCoupon(null)} type="button">
                                    Remove
                                </button>
                            </div>
                        )}
                        {couponError && <p className={styles.couponError}>{couponError}</p>}
                    </div>

                    <div className={styles.summaryRow}>
                        <span>Subtotal</span>
                        <span>Rs. {cartTotal.toLocaleString()}</span>
                    </div>
                    {appliedCoupon && (
                        <div className={`${styles.summaryRow} ${styles.discount}`}>
                            <span>Discount ({appliedCoupon.code})</span>
                            <span>
                                - Rs. {appliedCoupon.discountType === 'percentage'
                                    ? (cartTotal * appliedCoupon.discount / 100).toFixed(2)
                                    : appliedCoupon.discount.toFixed(2)}
                            </span>
                        </div>
                    )}
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
                        form="checkout-form"
                        className={`${styles.placeOrderButton} ${isLoading ? styles.loading : ''}`}
                        disabled={isLoading}
                    >
                        {isLoading ? 'PROCESSING...' : 'PLACE ORDER'}
                    </button>
                </div>
            </div>
            {notification && (
                <div className={`${styles.notificationBar} ${styles[notification.type]}`}>
                    {notification.message}
                </div>
            )}
        </div>
    );
}
