import type { ReactNode } from 'react';
import { StoreProvider } from './StoreProvider';
import Script from 'next/script';

import './styles/variables.css';
import './styles/globals.css';

interface Props {
	readonly children: ReactNode;
}

export default function RootLayout({ children }: Props) {
	return (
		<StoreProvider>
			<html lang="en">
				<head>
					<link
						rel="stylesheet"
						href="https://fonts.googleapis.com/icon?family=Material+Icons"
					></link>
					<Script
						src="https://kit.fontawesome.com/80b27366cd.js"
						crossOrigin="anonymous"
					></Script>
				</head>
				<body>
					{children}
				</body>
			</html>
		</StoreProvider>
	);
}
