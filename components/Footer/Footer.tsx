import React from 'react';
import styles from './Footer.module.scss';
import NewsLetter from '../NewsLetter/NewsLetter';
// import FooterMenu from '../components/FooterMenu';
// import Link from 'next/link';

const Footer = () => {
	return (
		<footer className={`${styles.main}`}>
			<NewsLetter></NewsLetter>
			{/* <FooterMenu></FooterMenu> */}
		</footer>
	);
};

export default Footer;
