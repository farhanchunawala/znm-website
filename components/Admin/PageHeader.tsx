'use client';

import { ReactNode } from 'react';
import styles from './PageHeader.module.scss';

interface PageHeaderProps {
	title: string;
	subtitle?: string;
	icon?: ReactNode;
	actions?: ReactNode;
}

export default function PageHeader({
	title,
	subtitle,
	icon,
	actions,
}: PageHeaderProps) {
	return (
		<div className={styles.header}>
			<div className={styles.titleSection}>
				{icon && <div className={styles.icon}>{icon}</div>}
				<div className={styles.titles}>
					<h1>{title}</h1>
					{subtitle && <p className={styles.subtitle}>{subtitle}</p>}
				</div>
			</div>
			{actions && <div className={styles.actions}>{actions}</div>}
		</div>
	);
}
