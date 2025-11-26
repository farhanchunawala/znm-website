'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import styles from '../new/add-customer.module.scss';

export default function EditCustomerPage() {
    const router = useRouter();
    const params = useParams();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phoneCode: '+91',
        phone: '',
        address: '',
        city: '',
        state: '',
        country: 'India',
        zipCode: '',
    });

    useEffect(() => {
        fetchCustomer();
    }, []);

    const fetchCustomer = async () => {
        try {
            const res = await fetch(`/api/admin/customers/${params.id}/details`);
            const data = await res.json();

            setFormData({
                firstName: data.firstName || '',
                lastName: data.lastName || '',
                email: data.email || '',
                phoneCode: data.phoneCode || '+91',
                phone: data.phone?.replace(data.phoneCode || '+91', '') || '',
                address: data.address || '',
                city: data.city || '',
                state: data.state || '',
                country: data.country || 'India',
                zipCode: data.zipCode || '',
            });
        } catch (error) {
            console.error('Failed to fetch customer:', error);
            setError('Failed to load customer data');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        try {
            const res = await fetch(`/api/admin/customers/${params.id}/edit`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (res.ok) {
                router.push('/admin/customers');
            } else {
                setError(data.error || 'Failed to update customer');
            }
        } catch (err) {
            setError('Failed to update customer');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className={styles.addCustomerPage}><div className={styles.loading}>Loading...</div></div>;
    }

    return (
        <div className={styles.addCustomerPage}>
            <button onClick={() => router.back()} className={styles.backBtn}>
                <ArrowLeftIcon />
                Back
            </button>

            <h1>Edit Customer</h1>

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
                            <input
                                type="text"
                                name="phoneCode"
                                value={formData.phoneCode}
                                onChange={handleChange}
                                className={styles.phoneCode}
                                placeholder="+91"
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
                        <label htmlFor="address">Address *</label>
                        <input
                            id="address"
                            name="address"
                            type="text"
                            value={formData.address}
                            onChange={handleChange}
                            required
                            className={styles.input}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="city">City *</label>
                        <input
                            id="city"
                            name="city"
                            type="text"
                            value={formData.city}
                            onChange={handleChange}
                            required
                            className={styles.input}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="state">State *</label>
                        <input
                            id="state"
                            name="state"
                            type="text"
                            value={formData.state}
                            onChange={handleChange}
                            required
                            className={styles.input}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="country">Country *</label>
                        <input
                            id="country"
                            name="country"
                            type="text"
                            value={formData.country}
                            onChange={handleChange}
                            required
                            className={styles.input}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="zipCode">Zip Code *</label>
                        <input
                            id="zipCode"
                            name="zipCode"
                            type="text"
                            value={formData.zipCode}
                            onChange={handleChange}
                            required
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
                        disabled={saving}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className={styles.submitBtn}
                        disabled={saving}
                    >
                        {saving ? 'Saving...' : 'Update Customer'}
                    </button>
                </div>
            </form>
        </div>
    );
}
