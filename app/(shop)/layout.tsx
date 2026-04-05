import type { ReactNode } from 'react';
import { Navbar } from '../../components/Navbar/Navbar';
import { OfferBar } from '../../components/OfferBar/OfferBar';
import Footer from '../../components/Footer/Footer';
import styles from '../styles/layout.module.css';

interface Props {
	readonly children: ReactNode;
}

export default function MainLayout({ children }: Props) {
	return (
		<section className={styles.container}>
			<OfferBar />
			<Navbar />
			<main className={styles.main}>{children}</main>
			<Footer />
		</section>
	);
}
