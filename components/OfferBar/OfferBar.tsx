'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import styles from './OfferBar.module.scss';
import Link from 'next/link';

import { SparklesIcon } from '@heroicons/react/24/outline';

export const OfferBar = () => {
	const pathname = usePathname();
	const [isVisible, setIsVisible] = useState(true);

	const isAdminPage = pathname?.startsWith('/admin');

	if (!isVisible || isAdminPage) return null;

	return (
		<div className={styles.offerBar}>
			<span>
				<SparklesIcon className={styles.icon} />
				SPECIAL OFFER: Get 15% off on all Sherwanis!
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
