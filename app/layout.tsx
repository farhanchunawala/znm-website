import type { ReactNode } from 'react';
import { StoreProvider } from './StoreProvider';
import { Navbar } from '../components/Navbar/Navbar';
import Footer from '../components/Footer/Footer';
// import Image from 'next/image';
import Script from 'next/script';

import './styles/globals.scss';
import styles from './styles/layout.module.scss';

interface Props {
	readonly children: ReactNode;
}

export default function RootLayout({ children }: Props) {
	return (
		<StoreProvider>
			<html lang="en">
				<head>
					<Script
						src="https://kit.fontawesome.com/80b27366cd.js"
						crossOrigin="anonymous"
					></Script>
				</head>
				<body>
					<section className={styles.container}>
						<Navbar />

						{/* <header className={styles.header}>
							<Image
								src="/logo.svg"
								className={styles.logo}
								alt="logo"
								width={100}
								height={100}
							/>
						</header> */}

						<main className={styles.main}>{children}</main>

						<Footer />
						{/* <footer className={styles.footer}>
							<span>Learn </span>
							<a
								className={styles.link}
								href="https://reactjs.org"
								target="_blank"
								rel="noopener noreferrer"
							>
								React
							</a>
							<span>, </span>
							<a
								className={styles.link}
								href="https://redux.js.org"
								target="_blank"
								rel="noopener noreferrer"
							>
								Redux
							</a>
							<span>, </span>
							<a
								className={styles.link}
								href="https://redux-toolkit.js.org"
								target="_blank"
								rel="noopener noreferrer"
							>
								Redux Toolkit
							</a>
							<span>, </span>
							<a
								className={styles.link}
								href="https://react-redux.js.org"
								target="_blank"
								rel="noopener noreferrer"
							>
								React Redux
							</a>
							,<span> and </span>
							<a
								className={styles.link}
								href="https://reselect.js.org"
								target="_blank"
								rel="noopener noreferrer"
							>
								Reselect
							</a>
						</footer> */}
					</section>
				</body>
			</html>
		</StoreProvider>
	);
}
