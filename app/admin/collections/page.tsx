'use client';

import React, { useEffect, useState, useRef } from 'react';
import styles from './collections.module.scss';

interface Collection {
	_id: string;
	title: string;
	type: 'manual' | 'dynamic';
	status: 'active' | 'hidden';
	priority: number;
	productIds?: string[];
	cachedProductIds?: string[];
	rules?: Array<{ field: string; operator: string; value: any }>;
	startAt?: string;
	endAt?: string;
}

export default function CollectionsPage() {
	const [collections, setCollections] = useState<Collection[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState('');
	const [page, setPage] = useState(1);
	const [total, setTotal] = useState(0);
	const [showModal, setShowModal] = useState(false);
	const [editingCollection, setEditingCollection] =
		useState<Collection | null>(null);
	const [status, setStatus] = useState<'all' | 'active' | 'hidden'>('all');
	const [formData, setFormData] = useState({
		title: '',
		description: '',
		type: 'manual' as 'manual' | 'dynamic',
		rules: [] as any[],
		priority: 0,
		status: 'active' as 'active' | 'hidden',
	});

	const limit = 10;
	const fileInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		fetchCollections();
	}, [search, page, status]);

	async function fetchCollections() {
		try {
			setLoading(true);
			const params = new URLSearchParams();
			if (search) params.append('q', search);
			params.append('status', status);
			params.append('page', page.toString());
			params.append('limit', limit.toString());

			const res = await fetch(`/api/collections?${params}`);
			const result = await res.json();

			if (result.success) {
				setCollections(result.data);
				setTotal(result.meta.total);
			}
		} catch (error) {
			console.error('Failed to fetch collections:', error);
		} finally {
			setLoading(false);
		}
	}

	async function handleSave() {
		try {
			const method = editingCollection ? 'PATCH' : 'POST';
			const url = editingCollection
				? `/api/collections/${editingCollection._id}`
				: '/api/collections';

			const res = await fetch(url, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(formData),
			});

			if (res.ok) {
				setShowModal(false);
				setEditingCollection(null);
				setFormData({
					title: '',
					description: '',
					type: 'manual',
					rules: [],
					priority: 0,
					status: 'active',
				});
				fetchCollections();
			}
		} catch (error) {
			console.error('Failed to save collection:', error);
		}
	}

	async function handleDelete(id: string) {
		if (confirm('Delete this collection?')) {
			try {
				const res = await fetch(`/api/collections/${id}`, {
					method: 'DELETE',
				});
				if (res.ok) {
					fetchCollections();
				}
			} catch (error) {
				console.error('Failed to delete collection:', error);
			}
		}
	}

	async function handleEvaluate(id: string) {
		try {
			const res = await fetch(`/api/collections/${id}/evaluate`, {
				method: 'POST',
			});
			if (res.ok) {
				fetchCollections();
				alert('Collection rules evaluated');
			}
		} catch (error) {
			console.error('Failed to evaluate:', error);
		}
	}

	const handleExportCSV = async () => {
		try {
			const res = await fetch('/api/admin/collections/export');
			if (!res.ok) throw new Error('Export failed');
			const blob = await res.blob();
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `collections-${new Date().toISOString().split('T')[0]}.csv`;
			a.click();
			window.URL.revokeObjectURL(url);
		} catch { alert('Failed to export CSV'); }
	};

	const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		try {
			const fd = new FormData();
			fd.append('file', file);
			const res = await fetch('/api/admin/collections/import', { method: 'POST', body: fd });
			const result = await res.json();
			if (result.success) {
				alert(`Import: ${result.created} created, ${result.updated} updated`);
				fetchCollections();
			} else { alert(result.error || 'Import failed'); }
		} catch { alert('Failed to import CSV'); }
		if (fileInputRef.current) fileInputRef.current.value = '';
	};

	const pages = Math.ceil(total / limit);

	return (
		<div className={styles.container}>
			<div className={styles.header}>
				<h1>Collections</h1>
				<div className={styles.headerActions}>
					<button onClick={handleExportCSV} className={styles.csvBtn}>📥 Export CSV</button>
					<button onClick={() => fileInputRef.current?.click()} className={styles.csvBtn}>📤 Import CSV</button>
					<input type="file" ref={fileInputRef} accept=".csv" onChange={handleImportCSV} style={{ display: 'none' }} />
					<button
						onClick={() => {
							setEditingCollection(null);
							setFormData({
								title: '',
								description: '',
								type: 'manual',
								rules: [],
								priority: 0,
								status: 'active',
							});
							setShowModal(true);
						}}
						className={styles.createBtn}
					>
						+ New Collection
					</button>
				</div>
			</div>

			<div className={styles.searchBox}>
				<input
					type="text"
					placeholder="Search collections..."
					value={search}
					onChange={(e) => {
						setSearch(e.target.value);
						setPage(1);
					}}
				/>
				<select
					value={status}
					onChange={(e) => {
						setStatus(e.target.value as any);
						setPage(1);
					}}
					className={styles.statusSelect}
				>
					<option value="all">All Status</option>
					<option value="active">Active</option>
					<option value="hidden">Hidden</option>
				</select>
			</div>

			{loading ? (
				<p>Loading...</p>
			) : collections.length === 0 ? (
				<p>No collections found</p>
			) : (
				<>
					<table className={styles.table}>
						<thead>
							<tr>
								<th>Title</th>
								<th>Type</th>
								<th>Status</th>
								<th>Priority</th>
								<th>Products</th>
								<th>Actions</th>
							</tr>
						</thead>
						<tbody>
							{collections.map((col) => (
								<tr key={col._id}>
									<td>{col.title}</td>
									<td>
										<span
											className={`${styles.badge} ${styles[col.type]}`}
										>
											{col.type}
										</span>
									</td>
									<td>
										<span
											className={`${styles.badge} ${styles[col.status]}`}
										>
											{col.status}
										</span>
									</td>
									<td>{col.priority}</td>
									<td>
										{col.type === 'manual'
											? col.productIds?.length || 0
											: col.cachedProductIds?.length || 0}
									</td>
									<td className={styles.actions}>
										{col.type === 'dynamic' && (
											<button
												onClick={() =>
													handleEvaluate(col._id)
												}
												className={styles.evaluateBtn}
											>
												Evaluate
											</button>
										)}
										<button
											onClick={() => {
												setEditingCollection(col);
												setFormData({
													title: col.title,
													description: '',
													type: col.type,
													rules: col.rules || [],
													priority: col.priority,
													status: col.status,
												});
												setShowModal(true);
											}}
											className={styles.editBtn}
										>
											Edit
										</button>
										<button
											onClick={() =>
												handleDelete(col._id)
											}
											className={styles.deleteBtn}
										>
											Delete
										</button>
									</td>
								</tr>
							))}
						</tbody>
					</table>

					{pages > 1 && (
						<div className={styles.pagination}>
							<button
								onClick={() => setPage(Math.max(1, page - 1))}
								disabled={page === 1}
							>
								← Previous
							</button>
							<span>
								Page {page} of {pages}
							</span>
							<button
								onClick={() =>
									setPage(Math.min(pages, page + 1))
								}
								disabled={page === pages}
							>
								Next →
							</button>
						</div>
					)}
				</>
			)}

			{showModal && (
				<div className={styles.modal}>
					<div className={styles.modalContent}>
						<h2>
							{editingCollection
								? 'Edit Collection'
								: 'New Collection'}
						</h2>
						<input
							type="text"
							placeholder="Collection title"
							value={formData.title}
							onChange={(e) =>
								setFormData({
									...formData,
									title: e.target.value,
								})
							}
							className={styles.input}
						/>
						<select
							value={formData.type}
							onChange={(e) =>
								setFormData({
									...formData,
									type: e.target.value as any,
								})
							}
							className={styles.select}
						>
							<option value="manual">Manual</option>
							<option value="dynamic">Dynamic (Rules)</option>
						</select>
						<input
							type="number"
							placeholder="Priority (higher = shown first)"
							value={formData.priority}
							onChange={(e) =>
								setFormData({
									...formData,
									priority: parseInt(e.target.value),
								})
							}
							className={styles.input}
						/>
						<select
							value={formData.status}
							onChange={(e) =>
								setFormData({
									...formData,
									status: e.target.value as any,
								})
							}
							className={styles.select}
						>
							<option value="active">Active</option>
							<option value="hidden">Hidden</option>
						</select>
						<div className={styles.actions}>
							<button
								onClick={handleSave}
								className={styles.saveBtn}
							>
								Save
							</button>
							<button
								onClick={() => setShowModal(false)}
								className={styles.cancelBtn}
							>
								Cancel
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
