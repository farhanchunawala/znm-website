'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './products.module.scss';

interface Product {
	_id: string;
	title: string;
	slug: string;
	status: 'draft' | 'active' | 'archived';
	variants: Array<{ price: number }>;
	createdAt: string;
}

export default function ProductsPage() {
	const router = useRouter();
	const [products, setProducts] = useState<Product[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState('');
	const [status, setStatus] = useState<
		'all' | 'draft' | 'active' | 'archived'
	>('all');
	const [page, setPage] = useState(1);
	const [total, setTotal] = useState(0);
	const [collections, setCollections] = useState<any[]>([]);
	const [activeCollection, setActiveCollection] = useState<string>('all');
	const limit = 10;
	const fileInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		fetchCollections();
	}, []);

	async function fetchCollections() {
		try {
			const res = await fetch('/api/collections?limit=100');
			const result = await res.json();
			if (result.success) {
				setCollections(result.data);
			}
		} catch (error) {
			console.error('Failed to fetch collections:', error);
		}
	}

	useEffect(() => {
		fetchProducts();
	}, [search, status, page, activeCollection]);

	async function fetchProducts() {
		try {
			setLoading(true);
			
			if (activeCollection === 'all') {
				const params = new URLSearchParams();
				if (search) params.append('q', search);
				params.append('status', status);
				params.append('page', page.toString());
				params.append('limit', limit.toString());

				const res = await fetch(`/api/products?${params}`);
				const result = await res.json();

				if (result.success) {
					setProducts(result.data);
					setTotal(result.meta.total);
				}
			} else {
				const params = new URLSearchParams();
				params.append('skip', ((page - 1) * limit).toString());
				params.append('limit', limit.toString());
				
				const res = await fetch(`/api/collections/${activeCollection}/products?${params}`);
				const result = await res.json();
				if (result.success) {
					setProducts(result.data);
					setTotal(result.meta.total);
				}
			}
		} catch (error) {
			console.error('Failed to fetch products:', error);
		} finally {
			setLoading(false);
		}
	}

	const handleExportCSV = async () => {
		try {
			const res = await fetch('/api/admin/products/export');
			if (!res.ok) throw new Error('Export failed');
			const blob = await res.blob();
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `products-${new Date().toISOString().split('T')[0]}.csv`;
			a.click();
			window.URL.revokeObjectURL(url);
		} catch (err) {
			alert('Failed to export CSV');
		}
	};

	const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		try {
			const formData = new FormData();
			formData.append('file', file);
			const res = await fetch('/api/admin/products/import', { method: 'POST', body: formData });
			const result = await res.json();
			if (result.success) {
				alert(`Import complete: ${result.created} created, ${result.updated} updated${result.errors?.length ? `, ${result.errors.length} errors` : ''}`);
				fetchProducts();
			} else {
				alert(result.error || 'Import failed');
			}
		} catch (err) {
			alert('Failed to import CSV');
		}
		if (fileInputRef.current) fileInputRef.current.value = '';
	};

	const handleDelete = async (id: string) => {
		if (!confirm('Are you sure you want to delete this product?')) return;
		try {
			const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
			const result = await res.json();
			if (result.success) fetchProducts();
			else alert(result.error?.message || 'Failed to delete');
		} catch (err) {
			alert('Error deleting product');
		}
	};

	const pages = Math.ceil(total / limit);

	return (
		<div className={styles.container}>
			<div className={styles.titleBar}>
				<h1>Products</h1>
				<div className={styles.headerActions}>
					<button onClick={handleExportCSV} className={styles.csvBtn}>📥 Export CSV</button>
					<button onClick={() => fileInputRef.current?.click()} className={styles.csvBtn}>📤 Import CSV</button>
					<input type="file" ref={fileInputRef} accept=".csv" onChange={handleImportCSV} style={{ display: 'none' }} />
					<Link href={activeCollection === 'all' ? "/admin/products/new" : `/admin/products/new?collectionId=${activeCollection}`} className={styles.createBtn}>
						+ New Product
					</Link>
				</div>
			</div>

			<div className={styles.tabsContainer}>
				<button
					className={`${styles.tabBtn} ${activeCollection === 'all' ? styles.activeTab : ''}`}
					onClick={() => { setActiveCollection('all'); setPage(1); }}
				>
					All Products
				</button>
				{collections.map(c => (
					<button
						key={c._id}
						className={`${styles.tabBtn} ${activeCollection === c._id ? styles.activeTab : ''}`}
						onClick={() => { setActiveCollection(c._id); setPage(1); }}
					>
						{c.title}
					</button>
				))}
			</div>

			<div className={styles.filtersWrapper}>
				<div className={styles.filters}>
				<input
					type="text"
					placeholder="Search products..."
					value={search}
					onChange={(e) => {
						setSearch(e.target.value);
						setPage(1);
					}}
					className={styles.searchInput}
				/>

				<select
					value={status}
					onChange={(e) => {
						setStatus(e.target.value as any);
						setPage(1);
					}}
					className={styles.filterSelect}
				>
					<option value="all">All Status</option>
					<option value="draft">Draft</option>
					<option value="active">Active</option>
					<option value="archived">Archived</option>
				</select>
			</div>
			</div>

			{loading ? (
				<div className={styles.loading}>Loading...</div>
			) : products.length === 0 ? (
				<div className={styles.empty}>
					<p>No products found</p>
					<Link href="/admin/products/new">Create one now</Link>
				</div>
			) : (
				<>
					<table className={styles.table}>
						<thead>
							<tr>
								<th>Title</th>
								<th>Status</th>
								<th>Price Range</th>
								<th>Created</th>
								<th>Actions</th>
							</tr>
						</thead>
						<tbody>
							{products.map((product) => (
								<tr key={product._id}>
									<td className={styles.titleCell}>
										<Link
											href={`/admin/products/${product._id}`}
										>
											{product.title}
										</Link>
									</td>
									<td>
										<span
											className={`${styles.badge} ${styles[product.status]}`}
										>
											{product.status}
										</span>
									</td>
									<td>
										{product.variants.length > 0 ? (
											(() => {
												const prices = product.variants.map((v) => v.price);
												const min = Math.min(...prices);
												const max = Math.max(...prices);
												return min === max ? `₹${min}` : `₹${min} - ₹${max}`;
											})()
										) : (
											'No variants'
										)}
									</td>
									<td>
										{new Date(
											product.createdAt
										).toLocaleDateString()}
									</td>
									<td className={styles.actionCell}>
										<Link
											href={`/admin/products/${product._id}`}
											className={styles.editBtn}
										>
											Edit
										</Link>
										<button
											onClick={() => handleDelete(product._id)}
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
								className={styles.pageBtn}
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
								className={styles.pageBtn}
							>
								Next →
							</button>
						</div>
					)}
				</>
			)}
		</div>
	);
}

