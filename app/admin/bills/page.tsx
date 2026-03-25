'use client';

import { useEffect, useState, useRef } from 'react';
import { DocumentTextIcon, PrinterIcon, TrashIcon, PencilIcon, PlusIcon, MinusIcon, EyeIcon, ArchiveBoxIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
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
	customerSnapshot: { name: string; phone: string; phones?: string[]; customerCustomId?: string };
	billType: 'COD' | 'PAID';
	amountToCollect: number;
	amountPaid: number;
	status: 'active' | 'cancelled' | 'completed';
	printCount: number;
	createdAt: string;
	items?: Array<{ description: string; quantity: number; rate: number }>;
	paymentStatus?: 'full_paid' | 'advance_payment' | 'pending_payment';
	rate?: number;
	advancePaid?: number;
	balanceAmount?: number;
	trialDate?: string;
	deliveryDate?: string;
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
	const [search, setSearch] = useState('');

	const [selectedBill, setSelectedBill] = useState<BillDetail | null>(null);
	const [showDetail, setShowDetail] = useState(false);
	const [showCreateModal, setShowCreateModal] = useState(false);
	const [showEditModal, setShowEditModal] = useState(false);
	const [showPayModal, setShowPayModal] = useState(false);
	const [payFormData, setPayFormData] = useState({
		paymentStatus: '' as 'full_paid' | 'advance_payment' | '',
		amountPaid: 0,
	});

	const [createFormData, setCreateFormData] = useState({
		orderId: '',
		paymentId: '',
		customerName: '',
		customerPhone: '',
		customerPhones: [] as string[],
		customerEmail: '',
		customerCustomId: '',
		trialDate: '',
		deliveryDate: '',
		notes: '',
		items: [{ description: '', quantity: 1, rate: 0 }],
		paymentStatus: '' as 'full_paid' | 'advance_payment' | 'pending_payment' | '',
		rate: 0,
		advancePaid: 0,
		balanceAmount: 0,
	});

	const [editFormData, setEditFormData] = useState({
		orderId: '',
		customerName: '',
		customerPhone: '',
		customerPhones: [] as string[],
		customerEmail: '',
		customerCustomId: '',
		trialDate: '',
		deliveryDate: '',
		notes: '',
		items: [{ description: '', quantity: 1, rate: 0 }],
		paymentStatus: '' as 'full_paid' | 'advance_payment' | 'pending_payment' | '',
		rate: 0,
		advancePaid: 0,
		balanceAmount: 0,
	});

	const [statusModal, setStatusModal] = useState<{ 
		title: string; 
		message: string; 
		type: 'success' | 'error' | 'info';
	} | null>(null);

	const showStatus = (title: string, message: string, type: 'success' | 'error' | 'info' = 'success') => {
		setStatusModal({ title, message, type });
	};

	const [confirmAction, setConfirmAction] = useState<{ 
		title: string; 
		message: string; 
		onConfirm: () => void;
	} | null>(null);

	const [promptAction, setPromptAction] = useState<{ 
		title: string; 
		message: string; 
		placeholder: string;
		onConfirm: (value: string) => void;
	} | null>(null);
	const [promptValue, setPromptValue] = useState('');

	const [actionInProgress, setActionInProgress] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	// Fetch bills
	const fetchBills = async () => {
		try {
			setLoading(true);
			const params = new URLSearchParams();
			if (billType) params.append('billType', billType);
			if (status) params.append('status', status);
			if (search) params.append('search', search);
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
	}, [billType, status, sortBy, search]);

	// Auto-generate customer ID based on name initial
	const [customerSuggestions, setCustomerSuggestions] = useState<any[]>([]);
	const [showSuggestions, setShowSuggestions] = useState(false);
	const [lastCheckedInitial, setLastCheckedInitial] = useState('');

	const fetchCustomerSuggestions = async (query: string) => {
		if (query.length < 2) {
			setCustomerSuggestions([]);
			setShowSuggestions(false);
			return;
		}
		try {
			const res = await axios.get(`/api/admin/bills?customerSearchName=${query}`);
			if (res.data.success) {
				setCustomerSuggestions(res.data.suggestions || []);
				setShowSuggestions(true);
			}
		} catch (err) {
			console.error('Search failed', err);
		}
	};

	const selectCustomer = (customer: any) => {
		setCreateFormData({
			...createFormData,
			customerName: customer.name,
			customerPhone: customer.phone,
			customerPhones: customer.phones || [],
			customerEmail: customer.email || '',
			customerCustomId: customer.customerCustomId
		});
		setShowSuggestions(false);
	};

	const updateNextCustomerId = async (name: string) => {
		if (!name) return;
		const initial = name.charAt(0).toUpperCase();
		if (initial === lastCheckedInitial) return;

		try {
			const res = await axios.get(`/api/admin/bills?nextCustomerId=${initial}`);
			if (res.data.success) {
				setCreateFormData(prev => ({
					...prev,
					customerCustomId: res.data.nextId
				}));
				setLastCheckedInitial(initial);
			}
		} catch (err) {
			console.error('Failed to get next customer ID', err);
		}
	};

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
					const itemsHtml = (bill.items && bill.items.length > 0) ? bill.items.map(item => `
						<tr>
							<td>${item.description}</td>
							<td style="text-align: center;">${item.quantity || 1}</td>
							<td style="text-align: right;">₹${(item.rate || 0).toFixed(2)}</td>
							<td style="text-align: right;">₹${((item.quantity || 1) * (item.rate || 0)).toFixed(2)}</td>
						</tr>
					`).join('') : '<tr><td colspan="4">No items listed</td></tr>';

					const calculatedRate = (bill.items && bill.items.length > 0)
						? bill.items.reduce((sum, item) => sum + ((item.quantity || 1) * (item.rate || 0)), 0)
						: (bill.rate || 0);

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
									<img src="/logo/zm-nobg.png" alt="Logo" style="max-height: 80px; margin-bottom: 10px;">
									<h1 style="margin: 0; font-size: 24px;">ZOLL & METÉR</h1>
									<p style="margin: 5px 0; font-size: 14px;">Shop no. 10, Abba Apartment, Jogeshwari West, Mumbai - 400102</p>
									<p style="margin: 5px 0; font-size: 14px;">Farhan: 9769735377 | Faizan: 9820978696 | Shop: 8291943457</p>
									<p style="margin: 5px 0; font-size: 14px;">Timing: 11:00 am to 09:00 pm</p>
									<hr style="border: 0; border-top: 1px solid #eee; margin: 15px 0;">
									<p style="font-weight: bold; font-size: 16px;">Bill ID: ${bill.billId || bill.orderSnapshot?.orderNumber || 'N/A'}</p>
								</div>
								<div class="bill-details">
									<p><strong>Customer:</strong> ${bill.customerSnapshot?.name || 'N/A'} (${bill.customerSnapshot?.customerCustomId || 'N/A'})</p>
									<p><strong>Phone:</strong> ${[bill.customerSnapshot?.phone, ...(bill.customerSnapshot?.phones || [])].filter(Boolean).join(', ')}</p>
									<p><strong>Date:</strong> ${new Date(bill.createdAt).toLocaleDateString()}</p>
									${bill.trialDate ? `<p><strong>Trial Date:</strong> ${new Date(bill.trialDate).toLocaleDateString()}</p>` : ''}
									${bill.deliveryDate ? `<p><strong>Delivery Date:</strong> ${new Date(bill.deliveryDate).toLocaleDateString()}</p>` : ''}
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
									<p><strong>Total Amount:</strong> ₹${calculatedRate.toFixed(2)}</p>
									${bill.paymentStatus === 'advance_payment' ? `
										<p><strong>Advance Paid:</strong> ₹${(bill.advancePaid || 0).toFixed(2)}</p>
										<p><strong>Balance:</strong> ₹${(bill.balanceAmount || 0).toFixed(2)}</p>
									` : ''}
									<p><strong>Payment Status:</strong> ${((bill.paymentStatus as any) || '').replace('_', ' ').toUpperCase() || 'N/A'}</p>
								</div>
								<div class="barcode-container">
									<svg id="${barcodeId}"></svg>
								</div>
								<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
								<script>
									window.onload = function() {
										JsBarcode("#${barcodeId}", "${bill.billId || bill.orderSnapshot?.orderNumber || "BillID"}", {
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
			showStatus('Error', err.response?.data?.error || 'Failed to print bill', 'error');
		} finally {
			setActionInProgress(false);
		}
	};

	const initiateCancel = (billId: string) => {
		setPromptValue('');
		setPromptAction({
			title: 'Cancel Bill',
			message: 'Please enter a reason for cancelling this bill:',
			placeholder: 'Reason for cancellation...',
			onConfirm: (reason) => {
				handleCancel(billId, reason);
				setPromptAction(null);
			}
		});
	};

	const handleCancel = async (billId: string, reason: string) => {
		try {
			setActionInProgress(true);
			await axios.patch(`/api/admin/bills/${billId}`, { action: 'cancel', reason });
			await fetchBills();
			showStatus('Success', 'Bill cancelled successfully');
			setShowDetail(false);
		} catch (err: any) {
			showStatus('Error', err.response?.data?.error || 'Failed to cancel bill', 'error');
		} finally {
			setActionInProgress(false);
		}
	};

	const initiateRegenerate = (billId: string) => {
		setConfirmAction({
			title: 'Regenerate Bill',
			message: 'Are you sure you want to create a new bill for this order? The old bill will be archived.',
			onConfirm: () => {
				handleRegenerate(billId);
				setConfirmAction(null);
			}
		});
	};

	const handleRegenerate = async (billId: string) => {
		try {
			setActionInProgress(true);
			await axios.patch(`/api/admin/bills/${billId}`, { action: 'regenerate' });
			await fetchBills();
			showStatus('Success', 'Bill regenerated successfully');
			setShowDetail(false);
		} catch (err: any) {
			showStatus('Error', err.response?.data?.error || 'Failed to regenerate bill', 'error');
		} finally {
			setActionInProgress(false);
		}
	};

	// Create bill
	const handleCreateBill = async (shouldPrint = false) => {
		if (!createFormData.orderId || !createFormData.paymentStatus) {
			showStatus('Warning', 'Please fill in all required fields', 'info');
			return;
		}

		try {
			setActionInProgress(true);
			const response = await axios.post('/api/admin/bills', {
				customerName: createFormData.customerName,
				customerPhone: createFormData.customerPhone,
				customerPhones: createFormData.customerPhones,
				customerEmail: createFormData.customerEmail,
				customerCustomId: createFormData.customerCustomId,
				trialDate: createFormData.trialDate,
				deliveryDate: createFormData.deliveryDate,
				items: createFormData.items,
				paymentStatus: createFormData.paymentStatus,
				rate: createFormData.rate,
				advancePaid: createFormData.advancePaid,
				balanceAmount: createFormData.balanceAmount,
				paymentId: createFormData.paymentId || 'manual',
				orderId: createFormData.orderId
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
				customerName: '',
				customerPhone: '',
				customerPhones: [],
				customerEmail: '',
				customerCustomId: '',
				trialDate: '',
				deliveryDate: '',
				notes: '', 
				items: [{ description: '', quantity: 1, rate: 0 }],
				paymentStatus: '' as any,
				rate: 0,
				advancePaid: 0,
				balanceAmount: 0
			});
			if (!shouldPrint) showStatus('Success', 'Bill created successfully');
		} catch (err: any) {
			showStatus('Error', err.response?.data?.error || 'Failed to create bill', 'error');
		} finally {
			setActionInProgress(false);
		}
	};

	// Pay bill
	const handlePayBill = async () => {
		if (!selectedBill || !payFormData.paymentStatus) return;

		try {
			setActionInProgress(true);
			await axios.patch(`/api/admin/bills/${selectedBill._id}`, {
				action: 'edit',
				paymentStatus: payFormData.paymentStatus,
				amountPaid: payFormData.amountPaid,
			});
			await fetchBills();
			setShowPayModal(false);
			setShowDetail(false);
			showStatus('Success', 'Payment updated successfully');
		} catch (err: any) {
			showStatus('Error', err.response?.data?.error || 'Failed to update payment', 'error');
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
				notes: editFormData.notes,
				customerName: editFormData.customerName,
				customerPhone: editFormData.customerPhone,
				customerPhones: editFormData.customerPhones,
				customerEmail: editFormData.customerEmail,
				customerCustomId: editFormData.customerCustomId,
				trialDate: editFormData.trialDate,
				deliveryDate: editFormData.deliveryDate,
				items: editFormData.items,
				paymentStatus: editFormData.paymentStatus,
				rate: editFormData.rate,
				advancePaid: editFormData.advancePaid,
				balanceAmount: editFormData.balanceAmount,
			});
			await fetchBills();
			setShowEditModal(false);
			showStatus('Success', 'Bill updated successfully');
		} catch (err: any) {
			showStatus('Error', err.response?.data?.error || 'Failed to update bill', 'error');
		} finally {
			setActionInProgress(false);
		}
	};

	const initiateDeleteBill = (billId: string) => {
		setConfirmAction({
			title: 'Delete Bill',
			message: 'Are you sure? This action cannot be undone and will permanently remove this record.',
			onConfirm: () => {
				handleDeleteBill(billId);
				setConfirmAction(null);
			}
		});
	};

	const handleDeleteBill = async (billId: string) => {
		try {
			setActionInProgress(true);
			await axios.delete(`/api/admin/bills/${billId}`);
			await fetchBills();
			showStatus('Success', 'Bill deleted successfully');
			setShowDetail(false);
		} catch (err: any) {
			showStatus('Error', err.response?.data?.error || 'Failed to delete bill', 'error');
		} finally {
			setActionInProgress(false);
		}
	};

	const columns = [
		{
			key: 'billId',
			label: 'Bill ID',
			width: '20%',
			render: (val: string) => <span className={styles.billId}>{val}</span>,
		},
		{
			key: 'customerSnapshot',
			label: 'Customer',
			width: '20%',
			render: (val: any) => <div>{val.name}</div>,
		},
		{
			key: 'customerSnapshot_id',
			label: 'Cust ID',
			width: '10%',
			render: (_: any, row: Bill) => <div>{row.customerSnapshot.customerCustomId || 'N/A'}</div>,
		},
		{
			key: 'billType',
			label: 'Type',
			width: '10%',
			render: (val: string) => (
				<span className={styles[`badge${val}`]}>
					{val === 'COD' ? 'UNPAID' : 'PAID'}
				</span>
			),
		},
		{
			key: 'balanceAmount',
			label: 'Balance',
			width: '12%',
			render: (_: any, row: Bill) => {
				const balance = row.balanceAmount ?? row.amountToCollect ?? 0;
				if (balance <= 0) {
					return <CheckCircleIcon className={styles.icon} style={{ color: '#4caf50', width: '20px', height: '20px' }} />;
				}
				return <strong>₹{balance.toFixed(2)}</strong>;
			},
		},
		{
			key: 'status',
			label: 'Status',
			width: '12%',
			render: (val: string, row: Bill) => {
				const balance = row.balanceAmount ?? row.amountToCollect ?? 0;
				if (balance <= 0 && row.status !== 'cancelled') {
					return (
						<span className={styles.statuscompleted}>
							✓ Completed
						</span>
					);
				}
				if (val === 'active' || (val === 'completed' && balance > 0)) {
					// Fallback if status is completed but balance is somehow > 0
					return (
						<span className={styles.statusactive}>
							● Active
						</span>
					);
				}
				if (val === 'completed' || (balance <= 0 && row.status !== 'cancelled')) {
					return (
						<span className={styles.statuscompleted}>
							✓ Completed
						</span>
					);
				}
				return (
					<span className={styles.statuscancelled}>
						✕ Cancelled
					</span>
				);
			},
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
								} catch { showStatus('Error', 'Export failed', 'error'); }
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
								showStatus('Import Result', result.success ? `Import: ${result.created} created` : result.error, result.success ? 'success' : 'error');
								if (result.success) fetchBills();
							} catch { showStatus('Error', 'Import failed', 'error'); }
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
										customerName: '',
										customerPhone: '',
										customerPhones: [],
										customerCustomId: '',
										trialDate: '',
										deliveryDate: '',
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
					<div className={styles.filterGroup} style={{ gridColumn: 'span 2' }}>
						<label>Search Bills</label>
						<input
							type="text"
							placeholder="Search by ID, Customer Name, or Custom ID..."
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							className={formStyles.input}
						/>
					</div>

					<div className={styles.filterGroup}>
						<label>Bill Type</label>
						<select
							value={billType}
							onChange={(e) => setBillType(e.target.value as any)}
							className={formStyles.select}
						>
							<option value="">All Types</option>
							<option value="COD">UNPAID</option>
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
							<option value="completed">Completed</option>
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
							<EyeIcon style={{ width: '18px' }} />
						</button>
						{(row.status === 'active' || row.status === 'cancelled' || row.status === 'completed') && (
							<button
								onClick={() => handlePrint(row._id)}
								className={`${buttonStyles.ghostBtn} ${styles.small}`}
								title="Print bill"
							>
								<PrinterIcon style={{ width: '18px' }} />
							</button>
						)}
						{row.status === 'active' && (
							<button
								onClick={() => initiateCancel(row._id)}
								className={`${buttonStyles.ghostBtn} ${styles.small}`}
								title="Archive/Cancel"
							>
								<ArchiveBoxIcon style={{ width: '18px' }} />
							</button>
						)}
						<button
							onClick={() => initiateDeleteBill(row._id)}
							className={`${buttonStyles.ghostBtn} ${styles.small} ${styles.danger}`}
							title="Delete bill"
						>
							<TrashIcon style={{ width: '18px', color: '#ff5252' }} />
						</button>
					</div>
				)}
			/>

			{/* Bill Detail Modal */}
			<Modal
				isOpen={showDetail}
				onClose={() => setShowDetail(false)}
				title="Bill Details"
				subtitle={selectedBill ? `Bill #${selectedBill.billId || selectedBill.orderSnapshot?.orderNumber}` : ''}
				size="md"
				footer={
					selectedBill && (
						<div className={styles.modalActions}>
							{(selectedBill.status === 'active' || selectedBill.status === 'cancelled' || selectedBill.status === 'completed') && (
								<button
									onClick={() => handlePrint(selectedBill._id)}
									className={buttonStyles.primaryBtn}
									disabled={actionInProgress}
								>
									<PrinterIcon className={styles.icon} /> Print
								</button>
							)}
							{selectedBill.status === 'active' && (
								<>
									<button
										onClick={() => {
											setEditFormData({
												orderId: selectedBill.billId || '',
												customerName: selectedBill.customerSnapshot.name || '',
												customerPhone: selectedBill.customerSnapshot.phone || '',
												customerPhones: selectedBill.customerSnapshot.phones || [],
												customerCustomId: selectedBill.customerSnapshot.customerCustomId || '',
												trialDate: selectedBill.trialDate ? new Date(selectedBill.trialDate).toISOString().split('T')[0] : '',
												deliveryDate: selectedBill.deliveryDate ? new Date(selectedBill.deliveryDate).toISOString().split('T')[0] : '',
												notes: selectedBill.notes || '',
												items: selectedBill.items && selectedBill.items.length > 0 ? [...selectedBill.items] : [{ description: '', quantity: 1, rate: 0 }],
												paymentStatus: selectedBill.paymentStatus || '',
												rate: selectedBill.rate || 0,
												advancePaid: selectedBill.advancePaid || 0,
												balanceAmount: selectedBill.balanceAmount || 0,
											});
											setShowEditModal(true);
										}}
										className={buttonStyles.secondaryBtn}
									>
										<PencilIcon className={styles.icon} /> Edit
									</button>
									<button
										onClick={() => {
											setPayFormData({
												paymentStatus: selectedBill.paymentStatus === 'pending_payment' ? '' : selectedBill.paymentStatus as any,
												amountPaid: 0, // Reset for ADDITIONAL payment entering
											});
											setShowPayModal(true);
										}}
										className={buttonStyles.primaryBtn}
										disabled={actionInProgress}
										style={{ backgroundColor: '#2e7d32', color: 'white' }}
									>
										Pay
									</button>
									<button
										onClick={() => initiateCancel(selectedBill._id)}
										className={buttonStyles.dangerBtn}
										disabled={actionInProgress}
									>
										Cancel
									</button>
								</>
							)}
							<button
								onClick={() => initiateDeleteBill(selectedBill._id)}
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
								<p className={styles.detailValue}>{selectedBill.billId || selectedBill.orderSnapshot?.orderNumber}</p>
							</div>
							<div>
								<p className={styles.detailLabel}>Customer</p>
								<p className={styles.detailValue}>{selectedBill.customerSnapshot.name}</p>
							</div>
							<div>
								<p className={styles.detailLabel}>Customer ID</p>
								<p className={styles.detailValue}>{selectedBill.customerSnapshot.customerCustomId || 'N/A'}</p>
							</div>
							<div>
								<p className={styles.detailLabel}>Phones</p>
								<p className={styles.detailValue}>
									{[selectedBill.customerSnapshot.phone, ...(selectedBill.customerSnapshot.phones || [])].filter(Boolean).join(', ')}
								</p>
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
								<p className={styles.detailLabel}>Total Amount</p>
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
							{selectedBill.trialDate && (
								<div>
									<p className={styles.detailLabel}>Trial Date</p>
									<p className={styles.detailValue}>
										{new Date(selectedBill.trialDate).toLocaleDateString()}
									</p>
								</div>
							)}
							{selectedBill.deliveryDate && (
								<div>
									<p className={styles.detailLabel}>Delivery Date</p>
									<p className={styles.detailValue}>
										{new Date(selectedBill.deliveryDate).toLocaleDateString()}
									</p>
								</div>
							)}
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
						<label>Customer Name <span className={formStyles.required}>*</span></label>
						<div className={styles.suggestionsContainer}>
							<input
								type="text"
								placeholder="John Doe"
								value={createFormData.customerName}
								onChange={(e) => {
									const name = e.target.value;
									setCreateFormData({ 
										...createFormData, 
										customerName: name
									});
									if (name.length === 1) {
										updateNextCustomerId(name);
									}
									fetchCustomerSuggestions(name);
								}}
								onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
								onFocus={() => { if (createFormData.customerName.length >= 2) setShowSuggestions(true); }}
								className={formStyles.input}
							/>
							{showSuggestions && (customerSuggestions.length > 0 || createFormData.customerName.length >= 2) && (
								<div className={styles.suggestionsDropdown}>
									{customerSuggestions.map((c, i) => (
										<div 
											key={i} 
											className={styles.suggestionItem}
											onClick={() => selectCustomer(c)}
										>
											<span className={styles.suggestionName}>{c.name}</span>
											<span className={styles.suggestionMeta}>{c.customerCustomId} • {c.phone}</span>
										</div>
									))}
									<div 
										className={`${styles.suggestionItem} ${styles.addNew}`}
										onClick={() => {
											updateNextCustomerId(createFormData.customerName);
											setShowSuggestions(false);
										}}
									>
										+ Add as New Customer
									</div>
								</div>
							)}
						</div>
					</div>

					<div className={formStyles.formGroup}>
						<label>Customer ID</label>
						<input
							type="text"
							placeholder="J-001"
							value={createFormData.customerCustomId}
							onChange={async (e) => {
								const customId = e.target.value;
								setCreateFormData({ ...createFormData, customerCustomId: customId });
								
								// If ID is fully entered (starts with letter, has dash and numbers)
								const idRegex = /^[A-Z]-[0-9]{3,}$/i;
								if (idRegex.test(customId)) {
									try {
										const res = await axios.get(`/api/admin/bills?lookupCustomerId=${customId}`);
										if (res.data.success && res.data.details) {
											setCreateFormData(prev => ({
												...prev,
												customerName: res.data.details.name,
												customerPhone: res.data.details.phone
											}));
										}
									} catch (err) {
										console.error('Failed to lookup customer', err);
									}
								}
							}}
							className={formStyles.input}
						/>
					</div>

					<div className={formStyles.formGroup}>
						<label>Customer Phone Numbers <span className={formStyles.required}>*</span></label>
						<input
							type="text"
							placeholder="Primary Phone (91XXXXXXXXXX)"
							value={createFormData.customerPhone}
							onChange={(e) =>
								setCreateFormData({ ...createFormData, customerPhone: e.target.value })
							}
							className={formStyles.input}
							style={{ marginBottom: '8px' }}
						/>
						{createFormData.customerPhones.map((phone, idx) => (
							<div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
								<input
									type="text"
									placeholder={`Secondary Phone ${idx + 1}`}
									value={phone}
									onChange={(e) => {
										const newPhones = [...createFormData.customerPhones];
										newPhones[idx] = e.target.value;
										setCreateFormData({ ...createFormData, customerPhones: newPhones });
									}}
									className={formStyles.input}
								/>
								<button 
									type="button" 
									onClick={() => {
										const newPhones = createFormData.customerPhones.filter((_, i) => i !== idx);
										setCreateFormData({ ...createFormData, customerPhones: newPhones });
									}}
									className={buttonStyles.dangerBtn}
									style={{ padding: '8px' }}
								>
									<MinusIcon style={{ width: '16px' }} />
								</button>
							</div>
						))}
						<button 
							type="button" 
							onClick={() => setCreateFormData({ ...createFormData, customerPhones: [...createFormData.customerPhones, ''] })}
							className={buttonStyles.ghostBtn}
							style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px' }}
						>
							<PlusIcon style={{ width: '16px' }} /> Add Phone Number
						</button>
					</div>

					<div className={formStyles.formGroup}>
						<label>Customer Email</label>
						<input
							type="email"
							placeholder="customer@example.com"
							value={createFormData.customerEmail}
							onChange={(e) =>
								setCreateFormData({ ...createFormData, customerEmail: e.target.value })
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
										onWheel={(e) => (e.target as HTMLInputElement).blur()}
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
										onWheel={(e) => (e.target as HTMLInputElement).blur()}
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
						<label>Total Amount</label>
						<input
							type="number"
							placeholder="Enter total rate"
							value={createFormData.rate}
							onWheel={(e) => (e.target as HTMLInputElement).blur()}
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

					<div style={{ display: 'flex', gap: '12px', marginBottom: '15px' }}>
						<div className={formStyles.formGroup} style={{ flex: 1, marginBottom: 0 }}>
							<label>Trial Date</label>
							<input
								type="date"
								value={createFormData.trialDate}
								onChange={(e) =>
									setCreateFormData({ ...createFormData, trialDate: e.target.value })
								}
								className={formStyles.input}
							/>
						</div>
						<div className={formStyles.formGroup} style={{ flex: 1, marginBottom: 0 }}>
							<label>Delivery Date</label>
							<input
								type="date"
								value={createFormData.deliveryDate}
								onChange={(e) =>
									setCreateFormData({ ...createFormData, deliveryDate: e.target.value })
								}
								className={formStyles.input}
							/>
						</div>
					</div>

					{createFormData.paymentStatus === 'advance_payment' && (
						<>
							<div className={formStyles.formGroup}>
								<label>Advance Paid</label>
								<input
									type="number"
									placeholder="Enter advance amount"
									value={createFormData.advancePaid}
									onWheel={(e) => (e.target as HTMLInputElement).blur()}
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
				subtitle={selectedBill ? `Bill #${selectedBill.billId || selectedBill.orderSnapshot?.orderNumber}` : ''}
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
						<label>Bill/Order Number <span className={formStyles.required}>*</span></label>
						<input
							type="text"
							placeholder="znm-DDMMYYYYXXX"
							value={editFormData.orderId}
							onChange={(e) =>
								setEditFormData({ ...editFormData, orderId: e.target.value })
							}
							className={formStyles.input}
						/>
					</div>

					<div className={formStyles.formGroup}>
						<label>Customer Name <span className={formStyles.required}>*</span></label>
						<div className={styles.suggestionsContainer}>
							<input
								type="text"
								placeholder="John Doe"
								value={editFormData.customerName}
								onChange={(e) => {
									const name = e.target.value;
									setEditFormData({ 
										...editFormData, 
										customerName: name
									});
									fetchCustomerSuggestions(name);
								}}
								onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
								onFocus={() => { if (editFormData.customerName.length >= 2) setShowSuggestions(true); }}
								className={formStyles.input}
							/>
							{showSuggestions && (customerSuggestions.length > 0 || editFormData.customerName.length >= 2) && (
								<div className={styles.suggestionsDropdown}>
									{customerSuggestions.map((c, i) => (
										<div 
											key={i} 
											className={styles.suggestionItem}
											onClick={() => {
												setEditFormData({
													...editFormData,
													customerName: c.name,
													customerPhone: c.phone,
													customerPhones: c.phones || [],
													customerEmail: c.email || '',
													customerCustomId: c.customerCustomId
												});
												setShowSuggestions(false);
											}}
										>
											<span className={styles.suggestionName}>{c.name}</span>
											<span className={styles.suggestionMeta}>{c.customerCustomId} • {c.phone}</span>
										</div>
									))}
								</div>
							)}
						</div>
					</div>

					<div className={formStyles.formGroup}>
						<label>Customer Email</label>
						<input
							type="email"
							placeholder="customer@example.com"
							value={editFormData.customerEmail}
							onChange={(e) =>
								setEditFormData({ ...editFormData, customerEmail: e.target.value })
							}
							className={formStyles.input}
						/>
					</div>

					<div className={formStyles.formGroup}>
						<label>Customer ID</label>
						<input
							type="text"
							placeholder="J-001"
							value={editFormData.customerCustomId}
							onChange={(e) => setEditFormData({ ...editFormData, customerCustomId: e.target.value })}
							className={formStyles.input}
						/>
					</div>

					<div className={formStyles.formGroup}>
						<label>Customer Phone Numbers <span className={formStyles.required}>*</span></label>
						<input
							type="text"
							placeholder="Primary Phone"
							value={editFormData.customerPhone}
							onChange={(e) =>
								setEditFormData({ ...editFormData, customerPhone: e.target.value })
							}
							className={formStyles.input}
							style={{ marginBottom: '8px' }}
						/>
						{editFormData.customerPhones.map((phone, idx) => (
							<div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
								<input
									type="text"
									placeholder={`Secondary Phone ${idx + 1}`}
									value={phone}
									onChange={(e) => {
										const newPhones = [...editFormData.customerPhones];
										newPhones[idx] = e.target.value;
										setEditFormData({ ...editFormData, customerPhones: newPhones });
									}}
									className={formStyles.input}
								/>
								<button 
									type="button" 
									onClick={() => {
										const newPhones = editFormData.customerPhones.filter((_, i) => i !== idx);
										setEditFormData({ ...editFormData, customerPhones: newPhones });
									}}
									className={buttonStyles.dangerBtn}
									style={{ padding: '8px' }}
								>
									<MinusIcon style={{ width: '16px' }} />
								</button>
							</div>
						))}
						<button 
							onClick={() => setEditFormData({ 
								...editFormData, 
								customerPhones: [...editFormData.customerPhones, ''] 
							})}
							className={buttonStyles.ghostBtn}
							style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', padding: '4px 0' }}
						>
							<PlusIcon style={{ width: '14px' }} /> Add another phone
						</button>
					</div>

					<div className={formStyles.formGroup}>
						<label>Items Description, Quantity & Rate</label>
						{editFormData.items.map((item, index) => (
							<div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
								<div style={{ flex: 3 }}>
									<input
										type="text"
										value={item.description}
										onChange={(e) => {
											const newItems = [...editFormData.items];
											newItems[index].description = e.target.value;
											setEditFormData({ ...editFormData, items: newItems });
										}}
										className={formStyles.input}
									/>
								</div>
								<div style={{ flex: 1 }}>
									<input
										type="number"
										value={item.quantity || ''}
										onWheel={(e) => (e.target as HTMLInputElement).blur()}
										onChange={(e) => {
											const qty = parseInt(e.target.value) || 0;
											const newItems = [...editFormData.items];
											newItems[index].quantity = qty;
											const totalRate = newItems.reduce((sum, i) => sum + ((i.quantity || 1) * (i.rate || 0)), 0);
											setEditFormData({ 
												...editFormData, 
												items: newItems,
												rate: totalRate,
												balanceAmount: totalRate - (editFormData.advancePaid || 0)
											});
										}}
										className={formStyles.input}
									/>
								</div>
								<div style={{ flex: 1.5 }}>
									<input
										type="number"
										value={item.rate || ''}
										onWheel={(e) => (e.target as HTMLInputElement).blur()}
										onChange={(e) => {
											const val = parseFloat(e.target.value) || 0;
											const newItems = [...editFormData.items];
											newItems[index].rate = val;
											const totalRate = newItems.reduce((sum, i) => sum + ((i.quantity || 1) * (i.rate || 0)), 0);
											setEditFormData({ 
												...editFormData, 
												items: newItems,
												rate: totalRate,
												balanceAmount: totalRate - (editFormData.advancePaid || 0)
											});
										}}
										className={formStyles.input}
									/>
								</div>
								{index > 0 && (
									<button 
										onClick={() => {
											const newItems = editFormData.items.filter((_, i) => i !== index);
											const totalRate = newItems.reduce((sum, i) => sum + ((i.quantity || 1) * (i.rate || 0)), 0);
											setEditFormData({ 
												...editFormData, 
												items: newItems,
												rate: totalRate,
												balanceAmount: totalRate - (editFormData.advancePaid || 0)
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
							onClick={() => setEditFormData({ 
								...editFormData, 
								items: [...editFormData.items, { description: '', quantity: 1, rate: 0 }] 
							})}
							className={buttonStyles.ghostBtn}
							style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px' }}
						>
							<PlusIcon style={{ width: '16px' }} /> Add more
						</button>
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

					<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
						<div className={formStyles.formGroup}>
							<label>Trial Date</label>
							<input
								type="date"
								value={editFormData.trialDate}
								onChange={(e) => setEditFormData({ ...editFormData, trialDate: e.target.value })}
								className={formStyles.input}
							/>
						</div>
						<div className={formStyles.formGroup}>
							<label>Delivery Date</label>
							<input
								type="date"
								value={editFormData.deliveryDate}
								onChange={(e) => setEditFormData({ ...editFormData, deliveryDate: e.target.value })}
								className={formStyles.input}
							/>
						</div>
					</div>

					<div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)', gap: '10px', marginTop: '10px' }}>
						<div className={formStyles.formGroup}>
							<label style={{ fontSize: '10px' }}>Total Amount</label>
							<input
								type="number"
								value={editFormData.rate}
								onChange={(e) => {
									const val = parseFloat(e.target.value) || 0;
									setEditFormData({ ...editFormData, rate: val, balanceAmount: val - (editFormData.advancePaid || 0) });
								}}
								className={formStyles.input}
							/>
						</div>
						<div className={formStyles.formGroup}>
							<label style={{ fontSize: '10px' }}>Advance Paid</label>
							<input
								type="number"
								value={editFormData.advancePaid}
								onChange={(e) => {
									const val = parseFloat(e.target.value) || 0;
									setEditFormData({ ...editFormData, advancePaid: val, balanceAmount: (editFormData.rate || 0) - val });
								}}
								className={formStyles.input}
							/>
						</div>
						<div className={formStyles.formGroup}>
							<label style={{ fontSize: '10px' }}>Balance</label>
							<input
								type="number"
								value={editFormData.balanceAmount}
								readOnly
								className={formStyles.input}
								style={{ opacity: 0.7, backgroundColor: 'transparent' }}
							/>
						</div>
					</div>
				</div>
			</Modal>

			{/* Pay Bill Modal */}
			<Modal
				isOpen={showPayModal}
				onClose={() => setShowPayModal(false)}
				title="Update Payment"
				subtitle={selectedBill ? `Bill #${selectedBill.billId || selectedBill.orderSnapshot?.orderNumber}` : ''}
				footer={
					<button
						onClick={handlePayBill}
						className={buttonStyles.primaryBtn}
						disabled={actionInProgress}
						style={{ backgroundColor: '#2e7d32' }}
					>
						Confirm Payment
					</button>
				}
			>
				<div className={formStyles.formSection}>
					<div className={formStyles.formGroup}>
						<label>Payment Status</label>
						<select
							value={payFormData.paymentStatus}
							onChange={(e) => setPayFormData({ ...payFormData, paymentStatus: e.target.value as any })}
							className={formStyles.select}
						>
							<option value="">Please select</option>
							<option value="full_paid">Full Paid</option>
							<option value="advance_payment">Advance Paid</option>
						</select>
					</div>

					{payFormData.paymentStatus === 'advance_payment' && (
						<div className={formStyles.formGroup}>
							<label>Extra amount paid just now?</label>
							<input
								type="number"
								placeholder="Enter new amount"
								value={payFormData.amountPaid}
								onWheel={(e) => (e.target as HTMLInputElement).blur()}
								onChange={(e) => setPayFormData({ ...payFormData, amountPaid: parseFloat(e.target.value) || 0 })}
								className={formStyles.input}
							/>
						</div>
					)}
					
					{selectedBill && (
						<div style={{ marginTop: '15px', padding: '15px', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
							<div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
								<span style={{ opacity: 0.8 }}>Total Rate:</span>
								<strong>₹{selectedBill.rate?.toFixed(2)}</strong>
							</div>
							<div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
								<span style={{ opacity: 0.8 }}>Previously Paid:</span>
								<strong>₹{(selectedBill.advancePaid || 0).toFixed(2)}</strong>
							</div>
							<div style={{ display: 'flex', justifyContent: 'space-between', color: '#ff5252', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
								<span>Remaining Balance:</span>
								<strong>₹{(selectedBill.balanceAmount || 0).toFixed(2)}</strong>
							</div>
							
							{payFormData.amountPaid > 0 && (
								<div style={{ marginTop: '10px', borderTop: '1px dashed rgba(255, 255, 255, 0.1)', paddingTop: '10px' }}>
									<div style={{ display: 'flex', justifyContent: 'space-between', color: '#4caf50', marginBottom: '5px' }}>
										<span>New Payment:</span>
										<strong>- ₹{payFormData.amountPaid.toFixed(2)}</strong>
									</div>
									<div style={{ display: 'flex', justifyContent: 'space-between', color: '#fff', fontWeight: 'bold' }}>
										<span>Final Balance:</span>
										<span>₹{Math.max(0, (selectedBill.balanceAmount || 0) - payFormData.amountPaid).toFixed(2)}</span>
									</div>
								</div>
							)}
						</div>
					)}
				</div>
			</Modal>

			{/* Confirmation Modal */}
			<Modal
				isOpen={!!confirmAction}
				onClose={() => setConfirmAction(null)}
				title={confirmAction?.title || ''}
			>
				<div style={{ textAlign: 'center', padding: '10px 0' }}>
					<p style={{ fontSize: '18px', color: '#fff', opacity: 0.9, marginBottom: '25px' }}>
						{confirmAction?.message}
					</p>
					<div style={{ display: 'flex', gap: '12px' }}>
						<button
							onClick={() => setConfirmAction(null)}
							className={buttonStyles.secondaryBtn}
							style={{ flex: 1 }}
						>
							Discard
						</button>
						<button
							onClick={() => confirmAction?.onConfirm()}
							className={buttonStyles.dangerBtn}
							style={{ flex: 1 }}
						>
							Proceed
						</button>
					</div>
				</div>
			</Modal>

			{/* Prompt Modal */}
			<Modal
				isOpen={!!promptAction}
				onClose={() => setPromptAction(null)}
				title={promptAction?.title || ''}
			>
				<div style={{ padding: '10px 0' }}>
					<p style={{ fontSize: '16px', color: '#fff', opacity: 0.8, marginBottom: '15px' }}>
						{promptAction?.message}
					</p>
					<div className={formStyles.formGroup}>
						<textarea
							placeholder={promptAction?.placeholder}
							value={promptValue}
							onChange={(e) => setPromptValue(e.target.value)}
							className={formStyles.input}
							style={{ minHeight: '100px', width: '100%', marginBottom: '20px' }}
							autoFocus
						/>
					</div>
					<div style={{ display: 'flex', gap: '12px' }}>
						<button
							onClick={() => setPromptAction(null)}
							className={buttonStyles.secondaryBtn}
							style={{ flex: 1 }}
						>
							Cancel
						</button>
						<button
							onClick={() => promptAction?.onConfirm(promptValue)}
							className={buttonStyles.primaryBtn}
							style={{ flex: 1 }}
							disabled={!promptValue.trim()}
						>
							Confirm
						</button>
					</div>
				</div>
			</Modal>

			{/* Status / Notification Modal */}
			<Modal
				isOpen={!!statusModal}
				onClose={() => setStatusModal(null)}
				title={statusModal?.title || ''}
			>
				<div style={{ textAlign: 'center', padding: '10px 0' }}>
					<div style={{
						fontSize: '48px',
						marginBottom: '20px',
						color: statusModal?.type === 'error' ? '#ff5252' : statusModal?.type === 'info' ? '#2196f3' : '#4caf50'
					}}>
						{statusModal?.type === 'error' ? '❌' : statusModal?.type === 'info' ? 'ℹ️' : '✅'}
					</div>
					<p style={{ fontSize: '18px', color: '#fff', opacity: 0.9 }}>{statusModal?.message}</p>
					<button
						onClick={() => setStatusModal(null)}
						className={buttonStyles.primaryBtn}
						style={{ marginTop: '25px', width: '100%' }}
					>
						Understand
					</button>
				</div>
			</Modal>
		</div>
	);
}
