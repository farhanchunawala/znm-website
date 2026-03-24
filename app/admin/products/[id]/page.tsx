'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import styles from '../products.module.scss';

interface Product {
	_id: string;
	title: string;
	slug: string;
	description: string;
	sku: string;
	status: 'draft' | 'active' | 'archived';
	variants: Array<{
		_id: string;
		sku: string;
		price: number;
		comparePrice?: number;
		options: Array<{ name: string; value: string }>;
		images: string[];
		isActive: boolean;
	}>;
	categories: string[];
	tags: string[];
	seo?: { title?: string; description?: string; keywords?: string[] };
	createdAt: string;
	updatedAt: string;
}

type TabType = 'basic' | 'variants' | 'images' | 'seo';

export default function ProductDetailPage() {
	const params = useParams();
	const searchParams = useSearchParams();
	const router = useRouter();
	const productId = params.id as string;
	const collectionId = searchParams.get('collectionId');
	const isNew = productId === 'new';

	const [product, setProduct] = useState<Partial<Product> | null>(
		isNew ? {} : null
	);
	const [activeTab, setActiveTab] = useState<TabType>('basic');
	const [loading, setLoading] = useState(!isNew);
	const [saving, setSaving] = useState(false);
	const [message, setMessage] = useState('');

	useEffect(() => {
		if (!isNew) {
			fetchProduct();
		}
	}, [productId, isNew]);

	async function fetchProduct() {
		try {
			setLoading(true);
			const res = await fetch(`/api/products/${productId}`);
			const result = await res.json();

			if (result.success) {
				setProduct(result.data);
			} else {
				setMessage('Failed to load product');
			}
		} catch (error) {
			setMessage('Error loading product');
			console.error(error);
		} finally {
			setLoading(false);
		}
	}

	async function handleSave() {
		if (!product) return;

		try {
			setSaving(true);
			const method = isNew ? 'POST' : 'PATCH';
			const url = isNew ? '/api/products' : `/api/products/${productId}`;

			const res = await fetch(url, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(product),
			});

			const result = await res.json();

			if (result.success) {
				setMessage('Product saved successfully');
				
				// Auto-associate with manual collection if created from a collection tab
				if (isNew && collectionId) {
					try {
						await fetch(`/api/collections/${collectionId}/products`, {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({ productIds: [result.data._id] }),
						});
					} catch (addToColErr) {
						console.error('Failed to auto-add to collection', addToColErr);
					}
				}

				if (isNew) {
					router.push(`/admin/products/${result.data._id}`);
				} else {
					setProduct(result.data);
				}
			} else {
				setMessage(result.error?.message || 'Failed to save');
			}
		} catch (error) {
			setMessage('Error saving product');
			console.error(error);
		} finally {
			setSaving(false);
		}
	}

	async function handlePublish() {
		if (!product?._id) return;

		try {
			const res = await fetch(`/api/products/${product._id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status: 'active' }),
			});

			const result = await res.json();

			if (result.success) {
				setProduct(result.data);
				setMessage('Product published');
			} else {
				setMessage(result.error?.message || 'Failed to publish');
			}
		} catch (error) {
			setMessage('Error publishing');
			console.error(error);
		}
	}

	if (loading) return <div>Loading...</div>;
	if (!product) return <div>Product not found</div>;

	return (
		<div className={styles.detailContainer}>
			<div className={styles.header}>
				<h1>{isNew ? 'New Product' : product.title || 'Product'}</h1>
				<div className={styles.actions}>
					<button
						onClick={handleSave}
						disabled={saving}
						className={styles.saveBtn}
					>
						{saving ? 'Saving...' : 'Save'}
					</button>
					{!isNew && product.status !== 'active' && (
						<button
							onClick={handlePublish}
							className={styles.publishBtn}
						>
							Publish
						</button>
					)}
				</div>
			</div>

			{message && <div className={styles.message}>{message}</div>}

			<div className={styles.tabs}>
				{(['basic', 'variants', 'images', 'seo'] as TabType[]).map(
					(tab) => (
						<button
							key={tab}
							className={`${styles.tabBtn} ${activeTab === tab ? styles.active : ''}`}
							onClick={() => setActiveTab(tab)}
						>
							{tab.charAt(0).toUpperCase() + tab.slice(1)}
						</button>
					)
				)}
			</div>

			<div className={styles.tabContent}>
				{activeTab === 'basic' && (
					<div>
						<div className={styles.formGroup}>
							<label>Title *</label>
							<input
								type="text"
								value={product.title || ''}
								onChange={(e) =>
									setProduct({
										...product,
										title: e.target.value,
									})
								}
								placeholder="Product title"
								required
							/>
						</div>

						<div className={styles.formGroup}>
							<label>Description</label>
							<textarea
								value={product.description || ''}
								onChange={(e) =>
									setProduct({
										...product,
										description: e.target.value,
									})
								}
								placeholder="Product description"
								rows={5}
							/>
						</div>

						<div className={styles.row}>
							<div className={styles.formGroup}>
								<label>SKU *</label>
								<input
									type="text"
									value={product.sku || ''}
									onChange={(e) =>
										setProduct({
											...product,
											sku: e.target.value,
										})
									}
									placeholder="Master SKU"
									required
									disabled={!isNew}
								/>
							</div>

							<div className={styles.formGroup}>
								<label>Status</label>
								<select
									value={product.status || 'draft'}
									onChange={(e) =>
										setProduct({
											...product,
											status: e.target.value as any,
										})
									}
								>
									<option value="draft">Draft</option>
									<option value="active">Active</option>
									<option value="archived">Archived</option>
								</select>
							</div>
						</div>

						<div className={styles.formGroup}>
							<label>Tags (comma-separated)</label>
							<input
								type="text"
								value={(product.tags || []).join(', ')}
								onChange={(e) =>
									setProduct({
										...product,
										tags: e.target.value
											.split(',')
											.map((t) => t.trim()),
									})
								}
								placeholder="tag1, tag2, tag3"
							/>
						</div>
					</div>
				)}

				{activeTab === 'variants' && (
					<div>
						<h3>Variants ({product.variants?.length || 0})</h3>
						{product.variants?.map((variant, idx) => (
							<div key={variant._id} className={styles.variant}>
								<h4>Variant {idx + 1}</h4>
								<div className={styles.row}>
									<input
										type="text"
										value={variant.sku}
										onChange={(e) => {
											const updated = [
												...(product.variants || []),
											];
											updated[idx].sku = e.target.value;
											setProduct({
												...product,
												variants: updated,
											});
										}}
										placeholder="SKU"
									/>
									<input
										type="number"
										value={variant.price}
										onChange={(e) => {
											const updated = [
												...(product.variants || []),
											];
											updated[idx].price = parseFloat(
												e.target.value
											);
											setProduct({
												...product,
												variants: updated,
											});
										}}
										placeholder="Price"
										step="0.01"
									/>
									<input
										type="number"
										value={variant.comparePrice || ''}
										onChange={(e) => {
											const updated = [
												...(product.variants || []),
											];
											updated[idx].comparePrice = e.target
												.value
												? parseFloat(e.target.value)
												: undefined;
											setProduct({
												...product,
												variants: updated,
											});
										}}
										placeholder="Compare Price (MRP)"
										step="0.01"
									/>
								</div>
							</div>
						))}
					</div>
				)}

				{activeTab === 'images' && (
					<div>
						<h3>Images</h3>
						<p>
							Image upload functionality to be implemented with
							multer + sharp
						</p>
						<p>
							Max {product.variants?.length || 0} variants for
							image management
						</p>
					</div>
				)}

				{activeTab === 'seo' && (
					<div>
						<div className={styles.formGroup}>
							<label>SEO Title</label>
							<input
								type="text"
								value={product.seo?.title || ''}
								onChange={(e) =>
									setProduct({
										...product,
										seo: {
											...product.seo,
											title: e.target.value,
										},
									})
								}
								placeholder="Max 60 characters"
								maxLength={60}
							/>
							<small>{product.seo?.title?.length || 0}/60</small>
						</div>

						<div className={styles.formGroup}>
							<label>SEO Description</label>
							<textarea
								value={product.seo?.description || ''}
								onChange={(e) =>
									setProduct({
										...product,
										seo: {
											...product.seo,
											description: e.target.value,
										},
									})
								}
								placeholder="Max 160 characters"
								maxLength={160}
								rows={3}
							/>
							<small>
								{product.seo?.description?.length || 0}/160
							</small>
						</div>

						<div className={styles.formGroup}>
							<label>Keywords (comma-separated)</label>
							<input
								type="text"
								value={(product.seo?.keywords || []).join(', ')}
								onChange={(e) =>
									setProduct({
										...product,
										seo: {
											...product.seo,
											keywords: e.target.value
												.split(',')
												.map((k) => k.trim()),
										},
									})
								}
								placeholder="keyword1, keyword2, keyword3"
							/>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
