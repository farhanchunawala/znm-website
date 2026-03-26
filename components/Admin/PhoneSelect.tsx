'use client';

import React, { useState, useRef, useEffect } from 'react';
import CountryFlag from '@/components/Common/CountryFlag';
import styles from './PhoneSelect.module.scss';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

interface Country {
	code: string;
	name: string;
	dialCode: string;
}

const countries: Country[] = [
	{ code: 'US', name: 'USA', dialCode: '+1' },
	{ code: 'GB', name: 'UK', dialCode: '+44' },
	{ code: 'IN', name: 'India', dialCode: '+91' },
	{ code: 'AE', name: 'UAE', dialCode: '+971' },
	{ code: 'SA', name: 'Saudi Arabia', dialCode: '+966' },
	{ code: 'QA', name: 'Qatar', dialCode: '+974' },
	{ code: 'KW', name: 'Kuwait', dialCode: '+965' },
	{ code: 'OM', name: 'Oman', dialCode: '+968' },
	{ code: 'BH', name: 'Bahrain', dialCode: '+973' },
	{ code: 'AU', name: 'Australia', dialCode: '+61' },
	{ code: 'SG', name: 'Singapore', dialCode: '+65' },
	{ code: 'MY', name: 'Malaysia', dialCode: '+60' },
	{ code: 'CN', name: 'China', dialCode: '+86' },
	{ code: 'JP', name: 'Japan', dialCode: '+81' },
	{ code: 'KR', name: 'South Korea', dialCode: '+82' },
];

interface PhoneSelectProps {
	value: string;
	onChange: (value: string) => void;
	className?: string;
}

export default function PhoneSelect({ value, onChange, className = '' }: PhoneSelectProps) {
	const [isOpen, setIsOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);

	const selectedCountry = countries.find(c => c.dialCode === value) || countries[2]; // Default to India

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
				setIsOpen(false);
			}
		};
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	return (
		<div className={`${styles.phoneSelect} ${className}`} ref={dropdownRef}>
			<button 
				type="button" 
				className={styles.trigger} 
				onClick={() => setIsOpen(!isOpen)}
			>
				<CountryFlag code={selectedCountry.code} size={18} />
				<span>{selectedCountry.dialCode}</span>
				<ChevronDownIcon className={`${styles.chevron} ${isOpen ? styles.open : ''}`} />
			</button>

			{isOpen && (
				<div className={styles.dropdown}>
					{countries.map((country) => (
						<div 
							key={country.code} 
							className={styles.option}
							onClick={() => {
								onChange(country.dialCode);
								setIsOpen(false);
							}}
						>
							<CountryFlag code={country.code} size={18} />
							<span className={country.dialCode === value ? styles.active : ''}>
								{country.name} ({country.dialCode})
							</span>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
