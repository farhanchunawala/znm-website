import styles from './not-found.module.scss';
import Link from 'next/link';

export default function NotFound() {
    return (
        <div className={styles.container}>
            <div className={styles.content}>
                <h1>404</h1>
                <h2>PAGE NOT FOUND</h2>
                <p>The page you are looking for does not exist or has been moved.</p>

                <div className={styles.links}>
                    <Link href="/" className={styles.homeLink}>
                        Return to Home
                    </Link>
                    <Link href="/collections/new-in" className={styles.shopLink}>
                        Continue Shopping
                    </Link>
                </div>
            </div>
        </div>
    );
}
