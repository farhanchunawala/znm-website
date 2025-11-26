'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './feedback.module.scss';
import { StarIcon, ExportIcon } from '@/components/Icons/AdminIcons';

interface Feedback {
    _id: string;
    orderId: any;
    customerId: any;
    fittingRating: number;
    fabricRating: number;
    serviceRating: number;
    deliveryPartnerRating: number;
    fittingComment?: string;
    fabricComment?: string;
    serviceComment?: string;
    deliveryComment?: string;
    createdAt: string;
}

export default function AdminFeedbackPage() {
    const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState('latest');

    useEffect(() => {
        fetchFeedbacks();
    }, [sortBy]);

    const fetchFeedbacks = async () => {
        try {
            const res = await fetch(`/api/admin/feedback?sort=${sortBy}`);
            const data = await res.json();
            setFeedbacks(data);
        } catch (error) {
            console.error('Failed to fetch feedbacks:', error);
        } finally {
            setLoading(false);
        }
    };

    const exportToCSV = () => {
        const headers = ['Order ID', 'Customer', 'Date', 'Fitting', 'Fabric', 'Service', 'Delivery', 'Avg Rating'];
        const rows = feedbacks.map(f => [
            f.orderId?.orderId || 'N/A',
            `${f.customerId?.firstName} ${f.customerId?.lastName}`,
            new Date(f.createdAt).toLocaleDateString(),
            f.fittingRating,
            f.fabricRating,
            f.serviceRating,
            f.deliveryPartnerRating,
            ((f.fittingRating + f.fabricRating + f.serviceRating + f.deliveryPartnerRating) / 4).toFixed(1),
        ]);

        const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `feedback-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    const RatingDisplay = ({ rating }: { rating: number }) => (
        <div className={styles.ratingDisplay}>
            {[1, 2, 3, 4, 5].map((star) => (
                <StarIcon key={star} size={16} filled={star <= rating} />
            ))}
            <span>{rating}/5</span>
        </div>
    );

    const getAverageRating = (feedback: Feedback) => {
        return ((feedback.fittingRating + feedback.fabricRating + feedback.serviceRating + feedback.deliveryPartnerRating) / 4).toFixed(1);
    };

    return (
        <div className={styles.feedbackPage}>
            <div className={styles.header}>
                <h1>Customer Feedback</h1>
                <div className={styles.actions}>
                    <button onClick={exportToCSV} className={styles.exportBtn}>
                        <ExportIcon size={18} />
                        Export CSV
                    </button>
                </div>
            </div>

            <div className={styles.filters}>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={styles.sortSelect}>
                    <option value="latest">Latest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="highestRated">Highest Rated</option>
                    <option value="lowestRated">Lowest Rated</option>
                </select>
            </div>

            {loading ? (
                <div className={styles.loading}>Loading feedback...</div>
            ) : (
                <>
                    <div className={styles.stats}>
                        <span>{feedbacks.length} feedback entries</span>
                        <span>
                            Avg Rating: {feedbacks.length > 0
                                ? (feedbacks.reduce((sum, f) => sum + parseFloat(getAverageRating(f)), 0) / feedbacks.length).toFixed(1)
                                : '0.0'}/5
                        </span>
                    </div>

                    <div className={styles.feedbackList}>
                        {feedbacks.map((feedback) => (
                            <div key={feedback._id} className={styles.feedbackCard}>
                                <div className={styles.feedbackHeader}>
                                    <div>
                                        <h3>Order #{feedback.orderId?.orderId || 'N/A'}</h3>
                                        <p className={styles.customer}>
                                            {feedback.customerId?.firstName} {feedback.customerId?.lastName}
                                        </p>
                                        <p className={styles.date}>
                                            {new Date(feedback.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className={styles.averageRating}>
                                        <div className={styles.ratingNumber}>{getAverageRating(feedback)}</div>
                                        <div className={styles.ratingLabel}>Average</div>
                                    </div>
                                </div>

                                <div className={styles.ratings}>
                                    <div className={styles.ratingItem}>
                                        <span className={styles.ratingLabel}>Fitting</span>
                                        <RatingDisplay rating={feedback.fittingRating} />
                                        {feedback.fittingComment && (
                                            <p className={styles.comment}>{feedback.fittingComment}</p>
                                        )}
                                    </div>

                                    <div className={styles.ratingItem}>
                                        <span className={styles.ratingLabel}>Fabric</span>
                                        <RatingDisplay rating={feedback.fabricRating} />
                                        {feedback.fabricComment && (
                                            <p className={styles.comment}>{feedback.fabricComment}</p>
                                        )}
                                    </div>

                                    <div className={styles.ratingItem}>
                                        <span className={styles.ratingLabel}>Service</span>
                                        <RatingDisplay rating={feedback.serviceRating} />
                                        {feedback.serviceComment && (
                                            <p className={styles.comment}>{feedback.serviceComment}</p>
                                        )}
                                    </div>

                                    <div className={styles.ratingItem}>
                                        <span className={styles.ratingLabel}>Delivery</span>
                                        <RatingDisplay rating={feedback.deliveryPartnerRating} />
                                        {feedback.deliveryComment && (
                                            <p className={styles.comment}>{feedback.deliveryComment}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
