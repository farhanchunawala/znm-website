'use client';

import { useState } from 'react';
import styles from '../login/login.module.scss';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ForgotPasswordPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess(true);
            } else {
                setError(data.error || 'Failed to send reset code');
            }
        } catch (error) {
            console.error('Forgot password error:', error);
            setError('An error occurred');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className={styles.main}>
                <div className={styles.loginContainer}>
                    <h1>CHECK YOUR EMAIL</h1>
                    <p className={styles.subtitle}>
                        We've sent a password reset code to {email}
                    </p>
                    <p style={{ marginBottom: '20px', textAlign: 'center' }}>
                        The code will expire in 15 minutes.
                    </p>
                    <Link href="/reset-password" className={styles.loginButton} style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
                        ENTER RESET CODE
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.main}>
            <div className={styles.loginContainer}>
                <h1>FORGOT PASSWORD</h1>
                <p className={styles.subtitle}>Enter your email to receive a reset code</p>

                {error && <div className={styles.errorMessage}>{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className={styles.formGroup}>
                        <label htmlFor="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" className={styles.loginButton} disabled={loading}>
                        {loading ? 'SENDING...' : 'SEND RESET CODE'}
                    </button>
                </form>

                <div className={styles.register} style={{ marginTop: '20px' }}>
                    Remember your password? <Link href="/login">Sign in</Link>
                </div>
            </div>
        </div>
    );
}
