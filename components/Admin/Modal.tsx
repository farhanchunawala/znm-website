'use client';

import { ReactNode } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import styles from './Modal.module.scss';

interface ModalProps {
	isOpen: boolean;
	onClose: () => void;
	title: string;
	subtitle?: string;
	children: ReactNode;
	size?: 'sm' | 'md' | 'lg';
	footer?: ReactNode;
}

export default function Modal({
	isOpen,
	onClose,
	title,
	subtitle,
	children,
	size = 'md',
	footer,
}: ModalProps) {
	if (!isOpen) return null;

	return (
		<div className={styles.overlay} onClick={onClose}>
			<div
				className={`${styles.modal} ${styles[size]}`}
				onClick={(e) => e.stopPropagation()}
			>
				<div className={styles.header}>
					<div className={styles.titles}>
						<h2>{title}</h2>
						{subtitle && <p>{subtitle}</p>}
					</div>
					<button
						onClick={onClose}
						className={styles.closeBtn}
						aria-label="Close"
					>
						<XMarkIcon />
					</button>
				</div>

				<div className={styles.content}>{children}</div>

				{footer && <div className={styles.footer}>{footer}</div>}
			</div>
		</div>
	);
}
