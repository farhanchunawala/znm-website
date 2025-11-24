'use client';

import { useState } from 'react';
import styles from './newsletter.module.scss';
import Link from 'next/link';

export default function NewsletterPage() {
    const [email, setEmail] = useState('');
    const [subscribed, setSubscribed] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Here you would typically send the email to your newsletter service
        setSubscribed(true);
    };

    if (subscribed) {
        return (
            <div className={styles.main}>
                <div className={styles.successMessage}>
                    <h2>Thank You for Subscribing!</h2>
                    <p>
                        You've successfully joined our newsletter. Check your inbox for a
                        confirmation email.
                    </p>
                    <Link href="/">CONTINUE SHOPPING</Link>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.main}>
            <div className={styles.newsletterContainer}>
                <h1>NEWSLETTER</h1>
                <p className={styles.subtitle}>
                    Subscribe to receive exclusive updates, new arrivals, and special offers
                    from Zoll & Metér.
                </p>

                <div className={styles.benefits}>
                    <ul>
                        <li>Early access to new collections</li>
                        <li>Exclusive discounts and promotions</li>
                        <li>Style tips and fashion inspiration</li>
                        <li>Invitations to special events</li>
                    </ul>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className={styles.formGroup}>
                        <input
                            type="email"
                            placeholder="Enter your email address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" className={styles.subscribeButton}>
                        SUBSCRIBE
                    </button>
                </form>

                <p className={styles.privacy}>
                    We respect your privacy. Read our{' '}
                    <Link href="/privacy-policy">Privacy Policy</Link>.
                </p>
            </div>
        </div>
    );
}
