'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import styles from './payment-method.module.scss';
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

type PaymentMethod = 'cod' | 'upi' | 'bank' | 'card';

export default function PaymentMethodPage() {
	const router = useRouter();
	const dispatch = useAppDispatch();
	const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null);
	const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState('');
	const [showUnderConstruction, setShowUnderConstruction] = useState(false);
	const [orderSuccess, setOrderSuccess] = useState<{ orderId: string } | null>(null);

	useEffect(() => {
		// Retrieve checkout data from sessionStorage
		const storedData = sessionStorage.getItem('checkoutData');
		if (!storedData) {
			router.push('/checkout');
			return;
		}
		try {
			const parsed = JSON.parse(storedData);
			setCheckoutData(parsed);
		} catch (e) {
			router.push('/checkout');
		}
	}, [router]);

	const handlePlaceOrder = async (paymentMethod: string) => {
		if (!checkoutData) return;

		setIsLoading(true);
		setError('');

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
					method: paymentMethod,
					status: paymentMethod === 'cod' ? 'pending' : 'pending',
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
							paymentMethod: paymentMethod,
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
				setError(errorData.error || 'Failed to place order');
			}
		} catch (err) {
			console.error('Order error:', err);
			setError('An error occurred while placing your order');
		} finally {
			setIsLoading(false);
		}
	};

	const handleMethodSelect = (method: PaymentMethod) => {
		setSelectedMethod(method);
		setError('');
	};

	const handleProceed = () => {
		if (!selectedMethod) {
			setError('Please select a payment method');
			return;
		}

		switch (selectedMethod) {
			case 'cod':
				handlePlaceOrder('COD');
				break;
			case 'upi':
				// Store payment method and redirect to UPI page
				sessionStorage.setItem('paymentMethod', 'UPI');
				router.push('/payment');
				break;
			case 'bank':
			case 'card':
				// Show under construction message
				setShowUnderConstruction(true);
				break;
		}
	};

	if (!checkoutData) {
		return (
			<div className={styles.main}>
				<div className={styles.loading}>Loading...</div>
			</div>
		);
	}

	// Show success screen
	if (orderSuccess) {
		return (
			<div className={styles.main}>
				<div className={styles.successContainer}>
					<div className={styles.successIcon}>✓</div>
					<h1>Order Placed Successfully!</h1>
					<p className={styles.orderId}>Order ID: {orderSuccess.orderId}</p>
					<p>
						Thank you for your order! We&apos;ve sent a confirmation email to your registered email address.
					</p>
					<p className={styles.note}>
						Your order will be processed shortly. You can pay cash on delivery.
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

	return (
		<div className={styles.main}>
			<h1>SELECT PAYMENT METHOD</h1>

			<div className={styles.container}>
				<div className={styles.paymentOptions}>
					{/* COD Option */}
					<div
						className={`${styles.paymentOption} ${selectedMethod === 'cod' ? styles.selected : ''}`}
						onClick={() => handleMethodSelect('cod')}
					>
						<div className={styles.optionIcon}>💵</div>
						<div className={styles.optionContent}>
							<h3>Cash on Delivery</h3>
							<p>Pay when your order arrives</p>
						</div>
						<div className={styles.radioCircle}>
							{selectedMethod === 'cod' && <div className={styles.radioFill} />}
						</div>
					</div>

					{/* UPI Option */}
					<div
						className={`${styles.paymentOption} ${selectedMethod === 'upi' ? styles.selected : ''}`}
						onClick={() => handleMethodSelect('upi')}
					>
						<div className={styles.optionIcon}>📱</div>
						<div className={styles.optionContent}>
							<h3>UPI Payment</h3>
							<p>Pay using Google Pay, PhonePe, Paytm, or any UPI app</p>
						</div>
						<div className={styles.radioCircle}>
							{selectedMethod === 'upi' && <div className={styles.radioFill} />}
						</div>
					</div>

					{/* Bank Transfer Option - Under Construction */}
					<div
						className={`${styles.paymentOption} ${styles.disabled} ${selectedMethod === 'bank' ? styles.selected : ''}`}
						onClick={() => handleMethodSelect('bank')}
					>
						<div className={styles.optionIcon}>🏦</div>
						<div className={styles.optionContent}>
							<h3>Bank Transfer <span className={styles.comingSoon}>Coming Soon</span></h3>
							<p>Direct bank transfer (NEFT/IMPS/RTGS)</p>
						</div>
						<div className={styles.radioCircle}>
							{selectedMethod === 'bank' && <div className={styles.radioFill} />}
						</div>
					</div>

					{/* Card Option - Under Construction */}
					<div
						className={`${styles.paymentOption} ${styles.disabled} ${selectedMethod === 'card' ? styles.selected : ''}`}
						onClick={() => handleMethodSelect('card')}
					>
						<div className={styles.optionIcon}>💳</div>
						<div className={styles.optionContent}>
							<h3>Credit / Debit Card <span className={styles.comingSoon}>Coming Soon</span></h3>
							<p>Visa, Mastercard, RuPay</p>
						</div>
						<div className={styles.radioCircle}>
							{selectedMethod === 'card' && <div className={styles.radioFill} />}
						</div>
					</div>
				</div>

				{/* Order Summary Sidebar */}
				<div className={styles.orderSummary}>
					<h2>Order Summary</h2>
					
					{checkoutData.cartItems.map((item) => (
						<div key={`${item.id}-${item.size}`} className={styles.summaryItem}>
							<Image
								src={item.image}
								alt={item.title}
								width={50}
								height={65}
							/>
							<div className={styles.itemDetails}>
								<span className={styles.itemTitle}>{item.title}</span>
								<span className={styles.itemMeta}>Size: {item.size} × {item.quantity}</span>
							</div>
							<span className={styles.itemPrice}>
								Rs. {(item.price * item.quantity).toLocaleString()}
							</span>
						</div>
					))}

					<div className={styles.summaryDivider} />

					<div className={styles.summaryRow}>
						<span>Subtotal</span>
						<span>
							Rs.{' '}
							{checkoutData.cartItems
								.reduce((sum, item) => sum + item.price * item.quantity, 0)
								.toLocaleString()}
						</span>
					</div>

					{checkoutData.appliedCoupon && (
						<div className={`${styles.summaryRow} ${styles.discount}`}>
							<span>Discount</span>
							<span>- Rs. {checkoutData.appliedCoupon.discount}</span>
						</div>
					)}

					<div className={styles.summaryRow}>
						<span>Shipping</span>
						<span>FREE</span>
					</div>

					<div className={`${styles.summaryRow} ${styles.total}`}>
						<span>Total</span>
						<span>Rs. {checkoutData.total.toFixed(2)}</span>
					</div>
				</div>
			</div>

			{error && <div className={styles.errorMessage}>{error}</div>}

			<div className={styles.actionButtons}>
				<button
					className={styles.backButton}
					onClick={() => router.back()}
					disabled={isLoading}
				>
					← Back to Checkout
				</button>
				<button
					className={`${styles.proceedButton} ${isLoading ? styles.loading : ''}`}
					onClick={handleProceed}
					disabled={!selectedMethod || isLoading}
				>
					{isLoading
						? 'Processing...'
						: selectedMethod === 'cod'
							? 'Place Order'
							: selectedMethod === 'upi'
								? 'Proceed to Pay'
								: selectedMethod === 'bank'
									? 'View Bank Details'
									: selectedMethod === 'card'
										? 'Pay Now'
										: 'Select Payment Method'}
				</button>
			</div>

			{/* Under Construction Modal */}
			{showUnderConstruction && (
				<div className={styles.modalOverlay} onClick={() => setShowUnderConstruction(false)}>
					<div className={styles.modal} onClick={(e) => e.stopPropagation()}>
						<div className={styles.modalIcon}>🚧</div>
						<h2>Under Construction</h2>
						<p>
							This payment method is currently under development. 
							Please use <strong>Cash on Delivery</strong> or <strong>UPI Payment</strong> for now.
						</p>
						<button 
							className={styles.modalButton}
							onClick={() => setShowUnderConstruction(false)}
						>
							Got it
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
