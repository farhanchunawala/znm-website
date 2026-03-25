'use client';

import { useTheme } from '@/lib/contexts/ThemeContext';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import styles from './ThemeToggle.module.scss';

export default function ThemeToggle({ showLabel = true }: { showLabel?: boolean }) {
	const { theme, toggleTheme } = useTheme();

	return (
		<button
			onClick={toggleTheme}
			className={`${styles.toggleBtn} ${!showLabel ? styles.collapsed : ''}`}
			aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
			title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
		>
			{theme === 'light' ? (
				<MoonIcon className={styles.icon} />
			) : (
				<SunIcon className={styles.icon} />
			)}
			{showLabel && (
				<span className={styles.label}>
					{theme === 'light' ? 'Dark' : 'Light'} Mode
				</span>
			)}
		</button>
	);
}
