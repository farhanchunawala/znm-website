'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../orders.module.scss';

export default function ImportOrdersPage() {
    const router = useRouter();
    const [file, setFile] = useState<File | null>(null);
    const [importing, setImporting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const downloadTemplate = () => {
        const template = `customerId,customerEmail,customerPhone,firstName,lastName,address,city,state,zipCode,country,itemTitle,itemQuantity,itemSize,itemPrice,paymentStatus,notes
CUST001,customer@example.com,+919876543210,John,Doe,123 Main Street,Mumbai,Maharashtra,400001,India,Premium Kurta,2,L,2500,prepaid,Gift wrapping required`;

        const blob = new Blob([template], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'orders-template.csv';
        a.click();
    };

    const handleImport = async () => {
        if (!file) {
            setError('Please select a file');
            return;
        }

        setImporting(true);
        setError('');
        setSuccess('');

        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch('/api/admin/orders/import', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();

            if (res.ok) {
                setSuccess(`Successfully imported ${data.orders.length} orders!`);
                setTimeout(() => router.push('/admin/orders'), 2000);
            } else {
                setError(data.error || 'Failed to import orders');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to import orders');
        } finally {
            setImporting(false);
        }
    };

    return (
        <div className={styles.ordersPage}>
            <div className={styles.header}>
                <h1>Import Orders from CSV</h1>
            </div>

            <div className={styles.importContainer}>
                <div className={styles.importSection}>
                    <h3>Step 1: Download Template</h3>
                    <p>Download the CSV template to see the required format</p>
                    <button onClick={downloadTemplate} className={styles.downloadBtn}>
                        Download CSV Template
                    </button>
                </div>

                <div className={styles.importSection}>
                    <h3>Step 2: Upload Your CSV File</h3>
                    <input
                        type="file"
                        accept=".csv"
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                        className={styles.fileInput}
                    />
                    {file && <p className={styles.fileName}>Selected: {file.name}</p>}
                </div>

                <div className={styles.importSection}>
                    <h3>Step 3: Import</h3>
                    <button
                        onClick={handleImport}
                        disabled={!file || importing}
                        className={styles.importBtn}
                    >
                        {importing ? 'Importing...' : 'Import Orders'}
                    </button>
                </div>

                {error && <div className={styles.error}>{error}</div>}
                {success && <div className={styles.success}>{success}</div>}
            </div>
        </div>
    );
}
