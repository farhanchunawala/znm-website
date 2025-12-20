'use client';

import { useEffect, useState } from 'react';
import { DocumentTextIcon, PrinterIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import PageHeader from '@/components/Admin/PageHeader';
import DataTable from '@/components/Admin/DataTable';
import Modal from '@/components/Admin/Modal';
import Card from '@/components/Admin/Card';
import styles from './bills.module.scss';
import buttonStyles from '@/components/Admin/_buttons.module.scss';
import formStyles from '@/components/Admin/_forms.module.scss';

interface Bill {
	_id: string;
	orderSnapshot: { orderNumber: string };
	customerSnapshot: { name: string; phone: string };
	billType: 'COD' | 'PAID';
	amountToCollect: number;
	amountPaid: number;
	status: 'active' | 'cancelled';
	printCount: number;
	createdAt: string;
}

interface BillDetail extends Bill {
	orderId: string;
	paymentId: string;
	currency: string;
	notes?: string;
	auditLog: any[];
}

export default function BillsPage() {
	const [bills, setBills] = useState<Bill[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	const [billType, setBillType] = useState<'COD' | 'PAID' | ''>('');
	const [status, setStatus] = useState<'active' | 'cancelled' | ''>('');
	const [sortBy, setSortBy] = useState<'createdAt' | 'billType' | 'amountToCollect'>('createdAt');

	const [selectedBill, setSelectedBill] = useState<BillDetail | null>(null);
	const [showDetail, setShowDetail] = useState(false);
	const [showCreateModal, setShowCreateModal] = useState(false);
	const [showEditModal, setShowEditModal] = useState(false);

	const [createFormData, setCreateFormData] = useState({
		orderId: '',
		paymentId: '',
		notes: '',
	});

	const [editFormData, setEditFormData] = useState({
		amount: 0,
		notes: '',
	});

	const [actionInProgress, setActionInProgress] = useState(false);

	// Fetch bills
	const fetchBills = async () => {
		try {
			setLoading(true);
			const params = new URLSearchParams();
			if (billType) params.append('billType', billType);
			if (status) params.append('status', status);
			params.append('sortBy', sortBy);

			const response = await axios.get(`/api/admin/bills?${params.toString()}`);
			setBills(response.data.data);
			setError('');
		} catch (err: any) {
			setError(err.response?.data?.error || 'Failed to fetch bills');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchBills();
	}, [billType, status, sortBy]);

	// Get bill detail
	const getBillDetail = async (billId: string) => {
		try {
			const response = await axios.get(`/api/admin/bills/${billId}`);
			setSelectedBill(response.data.data);
			setShowDetail(true);
		} catch (err: any) {
			setError(err.response?.data?.error || 'Failed to fetch bill details');
		}
	};

	// Print bill
	const handlePrint = async (billId: string) => {
		try {
			setActionInProgress(true);
			await axios.patch(`/api/admin/bills/${billId}`, { action: 'print' });
			await fetchBills();
			alert('Bill printed successfully');
		} catch (err: any) {
			alert(err.response?.data?.error || 'Failed to print bill');
		} finally {
			setActionInProgress(false);
		}
	};

	// Cancel bill
	const handleCancel = async (billId: string) => {
		const reason = prompt('Enter cancellation reason:');
		if (!reason) return;

		try {
			setActionInProgress(true);
			await axios.patch(`/api/admin/bills/${billId}`, { action: 'cancel', reason });
			await fetchBills();
			alert('Bill cancelled successfully');
			setShowDetail(false);
		} catch (err: any) {
			alert(err.response?.data?.error || 'Failed to cancel bill');
		} finally {
			setActionInProgress(false);
		}
	};

	// Regenerate bill
	const handleRegenerate = async (billId: string) => {
		if (!confirm('Create a new bill for this order? Old bill will be archived.')) return;

		try {
			setActionInProgress(true);
			await axios.patch(`/api/admin/bills/${billId}`, { action: 'regenerate' });
			await fetchBills();
			alert('Bill regenerated successfully');
			setShowDetail(false);
		} catch (err: any) {
			alert(err.response?.data?.error || 'Failed to regenerate bill');
		} finally {
			setActionInProgress(false);
		}
	};

	// Create bill
	const handleCreateBill = async () => {
		if (!createFormData.orderId || !createFormData.paymentId) {
			alert('Please fill in all required fields');
			return;
		}

		try {
			setActionInProgress(true);
			await axios.post('/api/admin/bills', createFormData);
			await fetchBills();
			setShowCreateModal(false);
			setCreateFormData({ orderId: '', paymentId: '', notes: '' });
			alert('Bill created successfully');
		} catch (err: any) {
			alert(err.response?.data?.error || 'Failed to create bill');
		} finally {
			setActionInProgress(false);
		}
	};

	// Edit bill
	const handleEditBill = async () => {
		if (!selectedBill) return;

		try {
			setActionInProgress(true);
			await axios.patch(`/api/admin/bills/${selectedBill._id}`, {
				amountToCollect: selectedBill.billType === 'COD' ? editFormData.amount : undefined,
				amountPaid: selectedBill.billType === 'PAID' ? editFormData.amount : undefined,
				notes: editFormData.notes,
			});
			await fetchBills();
			setShowEditModal(false);
			alert('Bill updated successfully');
		} catch (err: any) {
			alert(err.response?.data?.error || 'Failed to update bill');
		} finally {
			setActionInProgress(false);
		}
	};

	// Delete bill
	const handleDeleteBill = async (billId: string) => {
		if (!confirm('Are you sure? This action cannot be undone.')) return;

		try {
			setActionInProgress(true);
			await axios.delete(`/api/admin/bills/${billId}`);
			await fetchBills();
			alert('Bill deleted successfully');
			setShowDetail(false);
		} catch (err: any) {
			alert(err.response?.data?.error || 'Failed to delete bill');
		} finally {
			setActionInProgress(false);
		}
	};

	const columns = [
		{
			key: 'orderSnapshot',
			label: 'Order',
			width: '15%',
			render: (val: any) => <strong>{val.orderNumber}</strong>,
		},
		{
			key: 'customerSnapshot',
			label: 'Customer',
			width: '20%',
			render: (val: any) => <div>{val.name}</div>,
		},
		{
			key: 'billType',
			label: 'Type',
			width: '10%',
			render: (val: string) => (
				<span className={styles[`badge${val}`]}>
					{val}
				</span>
			),
		},
		{
			key: 'amountToCollect',
			label: 'Amount',
			width: '12%',
			render: (_: any, row: Bill) => {
				const amount = row.billType === 'COD' ? row.amountToCollect : row.amountPaid;
				return <strong>₹{amount.toFixed(2)}</strong>;
			},
		},
		{
			key: 'status',
			label: 'Status',
			width: '12%',
			render: (val: string) => (
				<span className={styles[`status${val}`]}>
					{val === 'active' ? '✓ Active' : '✕ Cancelled'}
				</span>
			),
		},
		{
			key: 'printCount',
			label: 'Prints',
			width: '10%',
			render: (val: number) => <span>{val}x</span>,
		},
		{
			key: 'createdAt',
			label: 'Created',
			width: '13%',
			render: (val: string) => new Date(val).toLocaleDateString(),
		},
	];

	return (
		<div className={styles.container}>
			<PageHeader
				title="Billing Management"
				subtitle="Create, manage, and track customer bills"
				icon={<DocumentTextIcon />}
				actions={
					<button
						onClick={() => setShowCreateModal(true)}
						className={buttonStyles.primaryBtn}
					>
						+ Create Bill
					</button>
				}
			/>

			{error && <div className={styles.errorBox}>{error}</div>}

			<Card>
				<div className={styles.filterSection}>
					<div className={styles.filterGroup}>
						<label>Bill Type</label>
						<select
							value={billType}
							onChange={(e) => setBillType(e.target.value as any)}
							className={formStyles.select}
						>
							<option value="">All Types</option>
							<option value="COD">COD</option>
							<option value="PAID">PAID</option>
						</select>
					</div>

					<div className={styles.filterGroup}>
						<label>Status</label>
						<select
							value={status}
							onChange={(e) => setStatus(e.target.value as any)}
							className={formStyles.select}
						>
							<option value="">All Status</option>
							<option value="active">Active</option>
							<option value="cancelled">Cancelled</option>
						</select>
					</div>

					<div className={styles.filterGroup}>
						<label>Sort By</label>
						<select
							value={sortBy}
							onChange={(e) => setSortBy(e.target.value as any)}
							className={formStyles.select}
						>
							<option value="createdAt">Date (Newest)</option>
							<option value="billType">Type</option>
							<option value="amountToCollect">Amount</option>
						</select>
					</div>
				</div>
			</Card>

			<DataTable
				columns={columns}
				data={bills}
				loading={loading}
				emptyMessage="No bills found"
				actions={(row: Bill) => (
					<div className={styles.actionButtons}>
						<button
							onClick={() => getBillDetail(row._id)}
							className={`${buttonStyles.ghostBtn} ${styles.small}`}
							title="View details"
						>
							View
						</button>
						{row.status === 'active' && (
							<button
								onClick={() => handlePrint(row._id)}
								className={`${buttonStyles.ghostBtn} ${styles.small}`}
								title="Print bill"
								disabled={actionInProgress}
							>
								<PrinterIcon />
							</button>
						)}
					</div>
				)}
			/>

			{/* Bill Detail Modal */}
			<Modal
				isOpen={showDetail}
				onClose={() => setShowDetail(false)}
				title="Bill Details"
				subtitle={selectedBill ? `Order #${selectedBill.orderSnapshot.orderNumber}` : ''}
				size="md"
				footer={
					selectedBill && (
						<div className={styles.modalActions}>
							{selectedBill.status === 'active' && (
								<>
									<button
										onClick={() => handlePrint(selectedBill._id)}
										className={buttonStyles.primaryBtn}
										disabled={actionInProgress}
									>
										<PrinterIcon className={styles.icon} /> Print
									</button>
									<button
										onClick={() => {
											setEditFormData({
												amount:
													selectedBill.billType === 'COD'
														? selectedBill.amountToCollect
														: selectedBill.amountPaid,
												notes: selectedBill.notes || '',
											});
											setShowEditModal(true);
										}}
										className={buttonStyles.secondaryBtn}
									>
										<PencilIcon className={styles.icon} /> Edit
									</button>
									<button
										onClick={() => handleRegenerate(selectedBill._id)}
										className={buttonStyles.secondaryBtn}
										disabled={actionInProgress}
									>
										Regenerate
									</button>
									<button
										onClick={() => handleCancel(selectedBill._id)}
										className={buttonStyles.dangerBtn}
										disabled={actionInProgress}
									>
										Cancel
									</button>
								</>
							)}
							<button
								onClick={() => handleDeleteBill(selectedBill._id)}
								className={buttonStyles.dangerBtn}
								disabled={actionInProgress}
							>
								<TrashIcon className={styles.icon} /> Delete
							</button>
						</div>
					)
				}
			>
				{selectedBill && (
					<div className={formStyles.formSection}>
						<div className={styles.detailGrid}>
							<div>
								<p className={styles.detailLabel}>Order Number</p>
								<p className={styles.detailValue}>{selectedBill.orderSnapshot.orderNumber}</p>
							</div>
							<div>
								<p className={styles.detailLabel}>Customer</p>
								<p className={styles.detailValue}>{selectedBill.customerSnapshot.name}</p>
							</div>
							<div>
								<p className={styles.detailLabel}>Phone</p>
								<p className={styles.detailValue}>{selectedBill.customerSnapshot.phone}</p>
							</div>
							<div>
								<p className={styles.detailLabel}>Bill Type</p>
								<p className={styles.detailValue}>
									<span className={styles[`badge${selectedBill.billType}`]}>
										{selectedBill.billType}
									</span>
								</p>
							</div>
							<div>
								<p className={styles.detailLabel}>Amount</p>
								<p className={styles.detailValue}>
									₹{(selectedBill.billType === 'COD'
										? selectedBill.amountToCollect
										: selectedBill.amountPaid
									).toFixed(2)}
								</p>
							</div>
							<div>
								<p className={styles.detailLabel}>Status</p>
								<p className={styles.detailValue}>
									<span className={styles[`status${selectedBill.status}`]}>
										{selectedBill.status === 'active' ? '✓ Active' : '✕ Cancelled'}
									</span>
								</p>
							</div>
							<div>
								<p className={styles.detailLabel}>Print Count</p>
								<p className={styles.detailValue}>{selectedBill.printCount}x</p>
							</div>
							<div>
								<p className={styles.detailLabel}>Created</p>
								<p className={styles.detailValue}>
									{new Date(selectedBill.createdAt).toLocaleString()}
								</p>
							</div>
						</div>
						{selectedBill.notes && (
							<div className={styles.notesSection}>
								<p className={styles.detailLabel}>Notes</p>
								<p className={styles.detailValue}>{selectedBill.notes}</p>
							</div>
						)}
					</div>
				)}
			</Modal>

			{/* Create Bill Modal */}
			<Modal
				isOpen={showCreateModal}
				onClose={() => setShowCreateModal(false)}
				title="Create New Bill"
				subtitle="Create a bill for an order"
				size="md"
				footer={
					<button
						onClick={handleCreateBill}
						className={buttonStyles.primaryBtn}
						disabled={actionInProgress}
					>
						Create Bill
					</button>
				}
			>
				<div className={formStyles.formSection}>
					<div className={formStyles.formGroup}>
						<label>Order ID <span className={formStyles.required}>*</span></label>
						<input
							type="text"
							placeholder="Enter order ID"
							value={createFormData.orderId}
							onChange={(e) =>
								setCreateFormData({ ...createFormData, orderId: e.target.value })
							}
							className={formStyles.input}
						/>
					</div>

					<div className={formStyles.formGroup}>
						<label>Payment ID <span className={formStyles.required}>*</span></label>
						<input
							type="text"
							placeholder="Enter payment ID"
							value={createFormData.paymentId}
							onChange={(e) =>
								setCreateFormData({ ...createFormData, paymentId: e.target.value })
							}
							className={formStyles.input}
						/>
					</div>

					<div className={formStyles.formGroup}>
						<label>Notes (Optional)</label>
						<textarea
							placeholder="Add any additional notes..."
							value={createFormData.notes}
							onChange={(e) =>
								setCreateFormData({ ...createFormData, notes: e.target.value })
							}
							className={formStyles.textarea}
						/>
					</div>
				</div>
			</Modal>

			{/* Edit Bill Modal */}
			<Modal
				isOpen={showEditModal}
				onClose={() => setShowEditModal(false)}
				title="Edit Bill"
				subtitle={selectedBill ? `Order #${selectedBill.orderSnapshot.orderNumber}` : ''}
				size="md"
				footer={
					<button
						onClick={handleEditBill}
						className={buttonStyles.primaryBtn}
						disabled={actionInProgress}
					>
						Save Changes
					</button>
				}
			>
				<div className={formStyles.formSection}>
					<div className={formStyles.formGroup}>
						<label>Amount</label>
						<input
							type="number"
							value={editFormData.amount}
							onChange={(e) =>
								setEditFormData({
									...editFormData,
									amount: parseFloat(e.target.value),
								})
							}
							className={formStyles.input}
						/>
					</div>

					<div className={formStyles.formGroup}>
						<label>Notes</label>
						<textarea
							value={editFormData.notes}
							onChange={(e) =>
								setEditFormData({ ...editFormData, notes: e.target.value })
							}
							className={formStyles.textarea}
						/>
					</div>
				</div>
			</Modal>
		</div>
	);
}
