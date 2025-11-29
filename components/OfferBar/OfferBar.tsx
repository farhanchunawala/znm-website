'use client';

import { useState } from 'react';
import styles from './OfferBar.module.scss';
import Link from 'next/link';

export const OfferBar = () => {
    const [isVisible, setIsVisible] = useState(true);

    if (!isVisible) return null;

    return (
        <div className={styles.offerBar}>
            <span>
                🎉 SPECIAL OFFER: Get 15% off on all Sherwanis!
                <Link href="/collections/sherwani">Shop Now</Link>
            </span>
            <button
                className={styles.closeButton}
                onClick={() => setIsVisible(false)}
                aria-label="Close offer"
            >
                ×
            </button>
        </div>
    );
};
