import styles from './privacy.module.scss';
import Link from 'next/link';

export default function PrivacyPolicyPage() {
    return (
        <div className={styles.container}>
            <div className={styles.content}>
                <h1>PRIVACY POLICY</h1>

                <section>
                    <h2>Introduction</h2>
                    <p>
                        At Zoll & Metér, we are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy outlines how we collect, use, and safeguard your data.
                    </p>
                </section>

                <section>
                    <h2>Information We Collect</h2>
                    <p>We collect information that you provide directly to us, including:</p>
                    <ul>
                        <li>Name and contact information (email address, phone number)</li>
                        <li>Account credentials (username and password)</li>
                        <li>Billing and shipping addresses</li>
                        <li>Payment information</li>
                        <li>Order history and preferences</li>
                    </ul>
                </section>

                <section>
                    <h2>How We Use Your Information</h2>
                    <p>We use the information we collect to:</p>
                    <ul>
                        <li>Process and fulfill your orders</li>
                        <li>Communicate with you about your account and orders</li>
                        <li>Improve our products and services</li>
                        <li>Send you marketing communications (with your consent)</li>
                        <li>Prevent fraud and enhance security</li>
                    </ul>
                </section>

                <section>
                    <h2>Data Security</h2>
                    <p>
                        We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. Your password is stored using industry-standard encryption.
                    </p>
                </section>

                <section>
                    <h2>Cookies</h2>
                    <p>
                        We use cookies and similar technologies to maintain your session, remember your preferences, and analyze site traffic. You can control cookie settings through your browser preferences.
                    </p>
                </section>

                <section>
                    <h2>Your Rights</h2>
                    <p>You have the right to:</p>
                    <ul>
                        <li>Access your personal information</li>
                        <li>Correct inaccurate data</li>
                        <li>Request deletion of your data</li>
                        <li>Opt-out of marketing communications</li>
                        <li>Withdraw consent at any time</li>
                    </ul>
                </section>

                <section>
                    <h2>Contact Us</h2>
                    <p>
                        If you have any questions about this Privacy Policy or our data practices, please contact us at{' '}
                        <Link href="/contact-us">our contact page</Link>.
                    </p>
                </section>

                <div className={styles.backLink}>
                    <Link href="/">← Back to Home</Link>
                </div>
            </div>
        </div>
    );
}
