'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import styles from './feedback.module.scss';
import { StarIcon } from '@/components/Icons/AdminIcons';

export default function FeedbackPage() {
    const params = useParams();
    const token = params.token as string;

    const [loading, setLoading] = useState(true);
    const [orderData, setOrderData] = useState<any>(null);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    const [fittingRating, setFittingRating] = useState(0);
    const [fabricRating, setFabricRating] = useState(0);
    const [serviceRating, setServiceRating] = useState(0);
    const [deliveryPartnerRating, setDeliveryPartnerRating] = useState(0);

    const [fittingComment, setFittingComment] = useState('');
    const [fabricComment, setFabricComment] = useState('');
    const [serviceComment, setServiceComment] = useState('');
    const [deliveryComment, setDeliveryComment] = useState('');

    useEffect(() => {
        fetchOrderData();
    }, [token]);

    const fetchOrderData = async () => {
        try {
            const res = await fetch(`/api/feedback/${token}`);
            const data = await res.json();

            if (res.ok) {
                setOrderData(data);
                if (data.feedbackSubmitted) {
                    setSubmitted(true);
                }
            } else {
                setError(data.error || 'Invalid feedback link');
            }
        } catch (err: any) {
            setError('Failed to load order data');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!fittingRating || !fabricRating || !serviceRating || !deliveryPartnerRating) {
            setError('Please provide all ratings');
            return;
        }

        try {
            const res = await fetch('/api/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token,
                    fittingRating,
                    fabricRating,
                    serviceRating,
                    deliveryPartnerRating,
                    fittingComment,
                    fabricComment,
                    serviceComment,
                    deliveryComment,
                }),
            });

            const data = await res.json();

            if (res.ok) {
                setSubmitted(true);
            } else {
                setError(data.error || 'Failed to submit feedback');
            }
        } catch (err: any) {
            setError('Failed to submit feedback');
        }
    };

    const RatingStars = ({ rating, setRating }: { rating: number; setRating: (r: number) => void }) => (
        <div className={styles.stars}>
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className={styles.starButton}
                >
                    <StarIcon size={32} filled={star <= rating} />
                </button>
            ))}
        </div>
    );

    if (loading) {
        return <div className={styles.loading}>Loading...</div>;
    }

    if (error) {
        return (
            <div className={styles.container}>
                <div className={styles.error}>{error}</div>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className={styles.container}>
                <div className={styles.success}>
                    <h1>Thank You! 🎉</h1>
                    <p>Your feedback has been submitted successfully.</p>
                    <p>We appreciate you taking the time to share your experience with us!</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.feedbackForm}>
                <h1>Share Your Feedback</h1>
                <p className={styles.subtitle}>Order #{orderData?.order?.orderId}</p>

                <form onSubmit={handleSubmit}>
                    <div className={styles.ratingSection}>
                        <h3>Product Fitting</h3>
                        <p>How well did the product fit?</p>
                        <RatingStars rating={fittingRating} setRating={setFittingRating} />
                        <textarea
                            placeholder="Tell us more about the fitting..."
                            value={fittingComment}
                            onChange={(e) => setFittingComment(e.target.value)}
                            className={styles.textarea}
                        />
                    </div>

                    <div className={styles.ratingSection}>
                        <h3>Fabric Quality</h3>
                        <p>How would you rate the fabric quality?</p>
                        <RatingStars rating={fabricRating} setRating={setFabricRating} />
                        <textarea
                            placeholder="Tell us more about the fabric..."
                            value={fabricComment}
                            onChange={(e) => setFabricComment(e.target.value)}
                            className={styles.textarea}
                        />
                    </div>

                    <div className={styles.ratingSection}>
                        <h3>Our Service</h3>
                        <p>How was your overall experience with our service?</p>
                        <RatingStars rating={serviceRating} setRating={setServiceRating} />
                        <textarea
                            placeholder="Tell us more about our service..."
                            value={serviceComment}
                            onChange={(e) => setServiceComment(e.target.value)}
                            className={styles.textarea}
                        />
                    </div>

                    <div className={styles.ratingSection}>
                        <h3>Delivery Partner</h3>
                        <p>How was your delivery experience?</p>
                        <RatingStars rating={deliveryPartnerRating} setRating={setDeliveryPartnerRating} />
                        <textarea
                            placeholder="Tell us more about the delivery..."
                            value={deliveryComment}
                            onChange={(e) => setDeliveryComment(e.target.value)}
                            className={styles.textarea}
                        />
                    </div>

                    <button type="submit" className={styles.submitBtn}>
                        Submit Feedback
                    </button>
                </form>
            </div>
        </div>
    );
}
