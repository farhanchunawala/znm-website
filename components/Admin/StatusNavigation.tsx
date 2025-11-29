import React, { useState } from 'react';
import styles from './StatusNavigation.module.scss';
import {
    PendingIcon,
    FulfilledIcon,
    ShippedIcon,
    LogisticsIcon,
    DeliveredIcon,
} from '@/components/Icons/AdminIcons';

interface StatusNavigationProps {
    currentStatus: 'pending' | 'fulfilled' | 'shipped' | 'outForDelivery' | 'delivered';
    onStatusChange: (newStatus: string, data?: any) => Promise<void>;
    entityType: 'order' | 'shipment';
    entityId: string;
}

const STATUS_FLOW = ['pending', 'fulfilled', 'shipped', 'outForDelivery', 'delivered'];

const STATUS_LABELS: Record<string, string> = {
    pending: 'Pending',
    fulfilled: 'Fulfilled',
    shipped: 'Shipped',
    outForDelivery: 'Out for Delivery',
    delivered: 'Delivered',
};

const STATUS_ICONS: Record<string, any> = {
    pending: PendingIcon,
    fulfilled: FulfilledIcon,
    shipped: ShippedIcon,
    outForDelivery: LogisticsIcon,
    delivered: DeliveredIcon,
};

export default function StatusNavigation({ currentStatus, onStatusChange, entityType, entityId }: StatusNavigationProps) {
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState<'forward' | 'backward'>('forward');
    const [processing, setProcessing] = useState(false);

    const currentIndex = STATUS_FLOW.indexOf(currentStatus);
    const canGoBack = currentIndex > 0;
    const canGoForward = currentIndex < STATUS_FLOW.length - 1;

    const previousStatus = canGoBack ? STATUS_FLOW[currentIndex - 1] : null;
    const nextStatus = canGoForward ? STATUS_FLOW[currentIndex + 1] : null;

    const handleBackward = () => {
        if (!previousStatus) return;
        setModalType('backward');
        setShowModal(true);
    };

    const handleForward = () => {
        if (!nextStatus) return;
        setModalType('forward');
        setShowModal(true);
    };

    const handleConfirm = async (data?: any) => {
        setProcessing(true);
        try {
            const targetStatus = modalType === 'forward' ? nextStatus : previousStatus;
            if (targetStatus) {
                await onStatusChange(targetStatus, data);
                setShowModal(false);
            }
        } catch (error) {
            console.error('Failed to change status:', error);
            alert('Failed to update status');
        } finally {
            setProcessing(false);
        }
    };

    const PreviousIcon = previousStatus ? STATUS_ICONS[previousStatus] : null;
    const NextIcon = nextStatus ? STATUS_ICONS[nextStatus] : null;

    return (
        <>
            <div className={styles.statusNavigation}>
                {canGoBack && previousStatus && (
                    <button onClick={handleBackward} className={styles.backBtn} disabled={processing}>
                        {PreviousIcon && <PreviousIcon size={20} />}
                        <span>← Back to {STATUS_LABELS[previousStatus]}</span>
                    </button>
                )}

                <div className={styles.currentStatus}>
                    {STATUS_ICONS[currentStatus] && React.createElement(STATUS_ICONS[currentStatus], { size: 24 })}
                    <span>{STATUS_LABELS[currentStatus]}</span>
                </div>

                {canGoForward && nextStatus && (
                    <button onClick={handleForward} className={styles.forwardBtn} disabled={processing}>
                        <span>Forward to {STATUS_LABELS[nextStatus]} →</span>
                        {NextIcon && <NextIcon size={20} />}
                    </button>
                )}
            </div>

            {showModal && (
                <TransitionModal
                    currentStatus={currentStatus}
                    targetStatus={modalType === 'forward' ? nextStatus! : previousStatus!}
                    modalType={modalType}
                    onConfirm={handleConfirm}
                    onCancel={() => setShowModal(false)}
                    processing={processing}
                    entityType={entityType}
                />
            )}
        </>
    );
}

// Transition Modal Component
interface TransitionModalProps {
    currentStatus: string;
    targetStatus: string;
    modalType: 'forward' | 'backward';
    onConfirm: (data?: any) => void;
    onCancel: () => void;
    processing: boolean;
    entityType: 'order' | 'shipment';
}

