'use client';

import { useEffect, useState, useRef } from 'react';
import { DocumentTextIcon, PrinterIcon, TrashIcon, PencilIcon, PlusIcon, MinusIcon } from '@heroicons/react/24/outline';
import JsBarcode from 'jsbarcode';
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
	billId: string;
	orderSnapshot: { orderNumber: string };
	customerSnapshot: { name: string; phone: string };
	billType: 'COD' | 'PAID';
	amountToCollect: number;
	amountPaid: number;
	status: 'active' | 'cancelled';
	printCount: number;
	createdAt: string;
	items?: Array<{ description: string; quantity: number; rate: number }>;
	paymentStatus?: 'full_paid' | 'advance_payment' | 'pending_payment';
	rate?: number;
	advancePaid?: number;
	balanceAmount?: number;
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
		items: [{ description: '', quantity: 1, rate: 0 }],
		paymentStatus: '' as 'full_paid' | 'advance_payment' | 'pending_payment' | '',
		rate: 0,
		advancePaid: 0,
		balanceAmount: 0,
	});

	const [editFormData, setEditFormData] = useState({
		amount: 0,
		notes: '',
	});

	const [actionInProgress, setActionInProgress] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

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
	const handlePrint = async (billId: string, directBill?: Bill) => {
		try {
			setActionInProgress(true);
			await axios.patch(`/api/admin/bills/${billId}`, { action: 'print' });
			await fetchBills();
			
			// Open print preview
			const bill = directBill || bills.find(b => b._id === billId) || selectedBill;
			if (bill) {
				const printWindow = window.open('', '_blank');
				if (printWindow) {
					const itemsHtml = (bill.items || []).map(item => `
						<tr>
							<td>${item.description}</td>
							<td style="text-align: center;">${item.quantity || 1}</td>
							<td style="text-align: right;">₹${(item.rate || 0).toFixed(2)}</td>
							<td style="text-align: right;">₹${((item.quantity || 1) * (item.rate || 0)).toFixed(2)}</td>
						</tr>
					`).join('') || '<tr><td colspan="4">No items listed</td></tr>';
					const barcodeId = `barcode-${bill.billId}`;
					
					printWindow.document.write(`
						<html>
							<head>
								<title>Print Bill - ${bill.billId}</title>
								<style>
									body { font-family: sans-serif; padding: 20px; }
									.bill-header { text-align: center; margin-bottom: 20px; }
									.bill-details { margin-bottom: 20px; }
									.barcode-container { text-align: center; margin-top: 30px; }
									table { width: 100%; border-collapse: collapse; }
									th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
									.total-section { margin-top: 20px; text-align: right; }
									@media print {
										.no-print { display: none; }
									}
								</style>
							</head>
							<body>
								<div class="bill-header">
									<h1>ZOLL & METÉR</h1>
									<p>Bill ID: ${bill.billId}</p>
								</div>
								<div class="bill-details">
									<p><strong>Customer:</strong> ${bill.customerSnapshot.name}</p>
									<p><strong>Phone:</strong> ${bill.customerSnapshot.phone}</p>
									<p><strong>Date:</strong> ${new Date(bill.createdAt).toLocaleDateString()}</p>
								</div>
								<h3>Items</h3>
								<table style="margin-bottom: 20px;">
									<thead>
										<tr>
											<th>Description</th>
											<th style="text-align: center;">Qty</th>
											<th style="text-align: right;">Rate</th>
											<th style="text-align: right;">Total</th>
										</tr>
									</thead>
									<tbody>
										${itemsHtml}
									</tbody>
								</table>
								<div class="total-section">
									<p><strong>Rate:</strong> ₹${(bill.rate || 0).toFixed(2)}</p>
									${bill.paymentStatus === 'advance_payment' ? `
										<p><strong>Advance Paid:</strong> ₹${(bill.advancePaid || 0).toFixed(2)}</p>
										<p><strong>Balance:</strong> ₹${(bill.balanceAmount || 0).toFixed(2)}</p>
									` : ''}
									<p><strong>Status:</strong> ${bill.paymentStatus?.replace('_', ' ').toUpperCase()}</p>
								</div>
								<div class="barcode-container">
									<svg id="${barcodeId}"></svg>
								</div>
								<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
								<script>
									window.onload = function() {
										JsBarcode("#${barcodeId}", "${bill.billId}", {
											format: "CODE128",
											lineColor: "#000",
											width: 2,
											height: 40,
											displayValue: true
										});
										setTimeout(() => { window.print(); }, 500);
									};
								</script>
							</body>
						</html>
					`);
					printWindow.document.close();
				}
			}
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
	const handleCreateBill = async (shouldPrint = false) => {
		if (!createFormData.orderId || !createFormData.paymentStatus) {
			alert('Please fill in all required fields');
			return;
		}

		try {
			setActionInProgress(true);
			const response = await axios.post('/api/admin/bills', {
				...createFormData,
				paymentId: createFormData.paymentId || 'manual'
			});
			const newBill = response.data.data;
			
			await fetchBills();
			setShowCreateModal(false);
			
			if (shouldPrint && newBill) {
				handlePrint(newBill._id, newBill);
			}
			
			setCreateFormData({ 
				orderId: '', 
				paymentId: '', 
				notes: '', 
				items: [{ description: '', quantity: 1, rate: 0 }],
				paymentStatus: '',
				rate: 0,
				advancePaid: 0,
				balanceAmount: 0
			});
			if (!shouldPrint) alert('Bill created successfully');
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
			key: 'billId',
			label: 'Bill ID',
			width: '15%',
			render: (val: string) => <span className={styles.billId}>{val}</span>,
		},
		{
			key: 'orderSnapshot',
			label: 'Order',
			width: '12%',
			render: (val: any) => <strong>{val.orderNumber}</strong>,
		},
		{
			key: 'customerSnapshot',
			label: 'Customer',
			width: '18%',
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
					<div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
						<button
							onClick={async () => {
								try {
									const res = await window.fetch('/api/admin/bills/export');
									const blob = await res.blob();
									const url = window.URL.createObjectURL(blob);
									const a = document.createElement('a');
									a.href = url;
									a.download = `bills-${new Date().toISOString().split('T')[0]}.csv`;
									a.click();
								} catch { alert('Export failed'); }
							}}
							className={buttonStyles.secondaryBtn}
						>
							📥 Export CSV
						</button>
						<button
							onClick={() => fileInputRef.current?.click()}
							className={buttonStyles.secondaryBtn}
						>
							📤 Import CSV
						</button>
						<input type="file" ref={fileInputRef} accept=".csv" style={{ display: 'none' }} onChange={async (e) => {
							const file = e.target.files?.[0];
							if (!file) return;
							const fd = new FormData(); fd.append('file', file);
							try {
								const res = await window.fetch('/api/admin/bills/import', { method: 'POST', body: fd });
								const result = await res.json();
								alert(result.success ? `Import: ${result.created} created` : result.error);
								if (result.success) fetchBills();
							} catch { alert('Import failed'); }
							if (fileInputRef.current) fileInputRef.current.value = '';
						}} />
						<button
							onClick={() => {
								const fetchNextId = async () => {
									try {
										const res = await axios.get('/api/admin/bills?nextId=true');
										return res.data.nextId;
									} catch {
										const today = new Date();
										return `znm-${today.getDate().toString().padStart(2, '0')}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getFullYear()}001`;
									}
								};

								fetchNextId().then(nextId => {
									setCreateFormData({
										orderId: nextId,
										paymentId: '',
										notes: '',
										items: [{ description: '', quantity: 1, rate: 0 }],
										paymentStatus: '',
										rate: 0,
										advancePaid: 0,
										balanceAmount: 0,
									});
									setShowCreateModal(true);
								});
							}}
							className={buttonStyles.primaryBtn}
						>
							+ Create Bill
						</button>
					</div>
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
								<p className={styles.detailLabel}>Bill ID</p>
								<p className={styles.detailValue}>{selectedBill.billId}</p>
							</div>
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
								<p className={styles.detailLabel}>Payment Status</p>
								<p className={styles.detailValue}>
									<span className={styles[`badge${selectedBill.paymentStatus}`]}>
										{selectedBill.paymentStatus?.replace('_', ' ').toUpperCase()}
									</span>
								</p>
							</div>
							<div>
								<p className={styles.detailLabel}>Rate</p>
								<p className={styles.detailValue}>₹{(selectedBill.rate || 0).toFixed(2)}</p>
							</div>
							{selectedBill.paymentStatus === 'advance_payment' && (
								<>
									<div>
										<p className={styles.detailLabel}>Advance Paid</p>
										<p className={styles.detailValue}>₹{(selectedBill.advancePaid || 0).toFixed(2)}</p>
									</div>
									<div>
										<p className={styles.detailLabel}>Balance</p>
										<p className={styles.detailValue}>₹{(selectedBill.balanceAmount || 0).toFixed(2)}</p>
									</div>
								</>
							)}
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
						{selectedBill.items && selectedBill.items.length > 0 && (
							<div className={styles.itemsSection}>
								<p className={styles.detailLabel}>Items</p>
								<div className={styles.itemGrid}>
									{selectedBill.items.map((item, idx) => (
										<div key={idx} className={styles.itemRow}>
											<span className={styles.detailValue}>{item.description} (x{item.quantity || 1})</span>
											<span className={styles.detailValue}>₹{((item.quantity || 1) * (item.rate || 0)).toFixed(2)}</span>
										</div>
									))}
								</div>
							</div>
						)}
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
					<div style={{ display: 'flex', gap: '12px' }}>
						<button
							onClick={() => handleCreateBill(false)}
							className={buttonStyles.secondaryBtn}
							disabled={actionInProgress}
						>
							Save Only
						</button>
						<button
							onClick={() => handleCreateBill(true)}
							className={buttonStyles.primaryBtn}
							disabled={actionInProgress}
							style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
						>
							<PrinterIcon style={{ width: '18px' }} /> Create & Print
						</button>
					</div>
				}
			>
				<div className={formStyles.formSection}>
					<div className={formStyles.formGroup}>
						<label>Bill/Order Number <span className={formStyles.required}>*</span></label>
						<input
							type="text"
							placeholder="znm-DDMMYYYYXXX"
							value={createFormData.orderId}
							onChange={(e) =>
								setCreateFormData({ ...createFormData, orderId: e.target.value })
							}
							className={formStyles.input}
						/>
					</div>

					<div className={formStyles.formGroup}>
						<label>Items Description, Quantity & Rate</label>
						{createFormData.items.map((item, index) => (
							<div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
								<div style={{ flex: 3 }}>
									<input
										type="text"
										placeholder={index === 0 ? "Shirt" : "Add more detail..."}
										value={item.description}
										onChange={(e) => {
											const newItems = [...createFormData.items];
											newItems[index].description = e.target.value;
											setCreateFormData({ ...createFormData, items: newItems });
										}}
										className={formStyles.input}
									/>
								</div>
								<div style={{ flex: 1 }}>
									<input
										type="number"
										placeholder="Qty"
										value={item.quantity || ''}
										onChange={(e) => {
											const qty = parseInt(e.target.value) || 0;
											const newItems = [...createFormData.items];
											newItems[index].quantity = qty;
											
											// Auto-calculate total rate
											const totalRate = newItems.reduce((sum, i) => sum + ((i.quantity || 1) * (i.rate || 0)), 0);
											
											setCreateFormData({ 
												...createFormData, 
												items: newItems,
												rate: totalRate,
												balanceAmount: totalRate - (createFormData.advancePaid || 0)
											});
										}}
										className={formStyles.input}
									/>
								</div>
								<div style={{ flex: 1.5 }}>
									<input
										type="number"
										placeholder="Rate"
										value={item.rate || ''}
										onChange={(e) => {
											const val = parseFloat(e.target.value) || 0;
											const newItems = [...createFormData.items];
											newItems[index].rate = val;
											
											// Auto-calculate total rate
											const totalRate = newItems.reduce((sum, i) => sum + ((i.quantity || 1) * (i.rate || 0)), 0);
											
											setCreateFormData({ 
												...createFormData, 
												items: newItems,
												rate: totalRate,
												balanceAmount: totalRate - (createFormData.advancePaid || 0)
											});
										}}
										className={formStyles.input}
									/>
								</div>
								{index > 0 && (
									<button 
										onClick={() => {
											const newItems = createFormData.items.filter((_, i) => i !== index);
											const totalRate = newItems.reduce((sum, i) => sum + ((i.quantity || 1) * (i.rate || 0)), 0);
											setCreateFormData({ 
												...createFormData, 
												items: newItems,
												rate: totalRate,
												balanceAmount: totalRate - (createFormData.advancePaid || 0)
											});
										}}
										className={buttonStyles.dangerBtn}
										style={{ padding: '8px' }}
									>
										<MinusIcon style={{ width: '16px' }} />
									</button>
								)}
							</div>
						))}
						<button 
							onClick={() => setCreateFormData({ 
								...createFormData, 
								items: [...createFormData.items, { description: '', quantity: 1, rate: 0 }] 
							})}
							className={buttonStyles.ghostBtn}
							style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px' }}
						>
							<PlusIcon style={{ width: '16px' }} /> Add more
						</button>
					</div>

					<div className={formStyles.formGroup}>
						<label>Payment Status <span className={formStyles.required}>*</span></label>
						<select
							value={createFormData.paymentStatus}
							onChange={(e) =>
								setCreateFormData({ ...createFormData, paymentStatus: e.target.value as any })
							}
							className={formStyles.select}
						>
							<option value="">Please select</option>
							<option value="full_paid">Full Paid</option>
							<option value="advance_payment">Advance Payment</option>
							<option value="pending_payment">Pending Payment</option>
						</select>
					</div>

					<div className={formStyles.formGroup}>
						<label>Rate</label>
						<input
							type="number"
							placeholder="Enter total rate"
							value={createFormData.rate}
							onChange={(e) => {
								const val = parseFloat(e.target.value) || 0;
								setCreateFormData({ 
									...createFormData, 
									rate: val,
									balanceAmount: val - (createFormData.advancePaid || 0)
								});
							}}
							className={formStyles.input}
						/>
					</div>

					{createFormData.paymentStatus === 'advance_payment' && (
						<>
							<div className={formStyles.formGroup}>
								<label>Advance Paid</label>
								<input
									type="number"
									placeholder="Enter advance amount"
									value={createFormData.advancePaid}
									onChange={(e) => {
										const val = parseFloat(e.target.value) || 0;
										setCreateFormData({ 
											...createFormData, 
											advancePaid: val,
											balanceAmount: createFormData.rate - val
										});
									}}
									className={formStyles.input}
								/>
							</div>
							<div className={formStyles.formGroup}>
								<label>Balance to be Paid</label>
								<input
									type="number"
									value={createFormData.balanceAmount}
									disabled
									className={formStyles.input}
									style={{ backgroundColor: '#f5f5f5' }}
								/>
							</div>
						</>
					)}

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
