'use client';

import { useState, useEffect } from 'react';
import { PaperAirplaneIcon, UsersIcon, EnvelopeIcon, ClockIcon } from '@heroicons/react/24/outline';
import styles from './broadcast.module.scss';

interface Subscriber {
    _id: string;
    email: string;
    subscribedAt: string;
}

export default function BroadcastPage() {
    const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [testEmail, setTestEmail] = useState('');
    const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [showConfirmation, setShowConfirmation] = useState(false);

    useEffect(() => {
        fetchSubscribers();
    }, []);

    const fetchSubscribers = async () => {
        try {
            const res = await fetch('/api/admin/broadcast');
            const data = await res.json();
            setSubscribers(data.subscribers || []);
        } catch (error) {
            console.error('Failed to fetch subscribers:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSendTest = async () => {
        if (!testEmail || !subject || !message) {
            setStatus({ type: 'error', message: 'Please fill in all fields including test email' });
            return;
        }

        setSending(true);
        setStatus(null);

        try {
            const res = await fetch('/api/admin/broadcast', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subject,
                    message,
                    testMode: true,
                    testEmail,
                }),
            });

            const data = await res.json();

            if (res.ok) {
                setStatus({ type: 'success', message: `Test email sent to ${testEmail}` });
            } else {
                setStatus({ type: 'error', message: data.error || 'Failed to send test email' });
            }
        } catch (error) {
            setStatus({ type: 'error', message: 'Failed to send test email' });
        } finally {
            setSending(false);
        }
    };

    const handleSendBroadcast = async () => {
        if (!subject || !message) {
            setStatus({ type: 'error', message: 'Please fill in subject and message' });
            return;
        }

        setSending(true);
        setStatus(null);
        setShowConfirmation(false);

        try {
            const res = await fetch('/api/admin/broadcast', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subject,
                    message,
                    testMode: false,
                }),
            });

            const data = await res.json();

            if (res.ok) {
                setStatus({ type: 'success', message: `Broadcast sent to ${subscribers.length} subscribers!` });
                setSubject('');
                setMessage('');
                setTestEmail('');
            } else {
                setStatus({ type: 'error', message: data.error || 'Failed to send broadcast' });
            }
        } catch (error) {
            setStatus({ type: 'error', message: 'Failed to send broadcast' });
        } finally {
            setSending(false);
        }
    };

    return (
        <div className={styles.broadcastPage}>
            <div className={styles.header}>
                <h1>Newsletter Broadcast</h1>
                <div className={styles.stats}>
                    <div className={styles.statItem}>
                        <UsersIcon />
                        <span>{subscribers.length} Subscribers</span>
                    </div>
                </div>
            </div>

            <div className={styles.grid}>
                {/* Email Composer */}
                <div className={styles.composer}>
                    <h2>Compose Email</h2>

                    <div className={styles.formGroup}>
                        <label htmlFor="subject">Subject</label>
                        <input
                            id="subject"
                            type="text"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="Enter email subject..."
                            className={styles.input}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="message">Message</label>
                        <textarea
                            id="message"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Enter your message..."
                            className={styles.textarea}
                            rows={12}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="testEmail">Test Email (Optional)</label>
                        <input
                            id="testEmail"
                            type="email"
                            value={testEmail}
                            onChange={(e) => setTestEmail(e.target.value)}
                            placeholder="your@email.com"
                            className={styles.input}
                        />
                    </div>

                    {status && (
                        <div className={`${styles.status} ${styles[status.type]}`}>
                            {status.message}
                        </div>
                    )}

                    <div className={styles.actions}>
                        <button
                            onClick={handleSendTest}
                            disabled={sending || !testEmail}
                            className={styles.testBtn}
                        >
                            <EnvelopeIcon />
                            {sending ? 'Sending...' : 'Send Test'}
                        </button>
                        <button
                            onClick={() => setShowConfirmation(true)}
                            disabled={sending || subscribers.length === 0}
                            className={styles.sendBtn}
                        >
                            <PaperAirplaneIcon />
                            {sending ? 'Sending...' : `Send to ${subscribers.length} Subscribers`}
                        </button>
                    </div>
                </div>

                {/* Subscribers List */}
                <div className={styles.subscribersList}>
                    <h2>Active Subscribers</h2>

                    {loading ? (
                        <div className={styles.loading}>Loading subscribers...</div>
                    ) : subscribers.length === 0 ? (
                        <div className={styles.empty}>No subscribers yet</div>
                    ) : (
                        <div className={styles.list}>
                            {subscribers.map((subscriber) => (
                                <div key={subscriber._id} className={styles.subscriberItem}>
                                    <EnvelopeIcon />
                                    <div className={styles.subscriberInfo}>
                                        <span className={styles.email}>{subscriber.email}</span>
                                        <span className={styles.date}>
                                            <ClockIcon />
                                            {new Date(subscriber.subscribedAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Confirmation Modal */}
            {showConfirmation && (
                <div className={styles.modalOverlay} onClick={() => setShowConfirmation(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <h3>Confirm Broadcast</h3>
                        <p>Are you sure you want to send this email to <strong>{subscribers.length} subscribers</strong>?</p>
                        <div className={styles.modalActions}>
                            <button
                                onClick={() => setShowConfirmation(false)}
                                className={styles.cancelBtn}
                                disabled={sending}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSendBroadcast}
                                className={styles.confirmBtn}
                                disabled={sending}
                            >
                                {sending ? 'Sending...' : 'Send Broadcast'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
