'use client';
import { useState } from 'react';
import styles from './Navbar.module.scss';
import SideNav from '../SideNav/SideNav';
import Link from 'next/link';

export const Navbar = () => {
	const [isHidden, setIsHidden] = useState(true);

	const handleClick = () => {
		setIsHidden(!isHidden);
	};

	return (
		<div className={`${styles.main}`}>
			<div className={`${styles.header}`}>
				<svg
					onClick={handleClick}
					className={`${styles.hamburger}`}
					xmlns="http://www.w3.org/2000/svg"
					width="32"
					height="33"
					viewBox="0 0 32 33"
					fill="none"
				>
					<path d="M4 23.9688H28V25.9688H4V23.9688Z" fill="black" />
					<path d="M4 15.9688H28V17.9688H4V15.9688Z" fill="black" />
					<path d="M4 7.96875H28V9.96875H4V7.96875Z" fill="black" />
				</svg>
				<h1 className={`${styles.heading} ${styles.text}`}>
					ZOLL & METER
				</h1>
			</div>
			<nav className={styles.mainnav}>
				<div className={`${styles.navbar}`}>
					{/* <Link className={`${styles.link}`} href='/'>Home</Link> */}
					{/* <Link className={`${styles.link}`} href='/customer-list'>Customer List</Link> */}
					<Link
						className={`${styles.link}`}
						href="/collections/suits"
					>
						Suit
					</Link>
					<Link
						className={`${styles.link}`}
						href="/collections/prince-coat"
					>
						Prince Coat
					</Link>
					<Link
						className={`${styles.link}`}
						href="/collections/waist-coat"
					>
						Waist Coat
					</Link>
					<Link
						className={`${styles.link}`}
						href="/collections/kurtas"
					>
						Kurtas
					</Link>
					<Link
						className={`${styles.link}`}
						href="/collections/shirts"
					>
						Shirts
					</Link>
					<Link
						className={`${styles.link}`}
						href="/collections/trousers"
					>
						Trousers
					</Link>
				</div>
			</nav>
			{isHidden ? null : <SideNav></SideNav>}
		</div>
	);
};
