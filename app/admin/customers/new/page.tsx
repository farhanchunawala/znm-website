'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import styles from './add-customer.module.scss';

export default function AddCustomerPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
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

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

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
                            <select
                                name="phoneCode"
                                value={formData.phoneCode}
                                onChange={(e) => setFormData({ ...formData, phoneCode: e.target.value })}
                                className={styles.phoneCode}
                            >
                                <option value="+1">🇺🇸 +1</option>
                                <option value="+44">🇬🇧 +44</option>
                                <option value="+91">🇮🇳 +91</option>
                                <option value="+971">🇦🇪 +971</option>
                                <option value="+966">🇸🇦 +966</option>
                                <option value="+974">🇶🇦 +974</option>
                                <option value="+965">🇰🇼 +965</option>
                                <option value="+968">🇴🇲 +968</option>
                                <option value="+973">🇧🇭 +973</option>
                                <option value="+61">🇦🇺 +61</option>
                                <option value="+65">🇸🇬 +65</option>
                                <option value="+60">🇲🇾 +60</option>
                                <option value="+86">🇨🇳 +86</option>
                                <option value="+81">🇯🇵 +81</option>
                                <option value="+82">🇰🇷 +82</option>
                            </select>
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
        </div>
    );
}
