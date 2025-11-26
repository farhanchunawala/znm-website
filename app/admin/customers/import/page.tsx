'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon, DocumentArrowUpIcon } from '@heroicons/react/24/outline';
import styles from '../new/add-customer.module.scss';

export default function ImportCustomersPage() {
    const router = useRouter();
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState('');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setError('');
            setResult(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) {
            setError('Please select a CSV file');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch('/api/admin/customers/import', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();

            if (res.ok) {
                setResult(data);
            } else {
                setError(data.error || 'Import failed');
            }
        } catch (err) {
            setError('Import failed');
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

            <h1>Import Customers from CSV</h1>

            <div className={styles.form}>
                <div className={styles.instructions}>
                    <h3>CSV Format Requirements:</h3>
                    <p>Your CSV file must include the following headers (case-insensitive):</p>
                    <ul>
                        <li><strong>firstname</strong> - Customer's first name (required)</li>
                        <li><strong>lastname</strong> - Customer's last name (required)</li>
                        <li><strong>email</strong> - Email address (required)</li>
                        <li><strong>phone</strong> - Phone number (required)</li>
                        <li><strong>phonecode</strong> - Country code (optional, defaults to +91)</li>
                        <li><strong>address</strong> - Street address (optional)</li>
                        <li><strong>city</strong> - City (optional)</li>
                        <li><strong>state</strong> - State (optional)</li>
                        <li><strong>country</strong> - Country (optional, defaults to India)</li>
                        <li><strong>zipcode</strong> - ZIP/Postal code (optional)</li>
                    </ul>
                    <p><strong>Example:</strong></p>
                    <code>firstname,lastname,email,phone,city,state,country<br />
                        John,Doe,john@example.com,9876543210,Mumbai,Maharashtra,India</code>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className={styles.formGroup}>
                        <label htmlFor="csvFile">Select CSV File</label>
                        <div className={styles.fileInput}>
                            <input
                                id="csvFile"
                                type="file"
                                accept=".csv"
                                onChange={handleFileChange}
                                className={styles.input}
                            />
                            {file && (
                                <div className={styles.fileName}>
                                    <DocumentArrowUpIcon />
                                    {file.name}
                                </div>
                            )}
                        </div>
                    </div>

                    {error && <div className={styles.error}>{error}</div>}

                    {result && (
                        <div className={styles.result}>
                            <h3>Import Results:</h3>
                            <p><strong>Successfully imported:</strong> {result.imported} customers</p>
                            {result.errors > 0 && (
                                <>
                                    <p><strong>Errors:</strong> {result.errors}</p>
                                    <div className={styles.errorDetails}>
                                        {result.errorDetails.map((err: any, idx: number) => (
                                            <div key={idx}>Row {err.row}: {err.error}</div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    )}

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
                            disabled={loading || !file}
                        >
                            {loading ? 'Importing...' : 'Import Customers'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
