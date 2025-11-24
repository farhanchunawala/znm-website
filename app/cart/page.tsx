'use client';

import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import {
    removeFromCart,
    updateQuantity,
    selectCartItems,
    selectCartTotal,
} from '@/lib/features/cartSlice';
import styles from './cart.module.scss';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function CartPage() {
    const dispatch = useAppDispatch();
    const cartItems = useAppSelector(selectCartItems);
    const cartTotal = useAppSelector(selectCartTotal);
    const router = useRouter();

    const handleQuantityChange = (id: string, size: string, newQuantity: number) => {
        if (newQuantity < 1) return;
        dispatch(updateQuantity({ id, size, quantity: newQuantity }));
    };

    const handleRemove = (id: string, size: string) => {
        dispatch(removeFromCart({ id, size }));
    };

    const handleCheckout = () => {
        router.push('/checkout');
    };

    if (cartItems.length === 0) {
        return (
            <div className={styles.main}>
                <h1>YOUR CART</h1>
                <div className={styles.emptyCart}>
                    <p>Your cart is currently empty.</p>
                    <Link href="/" className={styles.continueShopping}>
                        CONTINUE SHOPPING
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.main}>
            <h1>YOUR CART</h1>
            <div className={styles.cartContainer}>
                <div className={styles.cartItems}>
                    {cartItems.map((item) => (
                        <div key={`${item.id}-${item.size}`} className={styles.cartItem}>
                            <div className={styles.imageWrapper}>
                                <Image
                                    src={item.image}
                                    alt={item.title}
                                    width={100}
                                    height={140}
                                    className={styles.itemImage}
                                />
                            </div>
                            <div className={styles.itemDetails}>
                                <div className={styles.itemHeader}>
                                    <h3>{item.title}</h3>
                                    <span className={styles.price}>Rs. {item.price.toLocaleString()}</span>
                                </div>
                                <div className={styles.itemMeta}>
                                    <p>Size: {item.size}</p>
                                </div>
                                <div className={styles.itemActions}>
                                    <div className={styles.quantityControls}>
                                        <button
                                            onClick={() =>
                                                handleQuantityChange(item.id, item.size, item.quantity - 1)
                                            }
                                        >
                                            -
                                        </button>
                                        <span>{item.quantity}</span>
                                        <button
                                            onClick={() =>
                                                handleQuantityChange(item.id, item.size, item.quantity + 1)
                                            }
                                        >
                                            +
                                        </button>
                                    </div>
                                    <button
                                        className={styles.removeButton}
                                        onClick={() => handleRemove(item.id, item.size)}
                                    >
                                        REMOVE
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className={styles.summary}>
                    <h2>ORDER SUMMARY</h2>
                    <div className={styles.summaryRow}>
                        <span>Subtotal</span>
                        <span>Rs. {cartTotal.toLocaleString()}</span>
                    </div>
                    <div className={styles.summaryRow}>
                        <span>Shipping</span>
                        <span>Calculated at checkout</span>
                    </div>
                    <div className={`${styles.summaryRow} ${styles.total}`}>
                        <span>Total</span>
                        <span>Rs. {cartTotal.toLocaleString()}</span>
                    </div>
                    <button className={styles.checkoutButton} onClick={handleCheckout}>
                        PROCEED TO CHECKOUT
                    </button>
                </div>
            </div>
        </div>
    );
}