function TransitionModal({ currentStatus, targetStatus, modalType, onConfirm, onCancel, processing, entityType }: TransitionModalProps) {
    const [packagingProvider, setPackagingProvider] = useState<'we' | 'courier'>('we');
    const [courierName, setCourierName] = useState('');

    const needsPackagingInfo = currentStatus === 'fulfilled' && targetStatus === 'shipped';
    const needsCourierOnly = currentStatus === 'shipped' && targetStatus === 'outForDelivery';

    const handleSubmit = () => {
        if (needsPackagingInfo) {
            if (!courierName.trim()) {
                alert('Please enter courier name');
                return;
            }
            onConfirm({ packagingProvider, courierName });
        } else if (needsCourierOnly) {
            if (!courierName.trim()) {
                alert('Please enter courier name');
                return;
            }
            onConfirm({ courierName });
        } else {
            onConfirm();
        }
    };

    return (
        <div className={styles.modalOverlay} onClick={onCancel}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <h2>
                    {modalType === 'forward' ? 'Forward' : 'Move Back'} to {STATUS_LABELS[targetStatus]}
                </h2>

                {needsPackagingInfo && (
                    <div className={styles.modalContent}>
                        <div className={styles.formGroup}>
                            <label>Box and Paper Bag Provider</label>
                            <div className={styles.radioGroup}>
                                <label className={styles.radioLabel}>
                                    <input
                                        type="radio"
                                        value="we"
                                        checked={packagingProvider === 'we'}
                                        onChange={(e) => setPackagingProvider(e.target.value as 'we' | 'courier')}
                                    />
                                    <span>We Provide</span>
                                </label>
                                <label className={styles.radioLabel}>
                                    <input
                                        type="radio"
                                        value="courier"
                                        checked={packagingProvider === 'courier'}
                                        onChange={(e) => setPackagingProvider(e.target.value as 'we' | 'courier')}
                                    />
                                    <span>Courier Provides</span>
                                </label>
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label>Courier Name *</label>
                            <input
                                type="text"
                                value={courierName}
                                onChange={(e) => setCourierName(e.target.value)}
                                placeholder="Enter courier name"
                                className={styles.input}
                                list="courier-suggestions"
                            />
                            <datalist id="courier-suggestions">
                                <option value="Blue Dart" />
                                <option value="DTDC" />
                                <option value="Delhivery" />
                                <option value="FedEx" />
                                <option value="India Post" />
                            </datalist>
                        </div>

                        <p className={styles.note}>
                            This will generate an invoice and send it to the customer via email.
                        </p>
                    </div>
                )}

                {needsCourierOnly && (
                    <div className={styles.modalContent}>
                        <div className={styles.formGroup}>
                            <label>Courier Name *</label>
                            <input
                                type="text"
                                value={courierName}
                                onChange={(e) => setCourierName(e.target.value)}
                                placeholder="Enter courier name"
                                className={styles.input}
                                list="courier-suggestions"
                            />
                            <datalist id="courier-suggestions">
                                <option value="Blue Dart" />
                                <option value="DTDC" />
                                <option value="Delhivery" />
                                <option value="FedEx" />
                                <option value="India Post" />
                            </datalist>
                        </div>
                    </div>
                )}

                {!needsPackagingInfo && !needsCourierOnly && (
                    <div className={styles.modalContent}>
                        <p>
                            Are you sure you want to {modalType === 'forward' ? 'forward' : 'move back'} this {entityType} to{' '}
                            <strong>{STATUS_LABELS[targetStatus]}</strong>?
                        </p>
                        {targetStatus === 'fulfilled' && (
                            <p className={styles.note}>This will send an order fulfilled email to the customer.</p>
                        )}
                        {targetStatus === 'delivered' && (
                            <p className={styles.note}>This will send a delivery confirmation email with feedback link.</p>
                        )}
                    </div>
                )}

                <div className={styles.modalActions}>
                    <button onClick={onCancel} className={styles.cancelBtn} disabled={processing}>
                        Cancel
                    </button>
                    <button onClick={handleSubmit} className={styles.confirmBtn} disabled={processing}>
                        {processing ? 'Processing...' : 'Confirm'}
                    </button>
                </div>
            </div>
        </div>
    );
}
