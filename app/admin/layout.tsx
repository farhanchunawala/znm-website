'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { HomeIcon, UsersIcon, ShoppingBagIcon, ChartBarIcon, ArrowLeftOnRectangleIcon, MegaphoneIcon, TruckIcon, TagIcon, Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import styles from './admin-layout.module.css';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const handleLogout = async () => {
        await fetch('/api/admin/logout', { method: 'POST' });
        router.push('/admin/login');
    };

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    const closeSidebar = () => {
        setIsSidebarOpen(false);
    };

    const navItems = [
        { href: '/admin', label: 'Dashboard', icon: HomeIcon },
        { href: '/admin/analytics', label: 'Analytics', icon: ChartBarIcon },
        { href: '/admin/customers', label: 'Customers', icon: UsersIcon },
        { href: '/admin/orders', label: 'Orders', icon: ShoppingBagIcon },
        { href: '/admin/shipments', label: 'Shipments', icon: TruckIcon },
        { href: '/admin/groups', label: 'Groups', icon: TagIcon },
        { href: '/admin/broadcast', label: 'Broadcast', icon: MegaphoneIcon },
    ];

    return (
        <div className={styles.adminLayout}>
            <header className={styles.mobileHeader}>
                <h2>ZNM Admin</h2>
                <button className={styles.hamburger} onClick={toggleSidebar}>
                    {isSidebarOpen ? <XMarkIcon className={styles.icon} /> : <Bars3Icon className={styles.icon} />}
                </button>
            </header>

            <aside className={`${styles.sidebar} ${isSidebarOpen ? styles.open : ''}`}>
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
                                onClick={closeSidebar}
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
