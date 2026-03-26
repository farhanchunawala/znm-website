import React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
	size?: number;
}

export const ExportIcon = ({ size = 18, ...props }: IconProps) => (
	<svg 
		width={size} 
		height={size} 
		viewBox="0 0 24 24" 
		fill="none" 
		stroke="currentColor" 
		strokeWidth="2" 
		strokeLinecap="round" 
		strokeLinejoin="round" 
		{...props}
	>
		<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
		<polyline points="7 10 12 15 17 10" />
		<line x1="12" y1="15" x2="12" y2="3" />
	</svg>
);

export const ImportIcon = ({ size = 18, ...props }: IconProps) => (
	<svg 
		width={size} 
		height={size} 
		viewBox="0 0 24 24" 
		fill="none" 
		stroke="currentColor" 
		strokeWidth="2" 
		strokeLinecap="round" 
		strokeLinejoin="round" 
		{...props}
	>
		<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
		<polyline points="17 8 12 3 7 8" />
		<line x1="12" y1="3" x2="12" y2="15" />
	</svg>
);

export const PlusIcon = ({ size = 18, ...props }: IconProps) => (
	<svg 
		width={size} 
		height={size} 
		viewBox="0 0 24 24" 
		fill="none" 
		stroke="currentColor" 
		strokeWidth="2" 
		strokeLinecap="round" 
		strokeLinejoin="round" 
		{...props}
	>
		<line x1="12" y1="5" x2="12" y2="19" />
		<line x1="5" y1="12" x2="19" y2="12" />
	</svg>
);

export const ArrowLeftIcon = ({ size = 18, ...props }: IconProps) => (
	<svg 
		width={size} 
		height={size} 
		viewBox="0 0 24 24" 
		fill="none" 
		stroke="currentColor" 
		strokeWidth="2" 
		strokeLinecap="round" 
		strokeLinejoin="round" 
		{...props}
	>
		<line x1="19" y1="12" x2="5" y2="12" />
		<polyline points="12 19 5 12 12 5" />
	</svg>
);

export const ArrowRightIcon = ({ size = 18, ...props }: IconProps) => (
	<svg 
		width={size} 
		height={size} 
		viewBox="0 0 24 24" 
		fill="none" 
		stroke="currentColor" 
		strokeWidth="2" 
		strokeLinecap="round" 
		strokeLinejoin="round" 
		{...props}
	>
		<line x1="5" y1="12" x2="19" y2="12" />
		<polyline points="12 5 19 12 12 19" />
	</svg>
);
