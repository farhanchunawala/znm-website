import Image from 'next/image';
import type { Metadata } from 'next';
// import { Counter } from '../components/counter/Counter';
import DisplayGallery from '../components/DisplayGallery/DisplayGallery';
import styles from './styles/Home.module.scss';

import Link from 'next/link';

export default function IndexPage() {
	const imageGrid = {
		title: 'MENSWEAR 26',
		images: [
			{
				src: '/kurta/13.png',
				text: 'Morning Mist',
			},
			{
				src: '/kurta/14.png',
				text: 'Pine Green',
			},
			{
				src: '/kurta/15.png',
				text: 'Seafoam Green',
			},
			{
				src: '/kurta/16.png',
				text: 'Dusty Yale',
			},
			{
				src: '/kurta/17.png',
				text: 'Sterling Palms',
			},
			{
				src: '/kurta/18.png',
				text: 'Vintage Cobalt',
			},
			{
				src: '/kurta/19.png',
				text: 'Castlaton Shine',
			},
			{
				src: '/kurta/20.png',
				text: 'Chanterelle Beige',
			},
		],
	};

	const bestsellers = {
		title: 'BESTSELLERS',
		images: [
			{
				src: '/kurta/1.png',
				text: 'Rustic Orange',
			},
			{
				src: '/suit/black-3.png',
				text: 'Classic Black Suit',
			},
			{
				src: '/thobe/Arabi/1.png',
				text: 'Arabi Thobe',
			},
			{
				src: '/kurta/3.png',
				text: 'Aztec Kurta',
			},
			{
				src: '/suit/velvet-green-2.png',
				text: 'Velvet Green Suit',
			},
			{
				src: '/thobe/Arabi/5.png',
				text: 'Majestic Arabi',
			},
			{
				src: '/kurta/5.png',
				text: 'Lapis',
			},
			{
				src: '/suit/rusty-1.png',
				text: 'Rusty Suit',
			},
			{
				src: '/thobe/Arabi/12.png',
				text: 'Premium Arabi',
			},
			{
				src: '/kurta/11.png',
				text: 'Deep Water Kurta',
			},
			{
				src: '/thobe/Arabi/20.png',
				text: 'Classic Arabi',
			},
			{
				src: '/kurta/12.png',
				text: 'Arzoo A',
			},
		],
	};

	const categories = [
		{ title: 'Sherwani', src: '/display-photo/sherwani_banner.png', href: '/collections/sherwani' },
		{ title: 'Suits', src: '/display-photo/suits_banner.png', href: '/collections/suits' },
		{ title: 'Thobes', src: '/display-photo/thobes_banner.png', href: '/collections/thobe' },
		{ title: 'Kurtas', src: '/display-photo/kurtas_banner.png', href: '/collections/kurtas' },
	];

	return (
		<div className={styles.homepage}>
			{/* Hero Carousel */}
			<div className={`${styles.window}`}>
				<div className={`${styles.box}`}>
					<div className={`${styles.slide}`}>
						<Image
							className={`${styles.img}`}
							src="/display-photo/dp5-sherwani.png"
							alt="Sherwani Collection"
							width="1200"
							height="600"
							priority={true}
						/>
					</div>
					<div className={`${styles.slide}`}>
						<Image
							className={`${styles.img}`}
							src="/display-photo/dp3.1-suits.png"
							alt="Suits Collection"
							width="1200"
							height="600"
							priority={true}
						/>
					</div>
					<div className={`${styles.slide}`}>
						<Image
							className={`${styles.img}`}
							src="/display-photo/dp6-vest.png"
							alt="Vests Collection"
							width="1200"
							height="600"
							priority={true}
						/>
					</div>
					<div className={`${styles.slide}`}>
						<Image
							className={`${styles.img}`}
							src="/display-photo/dp4-kurtas.png"
							alt="Kurtas Collection"
							width="1200"
							height="600"
							priority={true}
						/>
					</div>
					<div className={`${styles.slide}`}>
						<Image
							className={`${styles.img}`}
							src="/display-photo/dp5-sherwani.png"
							alt="Sherwani Collection"
							width="1200"
							height="600"
							priority={true}
						/>
					</div>
					<div className={`${styles.slide}`}>
						<Image
							className={`${styles.img}`}
							src="/display-photo/dp3.1-suits.png"
							alt="Suits Collection"
							width="1200"
							height="600"
							priority={true}
						/>
					</div>
					<div className={`${styles.slide}`}>
						<Image
							className={`${styles.img}`}
							src="/display-photo/dp6-vest.png"
							alt="Vests Collection"
							width="1200"
							height="600"
							priority={true}
						/>
					</div>
					<div className={`${styles.slide}`}>
						<Image
							className={`${styles.img}`}
							src="/display-photo/dp4-kurtas.png"
							alt="Kurtas Collection"
							width="1200"
							height="600"
							priority={true}
						/>
					</div>
				</div>
			</div>

			{/* USP Section */}
			<section className={styles.uspSection}>
				<div className={styles.uspItem}>
					<i className="fa-solid fa-gem"></i>
					<h3>Premium Quality</h3>
					<p>Crafted with the finest fabrics and meticulous attention to detail.</p>
				</div>
				<div className={styles.uspItem}>
					<i className="fa-solid fa-scissors"></i>
					<h3>Custom Tailoring</h3>
					<p>Perfect fit guaranteed with our world-class bespoke services.</p>
				</div>
				<div className={styles.uspItem}>
					<i className="fa-solid fa-globe"></i>
					<h3>Global Shipping</h3>
					<p>Delivering elegance to your doorstep, anywhere in the world.</p>
				</div>
			</section>

			{/* Featured Categories */}
			<section className={styles.categoriesSection}>
				<h2>Explore Collections</h2>
				<div className={styles.categoriesGrid}>
					{categories.map((cat, i) => (
						<Link href={cat.href} key={i}>
							<div className={styles.categoryCard}>
								<Image 
									src={cat.src} 
									alt={cat.title} 
									fill 
									className={styles.categoryImage} 
								/>
								<div className={styles.overlay}>
									<h3>{cat.title}</h3>
								</div>
							</div>
						</Link>
					))}
				</div>
			</section>

			{/* First Gallery */}
			<DisplayGallery imageGrid={bestsellers} />

			{/* About Section */}
			<section className={styles.aboutSection}>
				<div className={styles.content}>
					<h2>Zoll & Metér</h2>
					<p>
						Redefining traditional menswear with a blend of heritage craftsmanship and modern silhouettes. 
						Our collections are designed for the modern gentleman who values elegance, quality, and individuality.
					</p>
					<Link href="/about" className={styles.btn}>Our Story</Link>
				</div>
			</section>

			{/* Second Gallery */}
			<DisplayGallery imageGrid={imageGrid} />
		</div>
	);
}


export const metadata: Metadata = {
	title: 'Zoll & Meter',
};
