import React from 'react';

interface CountryFlagProps {
	code: string;
	size?: number;
	className?: string;
}

const flagData: Record<string, React.ReactNode> = {
	IN: (
		<svg viewBox="0 0 640 480">
			<path fill="#f4c430" d="M0 0h640v160H0z" />
			<path fill="#fff" d="M0 160h640v160H0z" />
			<path fill="#248828" d="M0 320h640v160H0z" />
			<g transform="translate(320 240)">
				<circle r="70" fill="none" stroke="#000080" strokeWidth="2" />
				<circle r="15" fill="#000080" />
				<path fill="#000080" d="M0-70V70M-70 0h140" />
			</g>
		</svg>
	),
	AE: (
		<svg viewBox="0 0 640 480">
			<path fill="#00732f" d="M0 0h640v160H0z" />
			<path fill="#fff" d="M0 160h640v160H0z" />
			<path fill="#000" d="M0 320h640v160H0z" />
			<path fill="red" d="M0 0h160v480H0z" />
		</svg>
	),
	SA: (
		<svg viewBox="0 0 640 480">
			<path fill="#006c35" d="M0 0h640v480H0z" />
			<path fill="#fff" d="M160 240l80-40v80z" />
			<path fill="#fff" stroke="#fff" strokeWidth="5" d="M200 320h240" />
		</svg>
	),
	GB: (
		<svg viewBox="0 0 640 480">
			<path fill="#012169" d="M0 0h640v480H0z" />
			<path fill="#fff" d="M0 0l640 480M640 0L0 480" stroke="#fff" strokeWidth="60" />
			<path fill="#C8102E" d="M0 0l640 480M640 0L0 480" stroke="#C8102E" strokeWidth="40" />
			<path fill="#fff" d="M320 0v480M0 240h640" stroke="#fff" strokeWidth="100" />
			<path fill="#C8102E" d="M320 0v480M0 240h640" stroke="#C8102E" strokeWidth="60" />
		</svg>
	),
	US: (
		<svg viewBox="0 0 640 480">
			<path fill="#fff" d="M0 0h640v480H0z" />
			<path d="M0 0h640v37H0zm0 74h640v37H0zm0 74h640v37H0zm0 74h640v37H0zm0 74h640v37H0zm0 74h640v37H0z" fill="#b22234" />
			<path fill="#3c3b6e" d="M0 0h256v258H0z" />
		</svg>
	),
	// Fallback for others
	DEFAULT: (
		<svg viewBox="0 0 640 480">
			<rect width="640" height="480" fill="#ddd" />
			<text x="50%" y="55%" textAnchor="middle" fill="#999" fontSize="200">?</text>
		</svg>
	)
};

export default function CountryFlag({ code, size = 18, className = '' }: CountryFlagProps) {
	const flag = flagData[code.toUpperCase()] || flagData.DEFAULT;
	return (
		<div 
			className={className} 
			style={{ 
				width: size, 
				height: (size * 3) / 4, 
				display: 'inline-flex', 
				alignItems: 'center', 
				justifyContent: 'center',
				borderRadius: '2px',
				overflow: 'hidden',
				verticalAlign: 'middle',
				flexShrink: 0
			}}
		>
			{flag}
		</div>
	);
}
