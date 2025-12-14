'use client';

import { ReactNode } from 'react';
import styles from './Card.module.scss';

interface CardProps {
	title?: string;
	subtitle?: string;
	children: ReactNode;
	footer?: ReactNode;
	action?: ReactNode;
	className?: string;
}

export default function Card({
	title,
	subtitle,
	children,
	footer,
	action,
	className,
}: CardProps) {
	return (
		<div className={`${styles.card} ${className || ''}`}>
			{(title || action) && (
				<div className={styles.header}>
					<div className={styles.titles}>
						{title && <h3>{title}</h3>}
						{subtitle && <p>{subtitle}</p>}
					</div>
					{action && <div className={styles.action}>{action}</div>}
				</div>
			)}

			<div className={styles.content}>{children}</div>

			{footer && <div className={styles.footer}>{footer}</div>}
		</div>
	);
}
