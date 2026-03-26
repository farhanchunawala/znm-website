'use client';

import { useEffect, useState, useRef } from 'react';
import { useInvoices, useInvoiceAction } from '@/lib/invoice/hooks';
import { 
	ArrowDownOnSquareIcon, 
	ArrowUpOnSquareIcon, 
	DocumentArrowDownIcon, 
	ArrowPathIcon, 
	XCircleIcon,
	DocumentDuplicateIcon
} from '@heroicons/react/24/outline';
import styles from './invoices.module.scss';

interface Invoice {
	_id: string;
	invoiceNumber: string;
	orderId: {
		_id: string;
		orderNumber: string;
	};
	customerId: {
		_id: string;
		name: string;
		email: string;
	};
	status: 'generated' | 'cancelled' | 'regenerated';
	paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
	totalsSnapshot: {
		grandTotal: number;
	};
	createdAt: string;
}

export default function InvoiceList() {
	const { invoices, loading, error, fetch } = useInvoices();
	const { regenerate, cancel, downloadPDF } = useInvoiceAction();
	const [filters, setFilters] = useState({
		status: '',
		paymentStatus: '',
		sortBy: 'createdAt',
		sortOrder: 'desc',
	});
	const fileInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		fetch(filters);
	}, []);

	const handleFilterChange = (key: string, value: string) => {
		const newFilters = { ...filters, [key]: value };
		setFilters(newFilters);
		fetch(newFilters);
	};

	const handleRegenerate = async (invoiceId: string) => {
		if (confirm('Regenerate this invoice? A new invoice number will be created.')) {
			try {
				await regenerate(invoiceId);
				fetch(filters);
			} catch (err) {
				console.error('Failed to regenerate:', err);
			}
		}
	};

	const handleCancel = async (invoiceId: string) => {
		const reason = prompt('Enter cancellation reason:');
		if (reason) {
			try {
				await cancel(invoiceId, reason);
				fetch(filters);
			} catch (err) {
				console.error('Failed to cancel:', err);
			}
		}
	};

	const getBadgeClass = (status: string, type: 'status' | 'payment') => {
		const baseClass = styles.badge;
		if (type === 'status') {
			if (status === 'generated') return `${baseClass} ${styles.badgeGenerated}`;
			if (status === 'cancelled') return `${baseClass} ${styles.badgeCancelled}`;
			if (status === 'regenerated') return `${baseClass} ${styles.badgeRegenerated}`;
		} else {
			if (status === 'paid') return `${baseClass} ${styles.badgePaid}`;
			if (status === 'pending') return `${baseClass} ${styles.badgePending}`;
			if (status === 'failed') return `${baseClass} ${styles.badgeFailed}`;
			if (status === 'refunded') return `${baseClass} ${styles.badgeRefunded}`;
		}
		return baseClass;
	};

	return (
		<div className={styles.pageContainer}>
			<div className={styles.header}>
				<div>
					<h1><DocumentDuplicateIcon className={styles.headerIcon} style={{ width: '28px', height: '28px', display: 'inline-block', verticalAlign: 'bottom', marginRight: '8px' }} /> Invoices</h1>
					<p>Manage and track all customer invoices</p>
				</div>
				<div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
					<button onClick={async () => {
						try {
							const res = await window.fetch('/api/admin/invoices/export');
							const blob = await res.blob();
							const url = window.URL.createObjectURL(blob);
							const a = document.createElement('a'); a.href = url;
							a.download = `invoices-${new Date().toISOString().split('T')[0]}.csv`;
							a.click();
						} catch { alert('Export failed'); }
					}} className={styles.btnSmall}><ArrowDownOnSquareIcon className={styles.btnIcon} /> Export CSV</button>
					<button onClick={() => fileInputRef.current?.click()} className={styles.btnSmall}><ArrowUpOnSquareIcon className={styles.btnIcon} /> Import CSV</button>
					<input type="file" ref={fileInputRef} accept=".csv" style={{ display: 'none' }} onChange={async (e) => {
						const file = e.target.files?.[0]; if (!file) return;
						const fd = new FormData(); fd.append('file', file);
						try {
							const res = await window.fetch('/api/admin/invoices/import', { method: 'POST', body: fd });
							const result = await res.json();
							alert(result.success ? `Updated ${result.updated} invoices` : result.error);
							if (result.success) fetch(filters);
						} catch { alert('Import failed'); }
						if (fileInputRef.current) fileInputRef.current.value = '';
					}} />
				</div>
			</div>

			{error && <div className={styles.errorMessage}>{error}</div>}

			{/* Filters */}
			<div className={styles.filterSection}>
				<div className={styles.filterGroup}>
					<label>Status</label>
					<select
						value={filters.status}
						onChange={(e) => handleFilterChange('status', e.target.value)}
					>
						<option value="">All Status</option>
						<option value="generated">Generated</option>
						<option value="cancelled">Cancelled</option>
						<option value="regenerated">Regenerated</option>
					</select>
				</div>

				<div className={styles.filterGroup}>
					<label>Payment Status</label>
					<select
						value={filters.paymentStatus}
						onChange={(e) => handleFilterChange('paymentStatus', e.target.value)}
					>
						<option value="">All Payments</option>
						<option value="paid">Paid</option>
						<option value="pending">Pending</option>
						<option value="failed">Failed</option>
						<option value="refunded">Refunded</option>
					</select>
				</div>

				<div className={styles.filterGroup}>
					<label>Sort By</label>
					<select
						value={filters.sortBy}
						onChange={(e) => handleFilterChange('sortBy', e.target.value)}
					>
						<option value="createdAt">Creation Date</option>
						<option value="invoiceNumber">Invoice Number</option>
						<option value="totalsSnapshot.grandTotal">Amount</option>
					</select>
				</div>
			</div>

			{/* Invoice List */}
			<div className={styles.tableContainer}>
				{loading ? (
					<p>Loading invoices...</p>
				) : invoices.length === 0 ? (
					<p>No invoices found</p>
				) : (
					<table className={styles.table}>
						<thead>
							<tr>
								<th>Invoice #</th>
								<th>Order #</th>
								<th>Customer</th>
								<th>Amount</th>
								<th>Status</th>
								<th>Payment</th>
								<th>Date</th>
								<th>Actions</th>
							</tr>
						</thead>
						<tbody>
							{(invoices as Invoice[]).map((invoice) => (
								<tr key={invoice._id}>
									<td>
										<strong>{invoice.invoiceNumber}</strong>
									</td>
									<td>{invoice.orderId.orderNumber}</td>
									<td>
										<div>
											<strong>{invoice.customerId.name}</strong>
											<br />
											<small>{invoice.customerId.email}</small>
										</div>
									</td>
									<td>₹{invoice.totalsSnapshot.grandTotal.toLocaleString('en-IN')}</td>
									<td>
										<span className={getBadgeClass(invoice.status, 'status')}>
											{invoice.status}
										</span>
									</td>
									<td>
										<span className={getBadgeClass(invoice.paymentStatus, 'payment')}>
											{invoice.paymentStatus}
										</span>
									</td>
									<td>
										{new Date(invoice.createdAt).toLocaleDateString('en-IN')}
									</td>
									<td>
										<div className={styles.actions}>
											<button
												onClick={() => downloadPDF(invoice._id)}
												title="Download PDF"
												className={styles.btnSmall}
											>
												<DocumentArrowDownIcon className={styles.btnIcon} /> PDF
											</button>
											<button
												onClick={() => handleRegenerate(invoice._id)}
												title="Regenerate Invoice"
												className={styles.btnSmall}
											>
												<ArrowPathIcon className={styles.btnIcon} /> Regen
											</button>
											{invoice.status === 'generated' && (
												<button
													onClick={() => handleCancel(invoice._id)}
													title="Cancel Invoice"
													className={`${styles.btnSmall} ${styles.btnDanger}`}
												>
													<XCircleIcon className={styles.btnIcon} /> Cancel
												</button>
											)}
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
			</div>
		</div>
	);
}
