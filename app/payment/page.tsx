'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './payment.module.scss';

interface CheckoutData {
	formData: any;
	cartItems: any[];
	total: number;
	appliedCoupon: any;
}

declare global {
	interface Window {
		Razorpay: any;
	}
}

export default function PaymentPage() {
	const router = useRouter();
	const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isProcessing, setIsProcessing] = useState(false);
	const [notification, setNotification] = useState<{
		message: string;
		type: 'success' | 'error';
	} | null>(null);

	useEffect(() => {
		// Retrieve checkout data from sessionStorage
		const data = sessionStorage.getItem('checkoutData');
		if (data) {
			try {
				setCheckoutData(JSON.parse(data));
			} catch (error) {
				setNotification({
					message: 'Failed to load checkout data',
					type: 'error',
				});
				setTimeout(() => router.push('/checkout'), 2000);
			}
		} else {
			setNotification({
				message: 'No checkout data found',
				type: 'error',
			});
			setTimeout(() => router.push('/checkout'), 2000);
		}
		setIsLoading(false);

		// Load Razorpay script
		const script = document.createElement('script');
		script.src = 'https://checkout.razorpay.com/v1/checkout.js';
		script.async = true;
		document.body.appendChild(script);

		return () => {
			document.body.removeChild(script);
		};
	}, [router]);

	const handlePayment = async () => {
		if (!checkoutData) return;

		setIsProcessing(true);

		try {
			// Create order on backend
			const orderResponse = await fetch('/api/payments/create-order', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					amount: Math.round(checkoutData.total * 100), // Convert to paise
					currency: 'INR',
					receipt: `order_${Date.now()}`,
				}),
			});

			if (!orderResponse.ok) {
				throw new Error('Failed to create order');
			}

			const orderData = await orderResponse.json();

			// Initialize Razorpay payment
			const options = {
				key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
				amount: Math.round(checkoutData.total * 100), // Amount in paise
				currency: 'INR',
				name: 'Zoll & Metér',
				description: 'Order Payment',
				order_id: orderData.orderId,
				prefill: {
					name: `${checkoutData.formData.firstName} ${checkoutData.formData.lastName}`,
					email: checkoutData.formData.email,
					contact: checkoutData.formData.phone,
				},
				handler: async function (response: any) {
					// Payment successful, verify signature
					const verifyResponse = await fetch('/api/payments/verify', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							razorpay_order_id:
								response.razorpay_order_id,
							razorpay_payment_id:
								response.razorpay_payment_id,
							razorpay_signature:
								response.razorpay_signature,
							checkoutData: checkoutData,
						}),
					});

					const verifyData = await verifyResponse.json();

					if (verifyResponse.ok && verifyData.success) {
						setNotification({
							message:
								'Payment successful! Order placed.',
							type: 'success',
						});
						sessionStorage.removeItem('checkoutData');
						setTimeout(
							() => router.push('/orders'),
							2000
						);
					} else {
						setNotification({
							message:
								'Payment verification failed. Please contact support.',
							type: 'error',
						});
					}
				},
				modal: {
					ondismiss: function () {
					},
				},
			};

			const razorpayInstance = new window.Razorpay(
				options
			);
			razorpayInstance.open();
		} catch (error) {
			setNotification({
				message: 'Payment initialization failed. Please try again.',
				type: 'error',
			});
		} finally {
			setIsProcessing(false);
		}
	};

	if (isLoading) {
		return (
			<div className={styles.container}>
				<div className={styles.loading}>Loading...</div>
			</div>
		);
	}

	if (!checkoutData) {
		return (
			<div className={styles.container}>
				<div className={styles.error}>
					Unable to load payment details
				</div>
			</div>
		);
	}

	return (
		<div className={styles.container}>
			<div className={styles.paymentWrapper}>
				<div className={styles.header}>
					<h1>Payment</h1>
					<button
						className={styles.backButton}
						onClick={() => {
							sessionStorage.setItem(
								'checkoutData',
								JSON.stringify(checkoutData)
							);
							router.push('/checkout');
						}}
					>
						← Back to Checkout
					</button>
				</div>

				<div className={styles.paymentContainer}>
					<div className={styles.orderSummary}>
						<h2>Order Summary</h2>

						<div className={styles.customerInfo}>
							<h3>Delivery Address</h3>
							<p>
								<strong>
									{checkoutData.formData.firstName}{' '}
									{checkoutData.formData.lastName}
								</strong>
							</p>
							<p>{checkoutData.formData.address}</p>
							<p>
								{checkoutData.formData.city},{' '}
								{checkoutData.formData.state}
							</p>
							<p>
								{checkoutData.formData.country} -{' '}
								{checkoutData.formData.zipCode}
							</p>
							<p>{checkoutData.formData.phone}</p>
						</div>

						<div className={styles.itemsDetails}>
							<h3>Items</h3>
							{checkoutData.cartItems.map((item: any) => (
								<div
									key={item.productId}
									className={styles.cartItem}
								>
									<span className={styles.itemName}>
										{item.name}
									</span>
									<span className={styles.itemQuantity}>
										Qty: {item.quantity}
									</span>
									<span className={styles.itemPrice}>
										Rs. {item.price.toFixed(2)}
									</span>
								</div>
							))}
						</div>

						<div className={styles.pricingSummary}>
							<div className={styles.summaryRow}>
								<span>Subtotal</span>
								<span>
									Rs. {checkoutData.total.toLocaleString()}
								</span>
							</div>
							{checkoutData.appliedCoupon && (
								<div
									className={`${styles.summaryRow} ${styles.discount}`}
								>
									<span>
										Discount (
										{checkoutData.appliedCoupon.code})
									</span>
									<span>
										- Rs.{' '}
										{checkoutData.appliedCoupon
											.discountType ===
										'percentage'
											? (
													(checkoutData.total *
														checkoutData
															.appliedCoupon
															.discount) /
													100
												).toFixed(2)
											: checkoutData.appliedCoupon.discount.toFixed(
													2
												)}
									</span>
								</div>
							)}
							<div className={`${styles.summaryRow} ${styles.total}`}>
								<span>Total Amount</span>
								<span>
									Rs. {checkoutData.total.toFixed(2)}
								</span>
							</div>
						</div>
					</div>

					<div className={styles.paymentMethods}>
						<h2>Payment Method</h2>

						<div className={styles.razorpayContainer}>
							<div className={styles.razorpayInfo}>
								<h3>Razorpay Secure Payment</h3>
								<p>
									Complete your payment securely using Razorpay
								</p>
							</div>

							<button
								className={`${styles.paymentButton} ${isProcessing ? styles.loading : ''}`}
								onClick={handlePayment}
								disabled={isProcessing}
							>
								{isProcessing
									? 'Processing...'
									: `Pay Rs. ${checkoutData.total.toFixed(2)}`}
							</button>

							<div className={styles.securityInfo}>
								<p>🔒 Your payment information is secure</p>
								<p>
									SSL encrypted and PCI DSS compliant
								</p>
							</div>
						</div>
					</div>
				</div>

				{notification && (
					<div
						className={`${styles.notificationBar} ${styles[notification.type]}`}
					>
						{notification.message}
					</div>
				)}
			</div>
		</div>
	);
}
