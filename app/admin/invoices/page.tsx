'use client';

import { useEffect, useState } from 'react';
import { useInvoices, useInvoiceAction } from '@/lib/invoice/hooks';
import styles from '@/app/admin/admin-layout.module.scss';

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
	const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
	const [filters, setFilters] = useState({
		status: '',
		paymentStatus: '',
		sortBy: 'createdAt',
		sortOrder: 'desc',
	});

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

	return (
		<div className={styles.pageContainer}>
			<div className={styles.header}>
				<h1>Invoices</h1>
				<p>Manage and track all customer invoices</p>
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
										<span className={`badge badge-${invoice.status}`}>
											{invoice.status}
										</span>
									</td>
									<td>
										<span
											className={`badge badge-${invoice.paymentStatus.toLowerCase()}`}
										>
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
												📥 PDF
											</button>
											<button
												onClick={() => handleRegenerate(invoice._id)}
												title="Regenerate Invoice"
												className={styles.btnSmall}
											>
												🔄 Regen
											</button>
											{invoice.status === 'generated' && (
												<button
													onClick={() => handleCancel(invoice._id)}
													title="Cancel Invoice"
													className={`${styles.btnSmall} ${styles.btnDanger}`}
												>
													❌ Cancel
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

			<style jsx>{`
				.badge {
					display: inline-block;
					padding: 4px 8px;
					border-radius: 4px;
					font-size: 11px;
					font-weight: 600;
					text-transform: uppercase;
				}
				.badge-generated {
					background: #d4edda;
					color: #155724;
				}
				.badge-cancelled {
					background: #f8d7da;
					color: #721c24;
				}
				.badge-regenerated {
					background: #cfe2ff;
					color: #084298;
				}
				.badge-pending {
					background: #fff3cd;
					color: #856404;
				}
				.badge-paid {
					background: #d4edda;
					color: #155724;
				}
				.badge-failed {
					background: #f8d7da;
					color: #721c24;
				}
				.badge-refunded {
					background: #cfe2ff;
					color: #084298;
				}
			`}</style>
		</div>
	);
}
