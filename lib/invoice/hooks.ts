import { useCallback, useState } from 'react';
import axios from 'axios';

interface UseInvoiceOptions {
	onSuccess?: (data: any) => void;
	onError?: (error: any) => void;
}

/**
 * Hook for fetching invoices with filters
 */
export function useInvoices(options: UseInvoiceOptions = {}) {
	const [invoices, setInvoices] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const fetch = useCallback(
		async (filters?: any) => {
			setLoading(true);
			setError(null);
			try {
				const response = await axios.get('/api/admin/invoices', {
					params: filters,
				});
				setInvoices(response.data.invoices);
				options.onSuccess?.(response.data);
			} catch (err: any) {
				const message = err.response?.data?.error || 'Failed to fetch invoices';
				setError(message);
				options.onError?.(err);
			} finally {
				setLoading(false);
			}
		},
		[options]
	);

	return { invoices, loading, error, fetch };
}

/**
 * Hook for fetching single invoice
 */
export function useInvoice(invoiceId: string | null, options: UseInvoiceOptions = {}) {
	const [invoice, setInvoice] = useState<any>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const fetch = useCallback(
		async (id?: string) => {
			const targetId = id || invoiceId;
			if (!targetId) return;

			setLoading(true);
			setError(null);
			try {
				const response = await axios.get(`/api/invoices/${targetId}`);
				setInvoice(response.data);
				options.onSuccess?.(response.data);
			} catch (err: any) {
				const message = err.response?.data?.error || 'Failed to fetch invoice';
				setError(message);
				options.onError?.(err);
			} finally {
				setLoading(false);
			}
		},
		[invoiceId, options]
	);

	return { invoice, loading, error, fetch };
}

/**
 * Hook for invoice actions (regenerate, cancel, etc)
 */
export function useInvoiceAction(options: UseInvoiceOptions = {}) {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const regenerate = useCallback(
		async (invoiceId: string) => {
			setLoading(true);
			setError(null);
			try {
				const response = await axios.patch(
					`/api/admin/invoices/${invoiceId}`,
					{ action: 'regenerate' }
				);
				options.onSuccess?.(response.data);
				return response.data;
			} catch (err: any) {
				const message = err.response?.data?.error || 'Failed to regenerate invoice';
				setError(message);
				options.onError?.(err);
				throw err;
			} finally {
				setLoading(false);
			}
		},
		[options]
	);

	const cancel = useCallback(
		async (invoiceId: string, reason: string) => {
			setLoading(true);
			setError(null);
			try {
				const response = await axios.patch(
					`/api/admin/invoices/${invoiceId}`,
					{ action: 'cancel', reason }
				);
				options.onSuccess?.(response.data);
				return response.data;
			} catch (err: any) {
				const message = err.response?.data?.error || 'Failed to cancel invoice';
				setError(message);
				options.onError?.(err);
				throw err;
			} finally {
				setLoading(false);
			}
		},
		[options]
	);

	const generate = useCallback(
		async (orderId: string) => {
			setLoading(true);
			setError(null);
			try {
				const response = await axios.post('/api/admin/invoices', {
					orderId,
					generatePDF: true,
				});
				options.onSuccess?.(response.data);
				return response.data;
			} catch (err: any) {
				const message = err.response?.data?.error || 'Failed to generate invoice';
				setError(message);
				options.onError?.(err);
				throw err;
			} finally {
				setLoading(false);
			}
		},
		[options]
	);

	const downloadPDF = useCallback((invoiceId: string) => {
		const link = document.createElement('a');
		link.href = `/api/invoices/${invoiceId}/pdf`;
		link.download = `invoice-${invoiceId}.pdf`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}, []);

	return { loading, error, regenerate, cancel, generate, downloadPDF };
}

/**
 * Hook for customer viewing own invoices
 */
export function useCustomerInvoice(orderId: string | null) {
	const [invoice, setInvoice] = useState<any>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const fetch = useCallback(async () => {
		if (!orderId) return;

		setLoading(true);
		setError(null);
		try {
			const response = await axios.get(`/api/orders/${orderId}/invoice`);
			setInvoice(response.data);
		} catch (err: any) {
			const message =
				err.response?.data?.error || 'Failed to fetch invoice';
			setError(message);
		} finally {
			setLoading(false);
		}
	}, [orderId]);

	return { invoice, loading, error, fetch };
}
