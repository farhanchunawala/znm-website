'use client';

import { useEffect, useState } from 'react';
import { UsersIcon, ShoppingBagIcon, CurrencyDollarIcon, ClockIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import styles from './dashboard.module.scss';

interface DashboardStats {
    totalCustomers: number;
    totalOrders: number;
    totalRevenue: number;
    pendingOrders: number;
}

export default function AdminDashboard() {
    const [stats, setStats] = useState<DashboardStats>({
        totalCustomers: 0,
        totalOrders: 0,
        totalRevenue: 0,
        pendingOrders: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await fetch('/api/admin/stats');
            const data = await res.json();
            setStats(data);
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.dashboard}>
            <h1>Dashboard Overview</h1>

            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <div className={styles.statIcon}>
                        <UsersIcon />
                    </div>
                    <div className={styles.statInfo}>
                        <h3>Total Customers</h3>
                        <p className={styles.statValue}>{loading ? '...' : stats.totalCustomers}</p>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={styles.statIcon}>
                        <ShoppingBagIcon />
                    </div>
                    <div className={styles.statInfo}>
                        <h3>Total Orders</h3>
                        <p className={styles.statValue}>{loading ? '...' : stats.totalOrders}</p>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={styles.statIcon}>
                        <CurrencyDollarIcon />
                    </div>
                    <div className={styles.statInfo}>
                        <h3>Total Revenue</h3>
                        <p className={styles.statValue}>₹{loading ? '...' : stats.totalRevenue.toLocaleString()}</p>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={styles.statIcon}>
                        <ClockIcon />
                    </div>
                    <div className={styles.statInfo}>
                        <h3>Unpaid Orders</h3>
                        <p className={styles.statValue}>{loading ? '...' : stats.pendingOrders}</p>
                    </div>
                </div>
            </div>

            <div className={styles.quickActions}>
                <h2>Quick Actions</h2>
                <div className={styles.actionButtons}>
                    <a href="/admin/customers" className={styles.actionBtn}>
                        <UsersIcon /> Manage Customers
                    </a>
                    <a href="/admin/orders" className={styles.actionBtn}>
                        <ShoppingBagIcon /> Manage Orders
                    </a>
                    <a href="/admin/analytics" className={styles.actionBtn}>
                        <ChartBarIcon /> View Analytics
                    </a>
                </div>
            </div>
        </div>
    );
}
