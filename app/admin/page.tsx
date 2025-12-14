'use client';

import { useEffect, useState } from 'react';
import {
	UsersIcon,
	ShoppingBagIcon,
	CurrencyDollarIcon,
	ClockIcon,
	ChartBarIcon,
} from '@heroicons/react/24/outline';
import PageHeader from '@/components/Admin/PageHeader';
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
			<PageHeader
				title="Dashboard"
				subtitle="Overview of your business metrics"
				icon={<ChartBarIcon />}
			/>

			<div className={styles.statsGrid}>
				<div className={styles.statCard}>
					<div className={styles.statIcon}>
						<UsersIcon />
					</div>
					<div className={styles.statInfo}>
						<h3>Total Customers</h3>
						<p className={styles.statValue}>
							{loading ? '...' : stats.totalCustomers.toLocaleString()}
						</p>
					</div>
				</div>

				<div className={styles.statCard}>
					<div className={styles.statIcon}>
						<ShoppingBagIcon />
					</div>
					<div className={styles.statInfo}>
						<h3>Total Orders</h3>
						<p className={styles.statValue}>
							{loading ? '...' : stats.totalOrders.toLocaleString()}
						</p>
					</div>
				</div>

				<div className={styles.statCard}>
					<div className={styles.statIcon}>
						<CurrencyDollarIcon />
					</div>
					<div className={styles.statInfo}>
						<h3>Total Revenue</h3>
						<p className={styles.statValue}>
							₹
							{loading
								? '...'
								: stats.totalRevenue.toLocaleString()}
						</p>
					</div>
				</div>

				<div className={styles.statCard}>
					<div className={styles.statIcon}>
						<ClockIcon />
					</div>
					<div className={styles.statInfo}>
						<h3>Pending Orders</h3>
						<p className={styles.statValue}>
							{loading ? '...' : stats.pendingOrders.toLocaleString()}
						</p>
					</div>
				</div>
			</div>

			<div className={styles.quickLinks}>
				<h2>Quick Access</h2>
				<div className={styles.linksGrid}>
					<a href="/admin/orders" className={styles.linkCard}>
						<ShoppingBagIcon />
						<span>Orders</span>
					</a>
					<a href="/admin/customers" className={styles.linkCard}>
						<UsersIcon />
						<span>Customers</span>
					</a>
					<a href="/admin/products" className={styles.linkCard}>
						<ShoppingBagIcon />
						<span>Products</span>
					</a>
					<a href="/admin/shipments" className={styles.linkCard}>
						<ChartBarIcon />
						<span>Shipments</span>
					</a>
					<a href="/admin/bills" className={styles.linkCard}>
						<CurrencyDollarIcon />
						<span>Bills</span>
					</a>
					<a href="/admin/invoices" className={styles.linkCard}>
						<CurrencyDollarIcon />
						<span>Invoices</span>
					</a>
				</div>
			</div>
		</div>
	);
}
