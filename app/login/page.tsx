'use client';

import { useState } from 'react';
import styles from './login.module.scss';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Here you would typically authenticate the user
        alert('Login functionality coming soon!');
        // router.push('/account');
    };

    return (
        <div className={styles.main}>
            <div className={styles.loginContainer}>
                <h1>LOGIN</h1>
                <p className={styles.subtitle}>Welcome back to Zoll & Metér</p>

                <form onSubmit={handleSubmit}>
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
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className={styles.forgotPassword}>
                        <Link href="/forgot-password">Forgot your password?</Link>
                    </div>

                    <button type="submit" className={styles.loginButton}>
                        LOGIN
                    </button>
                </form>

                <div className={styles.divider}>OR</div>

                <div className={styles.register}>
                    Don't have an account? <Link href="/register">Create one</Link>
                </div>
            </div>
        </div>
    );
}
