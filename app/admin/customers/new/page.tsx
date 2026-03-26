'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import styles from './add-customer.module.scss';
import PhoneSelect from '@/components/Admin/PhoneSelect';

export default function AddCustomerPage() {
	const router = useRouter();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');

	const [formData, setFormData] = useState({
		customerId: '',
		firstName: '',
		lastName: '',
		email: '',
		phoneCode: '+91',
		phone: '',
		address: '',
		city: '',
		state: '',
		country: '',
		zipCode: '',
	});

	const [showWarning, setShowWarning] = useState(false);
	const [warningMsg, setWarningMsg] = useState('');
	const [nextGlobalNum, setNextGlobalNum] = useState<number | null>(null);
	const isManualId = useRef(false);

	useEffect(() => {
		// Fetch next global number on mount
		fetch('/api/admin/customers/next-id')
			.then(res => res.json())
			.then(data => {
				if (data.nextNumber) setNextGlobalNum(data.nextNumber);
			});
	}, []);

	useEffect(() => {
		// Auto-generate ID if not manually edited
		if (!isManualId.current && formData.firstName && nextGlobalNum !== null) {
			const initial = formData.firstName.charAt(0).toUpperCase();
			const paddedNum = String(nextGlobalNum).padStart(3, '0');
			setFormData(prev => ({ ...prev, customerId: `${initial}-${paddedNum}` }));
		}
	}, [formData.firstName, nextGlobalNum]);

	const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
		const { name, value } = e.target;
		if (name === 'customerId') isManualId.current = true;
		
		setFormData({
			...formData,
			[name]: value,
		});
	};

	const checkDuplicateId = async (id: string) => {
		if (!id) return { exists: false };
		// Check if ID exists in DB
		const res = await fetch(`/api/admin/customers/check-id?id=${id}`);
		const data = await res.json();
		return data;
	};

	const handleSubmit = async (e: React.FormEvent, force: boolean = false) => {
		if (e) e.preventDefault();
		setLoading(true);
		setError('');

		// Check for duplicate ID if not forced
		if (!force && formData.customerId) {
			const check = await checkDuplicateId(formData.customerId);
			if (check.exists) {
				setWarningMsg(`Customer ID "${check.existingId || formData.customerId}" is already registered.`);
				setShowWarning(true);
				setLoading(false);
				return;
			}
		}

		try {
			const res = await fetch('/api/admin/customers/create', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(formData),
			});

			const data = await res.json();

			if (res.ok) {
				router.push('/admin/customers');
			} else {
				setError(data.error || 'Failed to create customer');
			}
		} catch (err) {
			setError('Failed to create customer');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className={styles.addCustomerPage}>
			<button onClick={() => router.back()} className={styles.backBtn}>
				<ArrowLeftIcon />
				Back
			</button>

			<h1>Add New Customer</h1>

			<form onSubmit={handleSubmit} className={styles.form}>
				<div className={styles.grid}>
					<div className={styles.formGroup}>
						<label htmlFor="firstName">First Name *</label>
						<input
							id="firstName"
							name="firstName"
							type="text"
							value={formData.firstName}
							onChange={handleChange}
							required
							className={styles.input}
						/>
					</div>

					<div className={styles.formGroup}>
						<label htmlFor="lastName">Last Name *</label>
						<input
							id="lastName"
							name="lastName"
							type="text"
							value={formData.lastName}
							onChange={handleChange}
							required
							className={styles.input}
						/>
					</div>

					<div className={styles.formGroup}>
						<label htmlFor="customerId">Customer ID (Auto-generated)</label>
						<input
							id="customerId"
							name="customerId"
							type="text"
							value={formData.customerId}
							onChange={handleChange}
							className={styles.input}
							placeholder="e.g. F-001"
						/>
					</div>
					<div className={styles.formGroup}>
						{/* Spacer */}
					</div>

					<div className={styles.formGroup}>
						<label htmlFor="email">Email *</label>
						<input
							id="email"
							name="email"
							type="email"
							value={formData.email}
							onChange={handleChange}
							required
							className={styles.input}
						/>
					</div>

					<div className={styles.formGroup}>
						<label htmlFor="phone">Phone *</label>
						<div className={styles.phoneInput}>
							<PhoneSelect
								value={formData.phoneCode}
								onChange={(val) => setFormData({ ...formData, phoneCode: val })}
							/>
							<input
								id="phone"
								name="phone"
								type="tel"
								value={formData.phone}
								onChange={handleChange}
								required
								className={styles.input}
								placeholder="1234567890"
							/>
						</div>
					</div>

					<div className={styles.formGroup}>
						<label htmlFor="address">Address</label>
						<input
							id="address"
							name="address"
							type="text"
							value={formData.address}
							onChange={handleChange}
							className={styles.input}
						/>
					</div>

					<div className={styles.formGroup}>
						<label htmlFor="city">City</label>
						<input
							id="city"
							name="city"
							type="text"
							value={formData.city}
							onChange={handleChange}
							className={styles.input}
						/>
					</div>

					<div className={styles.formGroup}>
						<label htmlFor="state">State</label>
						<input
							id="state"
							name="state"
							type="text"
							value={formData.state}
							onChange={handleChange}
							className={styles.input}
						/>
					</div>

					<div className={styles.formGroup}>
						<label htmlFor="country">Country</label>
						<input
							id="country"
							name="country"
							type="text"
							value={formData.country}
							onChange={handleChange}
							className={styles.input}
						/>
					</div>

					<div className={styles.formGroup}>
						<label htmlFor="zipCode">Zip Code</label>
						<input
							id="zipCode"
							name="zipCode"
							type="text"
							value={formData.zipCode}
							onChange={handleChange}
							className={styles.input}
						/>
					</div>
				</div>

				{error && <div className={styles.error}>{error}</div>}

				<div className={styles.actions}>
					<button
						type="button"
						onClick={() => router.back()}
						className={styles.cancelBtn}
						disabled={loading}
					>
						Cancel
					</button>
					<button
						type="submit"
						className={styles.submitBtn}
						disabled={loading}
					>
						{loading ? 'Creating...' : 'Create Customer'}
					</button>
				</div>
			</form>

			{showWarning && (
				<div className={styles.modalOverlay}>
					<div className={styles.modal}>
						<div className={styles.modalHeader}>
							<ExclamationTriangleIcon className={styles.warningIcon} />
							<h2>Duplicate ID Warning</h2>
						</div>
						<p>{warningMsg}</p>
						<p className={styles.subText}>This ID is already assigned to another customer. How would you like to proceed?</p>
						<div className={styles.modalActions}>
							<button 
								onClick={() => setShowWarning(false)} 
								className={styles.changeBtn}
							>
								Change ID
							</button>
							<button 
								onClick={() => {
									setShowWarning(false);
									handleSubmit(null as any, true);
								}} 
								className={styles.continueAnywayBtn}
							>
								Continue anyway
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
