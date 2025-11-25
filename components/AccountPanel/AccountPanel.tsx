'use client';

import { useState, useEffect } from 'react';
import styles from './AccountPanel.module.scss';
import Link from 'next/link';

interface AccountPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

interface UserProfile {
    id: string;
    email: string;
    name: {
        firstName: string;
        middleName?: string;
        lastName?: string;
    };
    phone?: string;
    birthdate?: string;
    birthdateLastChanged?: string;
    referralCode?: string;
    customerId?: string;
    offers?: Array<{
        code: string;
        type: string;
        description: string;
        expiresAt: string;
        claimed: boolean;
    }>;
}

export default function AccountPanel({ isOpen, onClose }: AccountPanelProps) {
    const [activeSection, setActiveSection] = useState<string>('profile');
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(false);
    const [editMode, setEditMode] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        username: '',
        phone: '',
        birthdate: '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    useEffect(() => {
        if (isOpen) {
            fetchProfile();
        }
    }, [isOpen]);

    const fetchProfile = async () => {
        try {
            const response = await fetch('/api/user/profile');
            if (response.ok) {
                const data = await response.json();
                setProfile(data.user);
                setFormData({
                    ...formData,
                    username: data.user.name.firstName || '',
                    phone: data.user.phone || '',
                    birthdate: data.user.birthdate ? new Date(data.user.birthdate).toISOString().split('T')[0] : '',
                });
            }
        } catch (error) {
            console.error('Failed to fetch profile:', error);
        }
    };

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            window.location.href = '/';
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    const handleUpdateProfile = async (field: string) => {
        setLoading(true);
        try {
            const response = await fetch('/api/user/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    [field]: formData[field as keyof typeof formData],
                }),
            });

            if (response.ok) {
                await fetchProfile();
                setEditMode(null);
                alert('Profile updated successfully');
            } else {
                const data = await response.json();
                alert(data.error || 'Update failed');
            }
        } catch (error) {
            console.error('Update failed:', error);
            alert('An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async () => {
        if (formData.newPassword !== formData.confirmPassword) {
            alert('Passwords do not match');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch('/api/user/password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currentPassword: formData.currentPassword,
                    newPassword: formData.newPassword,
                }),
            });

            if (response.ok) {
                setFormData({ ...formData, currentPassword: '', newPassword: '', confirmPassword: '' });
                setEditMode(null);
                alert('Password changed successfully');
            } else {
                const data = await response.json();
                alert(data.error || 'Password change failed');
            }
        } catch (error) {
            console.error('Password change failed:', error);
            alert('An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const canChangeBirthdate = () => {
        if (!profile?.birthdateLastChanged) return true;
        const lastChanged = new Date(profile.birthdateLastChanged);
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        return lastChanged < oneYearAgo;
    };

    const handleLinkCustomer = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/user/link-customer', {
                method: 'POST',
            });
            const data = await response.json();

            if (response.ok) {
                await fetchProfile();
                alert(data.message);
            } else {
                alert(data.error || 'Failed to link customer account');
            }
        } catch (error) {
            console.error('Link customer error:', error);
            alert('An error occurred');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <div className={styles.overlay} onClick={onClose} />
            <div className={styles.panel}>
                <div className={styles.header}>
                    <h2>MY ACCOUNT</h2>
                    <button className={styles.closeButton} onClick={onClose}>
                        ✕
                    </button>
                </div>

                <div className={styles.navigation}>
                    <button
                        className={activeSection === 'profile' ? styles.active : ''}
                        onClick={() => setActiveSection('profile')}
                    >
                        PROFILE
                    </button>
                    <button
                        className={activeSection === 'orders' ? styles.active : ''}
                        onClick={() => setActiveSection('orders')}
                    >
                        ORDERS
                    </button>
                    <button
                        className={activeSection === 'offers' ? styles.active : ''}
                        onClick={() => setActiveSection('offers')}
                    >
                        OFFERS
                    </button>
                    <button
                        className={activeSection === 'support' ? styles.active : ''}
                        onClick={() => setActiveSection('support')}
                    >
                        SUPPORT
                    </button>
                </div>

                <div className={styles.content}>
                    {activeSection === 'profile' && (
                        <div className={styles.section}>
                            <h3>PROFILE INFORMATION</h3>

                            <div className={styles.field}>
                                <label>Email</label>
                                <p>{profile?.email}</p>
                            </div>

                            <div className={styles.field}>
                                <label>Username</label>
                                {editMode === 'username' ? (
                                    <div className={styles.editField}>
                                        <input
                                            type="text"
                                            value={formData.username}
                                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                        />
                                        <button onClick={() => handleUpdateProfile('username')} disabled={loading}>
                                            Save
                                        </button>
                                        <button onClick={() => setEditMode(null)}>Cancel</button>
                                    </div>
                                ) : (
                                    <div className={styles.displayField}>
                                        <p>{profile?.name.firstName || 'Not set'}</p>
                                        <button onClick={() => setEditMode('username')}>Edit</button>
                                    </div>
                                )}
                            </div>

                            <div className={styles.field}>
                                <label>Phone Number</label>
                                {editMode === 'phone' ? (
                                    <div className={styles.editField}>
                                        <input
                                            type="tel"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        />
                                        <button onClick={() => handleUpdateProfile('phone')} disabled={loading}>
                                            Save
                                        </button>
                                        <button onClick={() => setEditMode(null)}>Cancel</button>
                                    </div>
                                ) : (
                                    <div className={styles.displayField}>
                                        <p>{profile?.phone || 'Not set'}</p>
                                        <button onClick={() => setEditMode('phone')}>Edit</button>
                                    </div>
                                )}
                            </div>

                            <div className={styles.field}>
                                <label>Birthdate {!canChangeBirthdate() && '(Can change once per year)'}</label>
                                {editMode === 'birthdate' ? (
                                    <div className={styles.editField}>
                                        <input
                                            type="date"
                                            value={formData.birthdate}
                                            onChange={(e) => setFormData({ ...formData, birthdate: e.target.value })}
                                            disabled={!canChangeBirthdate()}
                                        />
                                        <button
                                            onClick={() => handleUpdateProfile('birthdate')}
                                            disabled={loading || !canChangeBirthdate()}
                                        >
                                            Save
                                        </button>
                                        <button onClick={() => setEditMode(null)}>Cancel</button>
                                    </div>
                                ) : (
                                    <div className={styles.displayField}>
                                        <p>
                                            {profile?.birthdate
                                                ? new Date(profile.birthdate).toLocaleDateString()
                                                : 'Not set'}
                                        </p>
                                        <button onClick={() => setEditMode('birthdate')} disabled={!canChangeBirthdate()}>
                                            Edit
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className={styles.field}>
                                <label>Password</label>
                                {editMode === 'password' ? (
                                    <div className={styles.editField}>
                                        <input
                                            type="password"
                                            placeholder="Current Password"
                                            value={formData.currentPassword}
                                            onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                                        />
                                        <input
                                            type="password"
                                            placeholder="New Password"
                                            value={formData.newPassword}
                                            onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                                        />
                                        <input
                                            type="password"
                                            placeholder="Confirm New Password"
                                            value={formData.confirmPassword}
                                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                        />
                                        <button onClick={handleChangePassword} disabled={loading}>
                                            Change Password
                                        </button>
                                        <button onClick={() => setEditMode(null)}>Cancel</button>
                                    </div>
                                ) : (
                                    <div className={styles.displayField}>
                                        <p>••••••••</p>
                                        <button onClick={() => setEditMode('password')}>Change</button>
                                    </div>
                                )}
                            </div>

                            <div className={styles.field}>
                                <label>Referral Code</label>
                                <p className={styles.referralCode}>{profile?.referralCode || 'Generating...'}</p>
                            </div>

                            <div className={styles.field}>
                                <label>Customer ID</label>
                                {profile?.customerId ? (
                                    <p className={styles.customerId}>{profile.customerId}</p>
                                ) : (
                                    <div className={styles.displayField}>
                                        <p className={styles.notLinked}>Not linked to customer account</p>
                                        <button onClick={handleLinkCustomer} disabled={loading || !profile?.phone}>
                                            {!profile?.phone ? 'Add phone to link' : 'Link Account'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeSection === 'orders' && (
                        <div className={styles.section}>
                            <h3>ORDER HISTORY</h3>
                            <p className={styles.placeholder}>Your order history will appear here.</p>
                            <Link href="/checkout" className={styles.link}>
                                Start Shopping →
                            </Link>
                        </div>
                    )}

                    {activeSection === 'offers' && (
                        <div className={styles.section}>
                            <h3>OFFERS & PROMOTIONS</h3>

                            <div className={styles.offersList}>
                                {profile?.offers && profile.offers.length > 0 ? (
                                    profile.offers.map((offer, index) => (
                                        <div key={index} className={styles.offerCard}>
                                            <div className={styles.offerHeader}>
                                                <span className={styles.offerType}>{offer.type.toUpperCase()}</span>
                                                <span className={styles.offerCode}>{offer.code}</span>
                                            </div>
                                            <p>{offer.description}</p>
                                            <p className={styles.offerExpiry}>
                                                Expires: {new Date(offer.expiresAt).toLocaleDateString()}
                                            </p>
                                            {offer.claimed && <span className={styles.claimed}>CLAIMED</span>}
                                        </div>
                                    ))
                                ) : (
                                    <p className={styles.placeholder}>No offers available at the moment.</p>
                                )}
                            </div>

                            <div className={styles.newsletterSection}>
                                <h4>NEWSLETTER</h4>
                                <p>Stay updated with our latest offers and collections</p>
                                <Link href="/newsletter" className={styles.link}>
                                    Subscribe to Newsletter →
                                </Link>
                            </div>
                        </div>
                    )}

                    {activeSection === 'support' && (
                        <div className={styles.section}>
                            <h3>SUPPORT</h3>

                            <div className={styles.supportOption}>
                                <h4>Report a Bug</h4>
                                <p>Found an issue? Let us know and we'll fix it.</p>
                                <Link href="/contact-us?subject=bug" className={styles.link}>
                                    Report Bug →
                                </Link>
                            </div>

                            <div className={styles.supportOption}>
                                <h4>Contact Us</h4>
                                <p>Have questions? Get in touch with our team.</p>
                                <Link href="/contact-us" className={styles.link}>
                                    Contact Support →
                                </Link>
                            </div>
                        </div>
                    )}
                </div>

                <div className={styles.footer}>
                    <button className={styles.logoutButton} onClick={handleLogout}>
                        LOGOUT
                    </button>
                </div>
            </div>
        </>
    );
}
