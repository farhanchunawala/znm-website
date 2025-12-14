'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PlusIcon } from '@heroicons/react/24/outline';
import styles from './customers.module.scss';

interface Customer {
	_id: string;
	customerId: string;
	name: string;
	firstName?: string; // Legacy support
	lastName?: string; // Legacy support
	email?: string;
	emails?: string[];
	phone: string;
	phoneCode?: string;
	address?: string;
	city?: string;
	state?: string;
	country?: string;
	zipCode?: string;
	archived?: boolean;
	createdAt: string;
	orderCount?: number;
	totalSpent?: number;
	tags?: string[];
}

export default function CustomersPage() {
	const [customers, setCustomers] = useState<Customer[]>([]);
	const [loading, setLoading] = useState(true);
	const [showArchived, setShowArchived] = useState(false);
	const [searchTerm, setSearchTerm] = useState('');
	const [sortBy, setSortBy] = useState('latest');
	const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);

	useEffect(() => {
		fetchCustomers();
	}, [showArchived, sortBy]);

	const fetchCustomers = async () => {
		try {
			const res = await fetch(
				`/api/admin/customers?archived=${showArchived}&sort=${sortBy}`
			);
			const data = await res.json();

			// Check if response is an error object
			if (
				data &&
				typeof data === 'object' &&
				('message' in data || 'error' in data)
			) {
				console.error('API returned error:', data);
				setCustomers([]);
				return;
			}

			// Handle both array and { data: { customers: [] } } formats
			let customerList = Array.isArray(data)
				? data
				: data.data?.customers || [];

			// Filter out any error objects from the array
			customerList = customerList.filter((item: any) => {
				return item && item._id && !(item.message && item.code);
			});

			setCustomers(customerList);
		} catch (error) {
			console.error('Failed to fetch customers:', error);
			setCustomers([]);
		} finally {
			setLoading(false);
		}
	};

	const toggleSelectAll = () => {
		if (selectedCustomers.length === filteredCustomers.length) {
			setSelectedCustomers([]);
		} else {
			setSelectedCustomers(filteredCustomers.map((c) => c._id));
		}
	};

	const toggleSelect = (id: string) => {
		setSelectedCustomers((prev) =>
			prev.includes(id) ? prev.filter((cid) => cid !== id) : [...prev, id]
		);
	};

	const handleBulkAction = async (action: string) => {
		if (selectedCustomers.length === 0) return;

		try {
			const res = await fetch('/api/admin/customers/bulk', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ ids: selectedCustomers, action }),
			});

			if (res.ok) {
				setSelectedCustomers([]);
				fetchCustomers();
			}
		} catch (error) {
			console.error('Bulk operation failed:', error);
		}
	};

	const handleDelete = async (id: string) => {
		if (
			!confirm(
				'Are you sure you want to permanently delete this customer? This action cannot be undone.'
			)
		)
			return;

		try {
			await fetch(`/api/admin/customers/${id}`, { method: 'DELETE' });
			fetchCustomers();
		} catch (error) {
			console.error('Failed to delete customer:', error);
		}
	};

	const handleArchive = async (id: string, currentStatus: boolean) => {
		try {
			await fetch(`/api/admin/customers/${id}/archive`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ archived: !currentStatus }),
			});
			fetchCustomers();
		} catch (error) {
			console.error('Failed to archive customer:', error);
		}
	};

	const handleExportCSV = () => {
		const headers = [
			'Customer ID',
			'Name',
			'Email',
			'Phone',
			'City',
			'Total Orders',
			'Total Spent',
		];
		const rows = filteredCustomers.map((c) => [
			c.customerId || '',
			c.name || `${c.firstName || ''} ${c.lastName || ''}`.trim(),
			c.email || c.emails?.[0] || '',
			`${c.phoneCode || ''}${c.phone || ''}`,
			c.city || '',
			c.orderCount || 0,
			c.totalSpent || 0,
		]);

		const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
		const blob = new Blob([csv], { type: 'text/csv' });
		const url = window.URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `customers-${new Date().toISOString().split('T')[0]}.csv`;
		a.click();
	};

	const filteredCustomers = customers.filter((customer) => {
		// Skip invalid objects (error responses)
		const c = customer as any;
		if (!customer || !customer._id || (c.message && c.code)) {
			return false;
		}

		if (!searchTerm) return true;

		const searchLower = searchTerm.toLowerCase();
		const name =
			customer.name ||
			`${customer.firstName || ''} ${customer.lastName || ''}`;
		const email = customer.email || customer.emails?.[0] || '';

		return (
			(name && name.toLowerCase().includes(searchLower)) ||
			(email && email.toLowerCase().includes(searchLower)) ||
			(customer.phone && customer.phone.includes(searchTerm)) ||
			(customer.customerId &&
				customer.customerId.toLowerCase().includes(searchLower))
		);
	});

	// Helper to safely render any value (prevents object rendering errors)
	const safeRender = (value: any): string => {
		if (value === null || value === undefined) return '';
		if (typeof value === 'object') return JSON.stringify(value);
		return String(value);
	};

	return (
		<div className={styles.customersPage}>
			<div className={styles.header}>
				<h1>Customers</h1>
				<div className={styles.actions}>
					<Link href="/admin/customers/new" className={styles.addBtn}>
						<PlusIcon />
						Add Customer
					</Link>
					<Link
						href="/admin/customers/import"
						className={styles.exportBtn}
					>
						Import CSV
					</Link>
					<button
						onClick={handleExportCSV}
						className={styles.exportBtn}
					>
						Export CSV
					</button>
					<button
						onClick={() => setShowArchived(!showArchived)}
						className={styles.archiveBtn}
					>
						{showArchived ? 'Show Active' : 'Show Archived'}
					</button>
				</div>
			</div>

			<div className={styles.filters}>
				<input
					type="text"
					placeholder="Search by name, email, phone, or ID..."
					value={searchTerm}
					onChange={(e) => setSearchTerm(e.target.value)}
					className={styles.searchInput}
				/>

				<select
					value={sortBy}
					onChange={(e) => setSortBy(e.target.value)}
					className={styles.sortSelect}
				>
					<option value="latest">Latest First</option>
					<option value="oldest">Oldest First</option>
					<option value="mostOrders">Most Orders</option>
					<option value="leastOrders">Least Orders</option>
					<option value="highestSpent">Highest Spent</option>
					<option value="lowestSpent">Lowest Spent</option>
					<option value="nameAZ">Name (A-Z)</option>
					<option value="nameZA">Name (Z-A)</option>
				</select>
			</div>

			{selectedCustomers.length > 0 && (
				<div className={styles.bulkActions}>
					<span>{selectedCustomers.length} selected</span>
					<button
						onClick={() => handleBulkAction('delete')}
						className={styles.bulkBtn}
					>
						Delete
					</button>
					<button
						onClick={() => handleBulkAction('archive')}
						className={styles.bulkBtn}
					>
						Archive
					</button>
				</div>
			)}

			{loading ? (
				<div className={styles.loading}>Loading customers...</div>
			) : (
				<>
					<div className={styles.stats}>
						<span>{filteredCustomers.length} customers found</span>
					</div>

					<div className={styles.tableContainer}>
						<table className={styles.table}>
							<thead>
								<tr>
									<th>
										<input
											type="checkbox"
											checked={
												selectedCustomers.length ===
													filteredCustomers.length &&
												filteredCustomers.length > 0
											}
											onChange={toggleSelectAll}
										/>
									</th>
									<th>Customer ID</th>
									<th>Name</th>
									<th>Email</th>
									<th>Phone</th>
									<th>Location</th>
									<th>Orders</th>
									<th>Total Spent</th>
									<th>Actions</th>
								</tr>
							</thead>
							<tbody>
								{filteredCustomers.map((customer) => {
									// Filter out invalid customer objects (error responses)
									const c = customer as any;
									if (
										!customer ||
										!customer._id ||
										(c.message && c.code)
									) {
										console.warn(
											'Skipping invalid customer object:',
											customer
										);
										return null;
									}
									return (
										<tr key={customer._id}>
											<td>
												<input
													type="checkbox"
													checked={selectedCustomers.includes(
														customer._id
													)}
													onChange={() =>
														toggleSelect(
															customer._id
														)
													}
												/>
											</td>
											<td className={styles.customerId}>
												<Link
													href={`/admin/customers/${customer._id}`}
													className={styles.link}
												>
													{typeof customer.customerId ===
													'string'
														? customer.customerId
														: 'N/A'}
												</Link>
											</td>
											<td className={styles.name}>
												<Link
													href={`/admin/customers/${customer._id}`}
													className={styles.link}
												>
													{typeof customer.name ===
													'string'
														? customer.name
														: `${typeof customer.firstName === 'string' ? customer.firstName : ''} ${typeof customer.lastName === 'string' ? customer.lastName : ''}`.trim() ||
															'Unknown'}
												</Link>
											</td>
											<td>
												{typeof customer.email ===
												'string'
													? customer.email
													: Array.isArray(
																customer.emails
														  ) &&
														  typeof customer
																.emails[0] ===
																'string'
														? customer.emails[0]
														: 'N/A'}
											</td>
											<td>
												{typeof customer.phoneCode ===
												'string'
													? customer.phoneCode
													: ''}
												{typeof customer.phone ===
												'string'
													? customer.phone
													: 'N/A'}
											</td>
											<td>
												{typeof customer.city ===
												'string'
													? customer.city
													: 'N/A'}
												,{' '}
												{typeof customer.state ===
												'string'
													? customer.state
													: ''}
											</td>
											<td className={styles.centered}>
												{typeof customer.orderCount ===
												'number'
													? customer.orderCount
													: 0}
											</td>
											<td className={styles.amount}>
												₹
												{(typeof customer.totalSpent ===
												'number'
													? customer.totalSpent
													: 0
												).toLocaleString()}
											</td>
											<td className={styles.actions}>
												<button
													onClick={() =>
														handleArchive(
															customer._id,
															customer.archived ||
																false
														)
													}
													className={
														styles.archiveAction
													}
													title={
														customer.archived
															? 'Unarchive'
															: 'Archive'
													}
												>
													{customer.archived
														? '📤'
														: '📁'}
												</button>
												<button
													onClick={() =>
														handleDelete(
															customer._id
														)
													}
													className={
														styles.deleteAction
													}
													title="Delete"
												>
													🗑️
												</button>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				</>
			)}
		</div>
	);
}
