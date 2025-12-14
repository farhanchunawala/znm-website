'use client';

import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
	HomeIcon,
	UsersIcon,
	ShoppingBagIcon,
	ChartBarIcon,
	ArrowLeftOnRectangleIcon,
	MegaphoneIcon,
	TruckIcon,
	TagIcon,
	DocumentTextIcon,
	Cog6ToothIcon,
	CheckCircleIcon,
	CurrencyDollarIcon,
} from '@heroicons/react/24/outline';
import styles from './admin-layout.module.scss';

export default function AdminLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const router = useRouter();
	const pathname = usePathname();

	const handleLogout = async () => {
		await fetch('/api/admin/logout', { method: 'POST' });
		router.push('/admin/login');
	};

	const navSections = [
		{
			title: 'MAIN',
			items: [
				{ href: '/admin', label: 'Dashboard', icon: HomeIcon },
			],
		},
		{
			title: 'OPERATIONS',
			items: [
				{ href: '/admin/orders', label: 'Orders', icon: ShoppingBagIcon },
				{ href: '/admin/shipments', label: 'Shipments', icon: TruckIcon },
				{ href: '/admin/bills', label: 'Bills', icon: DocumentTextIcon },
				{ href: '/admin/invoices', label: 'Invoices', icon: CurrencyDollarIcon },
			],
		},
		{
			title: 'CATALOG',
			items: [
				{ href: '/admin/products', label: 'Products', icon: TagIcon },
				{ href: '/admin/categories', label: 'Categories', icon: TagIcon },
				{ href: '/admin/collections', label: 'Collections', icon: TagIcon },
				{ href: '/admin/inventory', label: 'Inventory', icon: CheckCircleIcon },
			],
		},
		{
			title: 'CUSTOMERS & GROUPS',
			items: [
				{ href: '/admin/customers', label: 'Customers', icon: UsersIcon },
				{ href: '/admin/groups', label: 'Groups', icon: UsersIcon },
			],
		},
		{
			title: 'MARKETING',
			items: [
				{ href: '/admin/broadcast', label: 'Broadcast', icon: MegaphoneIcon },
				{ href: '/admin/feedback', label: 'Feedback', icon: MegaphoneIcon },
			],
		},
		{
			title: 'ANALYTICS',
			items: [
				{ href: '/admin/analytics', label: 'Analytics', icon: ChartBarIcon },
			],
		},
	];

	const isActive = (href: string) => {
		if (href === '/admin') {
			return pathname === href;
		}
		return pathname.startsWith(href);
	};

	return (
		<div className={styles.adminLayout}>
			<aside className={styles.sidebar}>
				<div className={styles.logo}>
					<div className={styles.logoIcon}>ZNM</div>
					<div className={styles.logoText}>
						<h2>Admin</h2>
						<p>Dashboard</p>
					</div>
				</div>

				<nav className={styles.nav}>
					{navSections.map((section) => (
						<div key={section.title} className={styles.navSection}>
							<div className={styles.sectionTitle}>{section.title}</div>
							{section.items.map((item) => {
								const Icon = item.icon;
								return (
									<Link
										key={item.href}
										href={item.href}
										className={`${styles.navItem} ${isActive(item.href) ? styles.active : ''}`}
									>
										<Icon className={styles.icon} />
										<span>{item.label}</span>
									</Link>
								);
							})}
						</div>
					))}
				</nav>

				<button onClick={handleLogout} className={styles.logoutBtn}>
					<ArrowLeftOnRectangleIcon className={styles.icon} />
					<span>Logout</span>
				</button>
			</aside>

			<main className={styles.mainContent}>{children}</main>
		</div>
	);
}
