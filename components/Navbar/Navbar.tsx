'use client';
import { useState } from 'react';
import styles from './Navbar.module.scss';
import SideNav from '../SideNav/SideNav';
import Link from 'next/link';
import { SearchIcon } from '../Icons/SearchIcon';
import { UserIcon } from '../Icons/UserIcon';
import { CartIcon } from '../Icons/CartIcon';

import { useAppSelector } from '@/lib/hooks';
import { selectCartCount } from '@/lib/features/cartSlice';

export const Navbar = () => {
	const [isHidden, setIsHidden] = useState(true);
	const cartCount = useAppSelector(selectCartCount);
	const [showSearch, setShowSearch] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');

	const handleClick = () => {
		setIsHidden(!isHidden);
	};

	const handleSearchToggle = () => {
		setShowSearch(!showSearch);
		if (showSearch) {
			setSearchQuery('');
		}
	};

	const handleSearchSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (searchQuery.trim()) {
			// Here you would typically navigate to search results
			alert(`Searching for: ${searchQuery}`);
			// router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
		}
	};

	return (
		<div className={`${styles.main}`}>
			<div className={`${styles.header}`}>
				<div className={styles.topBar}>
					<div className={styles.leftSection}>
						<div className={styles.searchIcon} onClick={handleSearchToggle}>
							<SearchIcon width={20} height={20} />
						</div>
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
					</div>

					<Link href="/" className={`${styles.heading} ${styles.text}`}>
						<div className={styles.logoContainer}>
							<img src="/images/znm-logo.png" alt="Logo" className={styles.logoSymbol} />
							<span className={styles.logoName}>ZOLL & METÉR</span>
						</div>
					</Link>

					<div className={styles.rightSection}>
						<Link href="/account" className={styles.iconLink}>
							<UserIcon width={20} height={20} />
						</Link>
						<Link href="/cart" className={styles.iconLink}>
							<div className={styles.cartIconWrapper}>
								<CartIcon width={20} height={20} />
								{cartCount > 0 && <span className={styles.cartCount}>{cartCount}</span>}
							</div>
						</Link>
					</div>
				</div>
			</div>
			{showSearch && (
				<div className={styles.searchBar}>
					<form onSubmit={handleSearchSubmit}>
						<input
							type="text"
							placeholder="Search for products..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							autoFocus
						/>
						<button type="submit">Search</button>
					</form>
				</div>
			)}
			<nav className={styles.mainnav}>
				<div className={`${styles.navbar}`}>
					<Link className={`${styles.link}`} href="/collections/suroor">
						SUROOR
					</Link>
					<Link className={`${styles.link}`} href="/collections/vault">
						VAULT
					</Link>
					<Link className={`${styles.link}`} href="/collections/new-in">
						NEW IN
					</Link>
					<Link className={`${styles.link}`} href="/collections/late-checkout">
						LATE CHECKOUT AT THE FRED
					</Link>
					<Link className={`${styles.link}`} href="/collections/kurtas">
						KURTA
					</Link>
					<Link className={`${styles.link}`} href="/collections/sherwani">
						SHERWANI
					</Link>
					<Link className={`${styles.link}`} href="/collections/prince-coat">
						PRINCE COAT
					</Link>
					<Link className={`${styles.link}`} href="/collections/waist-coat">
						WAIST COAT
					</Link>
					<Link className={`${styles.link}`} href="/collections/accessories">
						ACCESSORIES
					</Link>
				</div>
			</nav>
			{isHidden ? null : <SideNav></SideNav>}
		</div>
	);
};
