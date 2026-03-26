import { useState } from 'react';
import { Customer } from '@/app/admin/customers/[id]/page'; // Assuming Customer matches
import styles from './MeasurementsTab.module.scss';
import buttonStyles from './_buttons.module.scss';
import formStyles from './_forms.module.scss';

interface MeasurementsTabProps {
	customerId: string;
	initialMeasurements?: any;
}

export default function MeasurementsTab({
	customerId,
	initialMeasurements,
}: MeasurementsTabProps) {
	const [measurements, setMeasurements] = useState(
		initialMeasurements || {
			shirt: {},
			pant: {},
			kurta: {},
			suit: {},
			notes: '',
		}
	);
	const [activeGarment, setActiveGarment] = useState<
		'shirt' | 'pant' | 'kurta' | 'suit'
	>('shirt');
	const [saving, setSaving] = useState(false);
	const [status, setStatus] = useState({ type: '', message: '' });

	const garmentFields = {
		shirt: [
			'Length',
			'Shoulder',
			'Sleeves',
			'Chest',
			'Stomach',
			'Hip',
			'Collar',
			'Cuff',
			'Bicep',
		],
		pant: ['Length', 'Waist', 'Hip', 'Thigh', 'Knee', 'Bottom', 'Crotch'],
		kurta: [
			'Length',
			'Shoulder',
			'Sleeves',
			'Chest',
			'Stomach',
			'Hip',
			'Collar',
			'Cuff',
			'Bicep',
			'Side Slit',
		],
		suit: [
			'Length',
			'Shoulder',
			'Sleeves',
			'Chest',
			'Stomach',
			'Hip',
			'Collar',
		],
	};

	const handleSave = async () => {
		setSaving(true);
		setStatus({ type: '', message: '' });
		try {
			const res = await fetch(`/api/admin/customers/${customerId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ measurements }),
			});
			if (res.ok) {
				setStatus({
					type: 'success',
					message: 'Measurements saved successfully!',
				});
				setTimeout(() => setStatus({ type: '', message: '' }), 3000);
			} else {
				throw new Error('Failed to save measurements');
			}
		} catch (err: any) {
			setStatus({ type: 'error', message: err.message });
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className={styles.container}>
			<div className={styles.garmentTabs}>
				{(['shirt', 'pant', 'kurta', 'suit'] as const).map(
					(garment) => (
						<button
							key={garment}
							className={`${styles.garmentBtn} ${
								activeGarment === garment ? styles.active : ''
							}`}
							onClick={() => setActiveGarment(garment)}
						>
							{garment.charAt(0).toUpperCase() + garment.slice(1)}
						</button>
					)
				)}
			</div>

			<div className={styles.formGrid}>
				{garmentFields[activeGarment].map((field) => {
					const key = field.toLowerCase().replace(' ', '_');
					return (
						<div key={key} className={formStyles.formGroup}>
							<label style={{ fontSize: '13px' }}>{field}</label>
							<input
								type="text"
								placeholder={`Enter ${field.toLowerCase()}`}
								value={measurements[activeGarment]?.[key] || ''}
								onChange={(e) =>
									setMeasurements({
										...measurements,
										[activeGarment]: {
											...measurements[activeGarment],
											[key]: e.target.value,
										},
									})
								}
								className={formStyles.input}
							/>
						</div>
					);
				})}
			</div>

			<div
				className={formStyles.formGroup}
				style={{ marginTop: '20px' }}
			>
				<label>Additional Notes / Special Instructions</label>
				<textarea
					placeholder="e.g. Slim fit, extra loose around waist..."
					value={measurements.notes || ''}
					onChange={(e) =>
						setMeasurements({
							...measurements,
							notes: e.target.value,
						})
					}
					className={formStyles.textarea}
					style={{ minHeight: '100px' }}
				/>
			</div>

			<div className={styles.footer}>
				{status.message && (
					<span
						className={
							status.type === 'error'
								? styles.errorMsg
								: styles.successMsg
						}
					>
						{status.message}
					</span>
				)}
				<button
					className={buttonStyles.primaryBtn}
					onClick={handleSave}
					disabled={saving}
				>
					{saving ? 'Saving...' : 'Save Measurements'}
				</button>
			</div>
		</div>
	);
}
