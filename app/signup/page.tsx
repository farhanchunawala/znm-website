'use client';

import { useState, useMemo } from 'react';
import styles from '../login/login.module.scss';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Country } from 'country-state-city';

export default function SignupPage() {
    const router = useRouter();
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        phoneCode: '+91',
        phone: '',
        password: '',
        confirmPassword: '',
    });

    const phoneCodes = useMemo(() => {
        return Country.getAllCountries()
            .map(country => ({
                code: country.isoCode,
                name: country.name,
                phoneCode: country.phonecode
            }))
            .filter(c => c.phoneCode)
            .sort((a, b) => a.name.localeCompare(b.name));
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
        // Clear error when user starts typing
        if (error) setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validate passwords match
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        try {
            const response = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: formData.username,
                    email: formData.email,
                    phoneCode: formData.phoneCode,
                    phone: `${formData.phoneCode}${formData.phone}`,
                    password: formData.password,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                // Show welcome message
                alert(data.message || 'Account created successfully!');
                // Redirect to home page on successful signup
                router.push('/');
            } else {
                setError(data.error || 'Signup failed');
            }
        } catch (error) {
            console.error('Signup error:', error);
            setError('An error occurred during signup');
        }
    };

    return (
        <div className={styles.main}>
            <div className={styles.loginContainer}>
                <h1>CREATE ACCOUNT</h1>
                <p className={styles.subtitle}>Join Zoll & Metér</p>

                {error && <div className={styles.errorMessage}>{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className={styles.formGroup}>
                        <label htmlFor="username">Username</label>
                        <input
                            type="text"
                            id="username"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="phone">Phone Number</label>
                        <div className={styles.phoneInputGroup}>
                            <select
                                id="phoneCode"
                                name="phoneCode"
                                value={formData.phoneCode}
                                onChange={handleChange}
                                className={styles.phoneCodeSelect}
                                required
                            >
                                {phoneCodes.map((country) => (
                                    <option key={country.code} value={`+${country.phoneCode}`}>
                                        {country.name} (+{country.phoneCode})
                                    </option>
                                ))}
                            </select>
                            <input
                                type="tel"
                                id="phone"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                placeholder="Phone number"
                                className={styles.phoneInput}
                                required
                            />
                        </div>
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="password">Password</label>
                        <div className={styles.passwordField}>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                id="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                            />
                            <button
                                type="button"
                                className={styles.togglePassword}
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? '👁️' : '👁️‍🗨️'}
                            </button>
                        </div>
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="confirmPassword">Confirm Password</label>
                        <div className={styles.passwordField}>
                            <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                id="confirmPassword"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                required
                            />
                            <button
                                type="button"
                                className={styles.togglePassword}
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                                {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                            </button>
                        </div>
                    </div>

                    <button type="submit" className={styles.loginButton}>
                        CREATE ACCOUNT
                    </button>
                </form>

                <div className={styles.divider}>OR</div>

                <div className={styles.register}>
                    Already have an account? <Link href="/login">Sign in</Link>
                </div>
            </div>
        </div>
    );
}
