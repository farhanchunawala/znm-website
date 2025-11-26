'use client';

import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { HomeIcon, UsersIcon, ShoppingBagIcon, ChartBarIcon, ArrowLeftOnRectangleIcon, MegaphoneIcon, TruckIcon, TagIcon } from '@heroicons/react/24/outline';
import styles from './admin-layout.module.scss';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();

    const handleLogout = async () => {
        await fetch('/api/admin/logout', { method: 'POST' });
        router.push('/admin/login');
    };

    const navItems = [
        { href: '/admin', label: 'Dashboard', icon: HomeIcon },
        { href: '/admin/customers', label: 'Customers', icon: UsersIcon },
        { href: '/admin/orders', label: 'Orders', icon: ShoppingBagIcon },
        { href: '/admin/shipments', label: 'Shipments', icon: TruckIcon },
        { href: '/admin/groups', label: 'Groups', icon: TagIcon },
        { href: '/admin/broadcast', label: 'Broadcast', icon: MegaphoneIcon },
        { href: '/admin/analytics', label: 'Analytics', icon: ChartBarIcon },
    ];

    return (
        <div className={styles.adminLayout}>
            <aside className={styles.sidebar}>
                <div className={styles.logo}>
                    <h2>ZNM Admin</h2>
                </div>

                <nav className={styles.nav}>
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`${styles.navItem} ${pathname === item.href ? styles.active : ''}`}
                            >
                                <Icon className={styles.icon} />
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <button onClick={handleLogout} className={styles.logoutBtn}>
                    <ArrowLeftOnRectangleIcon className={styles.icon} />
                    <span>Logout</span>
                </button>
            </aside>

            <main className={styles.mainContent}>
                {children}
            </main>
        </div>
    );
}
