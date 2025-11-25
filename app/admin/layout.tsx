'use client';

import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import styles from './admin-layout.module.scss';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();

    const handleLogout = async () => {
        await fetch('/api/admin/logout', { method: 'POST' });
        router.push('/admin/login');
    };

    const navItems = [
        { href: '/admin', label: 'Dashboard', icon: '📊' },
        { href: '/admin/customers', label: 'Customers', icon: '👥' },
        { href: '/admin/orders', label: 'Orders', icon: '📦' },
        { href: '/admin/analytics', label: 'Analytics', icon: '📈' },
    ];

    return (
        <div className={styles.adminLayout}>
            <aside className={styles.sidebar}>
                <div className={styles.logo}>
                    <h2>ZNM Admin</h2>
                </div>

                <nav className={styles.nav}>
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`${styles.navItem} ${pathname === item.href ? styles.active : ''}`}
                        >
                            <span className={styles.icon}>{item.icon}</span>
                            <span>{item.label}</span>
                        </Link>
                    ))}
                </nav>

                <button onClick={handleLogout} className={styles.logoutBtn}>
                    <span className={styles.icon}>🚪</span>
                    <span>Logout</span>
                </button>
            </aside>

            <main className={styles.mainContent}>
                {children}
            </main>
        </div>
    );
}
