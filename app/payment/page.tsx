'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import styles from './payment.module.scss';
import { useAppDispatch } from '@/lib/hooks';
import { clearCart } from '@/lib/features/cartSlice';

interface CheckoutData {
	formData: {
		email: string;
		firstName: string;
		lastName: string;
		address: string;
		city: string;
		state: string;
		country: string;
		zipCode: string;
		phoneCode: string;
		phone: string;
	};
	cartItems: Array<{
		id: string;
		title: string;
		price: number;
		quantity: number;
		size: string;
		image: string;
	}>;
	total: number;
	appliedCoupon: { code: string; discount: number; discountType: string } | null;
}

export default function PaymentPage() {
	const router = useRouter();
	const dispatch = useAppDispatch();
	const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isProcessing, setIsProcessing] = useState(false);
	const [notification, setNotification] = useState<{
		message: string;
		type: 'success' | 'error';
	} | null>(null);
	const [orderSuccess, setOrderSuccess] = useState<{ orderId: string } | null>(null);

	// UPI details - configure these in environment variables
	const UPI_ID = process.env.NEXT_PUBLIC_UPI_ID || 'zollandmeter@upi';
	const MERCHANT_NAME = 'Zoll and Meter';

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
	}, [router]);

	// Generate UPI payment URL for QR code
	const generateUPIUrl = (amount: number) => {
		const note = `Order at Zoll and Meter`;
		return `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(MERCHANT_NAME)}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(note)}`;
	};

	// Generate QR code URL using a QR code API
	const getQRCodeUrl = (upiUrl: string) => {
		// Using QR Server API (free, no registration required)
		return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUrl)}`;
	};

	const handlePaymentConfirmation = async () => {
		if (!checkoutData) return;

		setIsProcessing(true);

		try {
			// Create order via API
			const orderPayload = {
				customer: {
					email: checkoutData.formData.email,
					firstName: checkoutData.formData.firstName,
					lastName: checkoutData.formData.lastName,
					phone: `${checkoutData.formData.phoneCode}${checkoutData.formData.phone}`,
				},
				shippingAddress: {
					firstName: checkoutData.formData.firstName,
					lastName: checkoutData.formData.lastName,
					address: checkoutData.formData.address,
					city: checkoutData.formData.city,
					state: checkoutData.formData.state,
					country: checkoutData.formData.country,
					zipCode: checkoutData.formData.zipCode,
					phone: `${checkoutData.formData.phoneCode}${checkoutData.formData.phone}`,
				},
				items: checkoutData.cartItems.map((item) => ({
					productId: item.id,
					title: item.title,
					price: item.price,
					quantity: item.quantity,
					size: item.size,
					image: item.image,
				})),
				totals: {
					subtotal: checkoutData.cartItems.reduce(
						(sum, item) => sum + item.price * item.quantity,
						0
					),
					shipping: 0,
					tax: checkoutData.total * 0.1,
					discount: checkoutData.appliedCoupon?.discount || 0,
					grandTotal: checkoutData.total,
				},
				payment: {
					method: 'UPI',
					status: 'pending', // Will be verified manually
				},
				couponCode: checkoutData.appliedCoupon?.code || null,
			};

			const response = await fetch('/api/orders', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(orderPayload),
			});

			if (response.ok) {
				const order = await response.json();
				// Clear checkout data and cart
				sessionStorage.removeItem('checkoutData');
				sessionStorage.removeItem('paymentMethod');
				dispatch(clearCart());
				// Store order ID for confirmation page
				sessionStorage.setItem('lastOrderId', order._id);

				// Send confirmation emails via API
				try {
					await fetch('/api/orders/send-emails', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							orderId: order._id || order.orderNumber,
							customerEmail: checkoutData.formData.email,
							customerName: `${checkoutData.formData.firstName} ${checkoutData.formData.lastName}`,
							customerPhone: `${checkoutData.formData.phoneCode}${checkoutData.formData.phone}`,
							items: checkoutData.cartItems.map((item) => ({
								title: item.title,
								quantity: item.quantity,
								size: item.size,
								price: item.price * item.quantity,
							})),
							total: checkoutData.total,
							paymentMethod: 'UPI',
							shippingAddress: {
								address: checkoutData.formData.address,
								city: checkoutData.formData.city,
								state: checkoutData.formData.state,
								zipCode: checkoutData.formData.zipCode,
								country: checkoutData.formData.country,
							},
						}),
					});
				} catch (emailErr) {
					console.error('Failed to send emails:', emailErr);
					// Don't block order success if emails fail
				}

				// Show success screen
				setOrderSuccess({ orderId: order._id || order.orderNumber });
			} else {
				const errorData = await response.json();
				setNotification({
					message: errorData.error || 'Failed to place order',
					type: 'error',
				});
			}
		} catch (err) {
			console.error('Order error:', err);
			setNotification({
				message: 'An error occurred while placing your order',
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

	// Show success screen
	if (orderSuccess) {
		return (
			<div className={styles.container}>
				<div className={styles.successContainer}>
					<div className={styles.successIcon}>✓</div>
					<h1>Order Placed Successfully!</h1>
					<p className={styles.orderId}>Order ID: {orderSuccess.orderId}</p>
					<p>
						Thank you for your order! We&apos;ve sent a confirmation email to your registered email address.
					</p>
					<p className={styles.note}>
						Your UPI payment is being verified. We&apos;ll update you once the payment is confirmed.
					</p>
					<button
						className={styles.homeButton}
						onClick={() => router.push('/')}
					>
						Continue Shopping
					</button>
				</div>
			</div>
		);
	}

	const upiUrl = generateUPIUrl(checkoutData.total);
	const qrCodeUrl = getQRCodeUrl(upiUrl);

	return (
		<div className={styles.container}>
			<div className={styles.paymentWrapper}>
				<div className={styles.header}>
					<h1>UPI Payment</h1>
					<button
						className={styles.backButton}
						onClick={() => router.push('/payment-method')}
					>
						← Back to Payment Methods
					</button>
				</div>

				<div className={styles.paymentContainer}>
					{/* QR Code Section */}
					<div className={styles.qrSection}>
						<h2>Scan to Pay</h2>
						<div className={styles.qrCodeContainer}>
							<div className={styles.qrCode}>
								{/* eslint-disable-next-line @next/next/no-img-element */}
								<img
									src={qrCodeUrl}
									alt="UPI QR Code"
									width={250}
									height={250}
								/>
							</div>
							<div className={styles.amountBadge}>
								<span className={styles.amountLabel}>Amount to Pay</span>
								<span className={styles.amountValue}>₹{checkoutData.total.toFixed(2)}</span>
							</div>
						</div>
						<div className={styles.upiInfo}>
							<p className={styles.upiId}>
								<strong>UPI ID:</strong> {UPI_ID}
							</p>
							<p className={styles.instructions}>
								Open any UPI app (Google Pay, PhonePe, Paytm, etc.) and scan this QR code to pay
							</p>
						</div>
						<div className={styles.upiApps}>
							<span>Pay using:</span>
							<div className={styles.appLogos}>
								<div className={styles.appBadge}>Google Pay</div>
								<div className={styles.appBadge}>PhonePe</div>
								<div className={styles.appBadge}>Paytm</div>
								<div className={styles.appBadge}>BHIM</div>
							</div>
						</div>
					</div>

					{/* Order Summary */}
					<div className={styles.orderSummary}>
						<h2>Order Summary</h2>

						<div className={styles.itemsSection}>
							<h3>Products</h3>
							{checkoutData.cartItems.map((item) => (
								<div key={`${item.id}-${item.size}`} className={styles.productItem}>
									<div className={styles.productImage}>
										<Image
											src={item.image}
											alt={item.title}
											width={60}
											height={80}
										/>
									</div>
									<div className={styles.productDetails}>
										<span className={styles.productTitle}>{item.title}</span>
										<span className={styles.productMeta}>
											Size: {item.size} | Qty: {item.quantity}
										</span>
									</div>
									<span className={styles.productPrice}>
										₹{(item.price * item.quantity).toLocaleString()}
									</span>
								</div>
							))}
						</div>

						<div className={styles.pricingSummary}>
							<div className={styles.summaryRow}>
								<span>Subtotal</span>
								<span>
									₹{checkoutData.cartItems
										.reduce((sum, item) => sum + item.price * item.quantity, 0)
										.toLocaleString()}
								</span>
							</div>
							{checkoutData.appliedCoupon && (
								<div className={`${styles.summaryRow} ${styles.discount}`}>
									<span>Discount ({checkoutData.appliedCoupon.code})</span>
									<span>-₹{checkoutData.appliedCoupon.discount}</span>
								</div>
							)}
							<div className={styles.summaryRow}>
								<span>Shipping</span>
								<span>FREE</span>
							</div>
							<div className={`${styles.summaryRow} ${styles.total}`}>
								<span>Total</span>
								<span>₹{checkoutData.total.toFixed(2)}</span>
							</div>
						</div>

						<div className={styles.customerDetails}>
							<h3>Delivery Address</h3>
							<p>
								<strong>
									{checkoutData.formData.firstName}{' '}
									{checkoutData.formData.lastName}
								</strong>
							</p>
							<p>{checkoutData.formData.address}</p>
							<p>
								{checkoutData.formData.city}, {checkoutData.formData.state}
							</p>
							<p>
								{checkoutData.formData.country} - {checkoutData.formData.zipCode}
							</p>
							<p>{checkoutData.formData.phoneCode}{checkoutData.formData.phone}</p>
						</div>
					</div>
				</div>

				<div className={styles.actionSection}>
					<div className={styles.confirmationNote}>
						<p>
							<strong>After completing the payment:</strong> Click the button below to confirm your order. 
							Our team will verify your payment and process your order.
						</p>
					</div>
					<button
						className={`${styles.confirmButton} ${isProcessing ? styles.loading : ''}`}
						onClick={handlePaymentConfirmation}
						disabled={isProcessing}
					>
						{isProcessing ? 'Processing...' : "I've Completed the Payment"}
					</button>
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
