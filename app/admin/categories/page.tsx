'use client';

import React, { useEffect, useState, useRef } from 'react';
import styles from './categories.module.scss';

interface Category {
	_id: string;
	name: string;
	slug: string;
	status: 'active' | 'hidden';
	productCount?: number;
	position: number;
	children?: Category[];
}

export default function CategoriesPage() {
	const [categories, setCategories] = useState<Category[]>([]);
	const [loading, setLoading] = useState(true);
	const [selectedCategory, setSelectedCategory] = useState<Category | null>(
		null
	);
	const [showModal, setShowModal] = useState(false);
	const [formData, setFormData] = useState({
		name: '',
		description: '',
		parentId: '',
	});
	const fileInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		fetchCategories();
	}, []);

	async function fetchCategories() {
		try {
			setLoading(true);
			const res = await fetch('/api/categories');
			const result = await res.json();
			if (result.success) {
				setCategories(result.data);
			}
		} catch (error) {
			console.error('Failed to fetch categories:', error);
		} finally {
			setLoading(false);
		}
	}

	async function handleSave() {
		try {
			const method = selectedCategory ? 'PATCH' : 'POST';
			const url = selectedCategory
				? `/api/categories/${selectedCategory._id}`
				: '/api/categories';

			const res = await fetch(url, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(formData),
			});

			if (res.ok) {
				setShowModal(false);
				setFormData({ name: '', description: '', parentId: '' });
				setSelectedCategory(null);
				fetchCategories();
			}
		} catch (error) {
			console.error('Failed to save category:', error);
		}
	}

	async function handleDelete(id: string) {
		if (confirm('Delete this category?')) {
			try {
				const res = await fetch(`/api/categories/${id}`, {
					method: 'DELETE',
				});
				if (res.ok) {
					fetchCategories();
				}
			} catch (error) {
				console.error('Failed to delete category:', error);
			}
		}
	}

	const handleExportCSV = async () => {
		try {
			const res = await fetch('/api/admin/categories/export');
			if (!res.ok) throw new Error('Export failed');
			const blob = await res.blob();
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `categories-${new Date().toISOString().split('T')[0]}.csv`;
			a.click();
			window.URL.revokeObjectURL(url);
		} catch { alert('Failed to export CSV'); }
	};

	const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		try {
			const formData = new FormData();
			formData.append('file', file);
			const res = await fetch('/api/admin/categories/import', { method: 'POST', body: formData });
			const result = await res.json();
			if (result.success) {
				alert(`Import complete: ${result.created} created, ${result.updated} updated`);
				fetchCategories();
			} else { alert(result.error || 'Import failed'); }
		} catch { alert('Failed to import CSV'); }
		if (fileInputRef.current) fileInputRef.current.value = '';
	};

	const TreeNode = ({
		node,
		level = 0,
	}: {
		node: Category;
		level?: number;
	}) => (
		<div
			className={styles.treeNode}
			style={{ marginLeft: `${level * 20}px` }}
		>
			<div className={styles.nodeContent}>
				<span className={styles.nodeName}>{node.name}</span>
				<span className={styles.productCount}>
					({node.productCount || 0} products)
				</span>
				<div className={styles.actions}>
					<button
						onClick={() => {
							setSelectedCategory(node);
							setFormData({
								name: node.name,
								description: '',
								parentId: node._id,
							});
							setShowModal(true);
						}}
						className={styles.editBtn}
					>
						Edit
					</button>
					<button
						onClick={() => handleDelete(node._id)}
						className={styles.deleteBtn}
					>
						Delete
					</button>
				</div>
			</div>
			{node.children?.map((child) => (
				<TreeNode key={child._id} node={child} level={level + 1} />
			))}
		</div>
	);

	return (
		<div className={styles.container}>
			<div className={styles.header}>
				<h1>Categories</h1>
				<div className={styles.headerActions}>
					<button onClick={handleExportCSV} className={styles.csvBtn}>📥 Export CSV</button>
					<button onClick={() => fileInputRef.current?.click()} className={styles.csvBtn}>📤 Import CSV</button>
					<input type="file" ref={fileInputRef} accept=".csv" onChange={handleImportCSV} style={{ display: 'none' }} />
					<button
						onClick={() => {
							setSelectedCategory(null);
							setFormData({
								name: '',
								description: '',
								parentId: '',
							});
							setShowModal(true);
						}}
						className={styles.createBtn}
					>
						+ New Category
					</button>
				</div>
			</div>

			{loading ? (
				<p>Loading...</p>
			) : (
				<div className={styles.tree}>
					{categories.map((cat) => (
						<TreeNode key={cat._id} node={cat} />
					))}
				</div>
			)}

			{showModal && (
				<div className={styles.modal}>
					<div className={styles.modalContent}>
						<h2>
							{selectedCategory
								? 'Edit Category'
								: 'New Category'}
						</h2>
						<input
							type="text"
							placeholder="Category name"
							value={formData.name}
							onChange={(e) =>
								setFormData({
									...formData,
									name: e.target.value,
								})
							}
							className={styles.input}
						/>
						<textarea
							placeholder="Description"
							value={formData.description}
							onChange={(e) =>
								setFormData({
									...formData,
									description: e.target.value,
								})
							}
							className={styles.textarea}
						/>
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
