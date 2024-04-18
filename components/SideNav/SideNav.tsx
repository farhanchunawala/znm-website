import styles from './SideNav.module.scss';
import Link from 'next/link';

const SideNav = () => {
	return (
		<div className={`${styles.main}`}>
			<div className={`${styles.box}`}>
				{/* <Link className={`${styles.link}`} href='/'>HOME</Link> <br></br> */}
				{/* <Link className={`${styles.link}`} href='/customer-list'>CUSTOMER LIST</Link> <br></br> */}
				<Link className={`${styles.link}`} href="/collections/suit">
					SUIT
				</Link>
				<Link
					className={`${styles.link}`}
					href="/collections/prince-coat"
				>
					PRINCE COAT
				</Link>
				<Link
					className={`${styles.link}`}
					href="/collections/waist-coat"
				>
					WAIST COAT
				</Link>
				<Link className={`${styles.link}`} href="/collections/kurtas">
					KURTAS
				</Link>
				<Link className={`${styles.link}`} href="/collections/shirts">
					SHIRTS
				</Link>
				<Link className={`${styles.link}`} href="/collections/trousers">
					TROUSERS
				</Link>
				{/* <div className={`${styles.form}`}>
				<input type="search" id="search" placeholder="SEARCH"/>
				<button type="button" onClick="myFunction()">SEARCH</button>
			</div> */}
			</div>
		</div>
	);
};

export default SideNav;
