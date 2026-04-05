import type { ReactNode } from 'react';

interface Props {
	readonly children: ReactNode;
}

export default function AuthLayout({ children }: Props) {
	return (
		<div className="auth-layout">
			{children}
		</div>
	);
}
