import Image from 'next/image';
import type { Metadata } from 'next';
// import { Counter } from '../components/counter/Counter';
import DisplayGallery from '../components/DisplayGallery/DisplayGallery';
import styles from './styles/Home.module.scss';

export default function IndexPage() {
	const imageGrid = {
		title: 'MENSWEAR 25',
		images: [
			{
				src: '/img1.webp',
				text: 'Morning Mist',
			},
			{
				src: '/img2.webp',
				text: 'Pine Green',
			},
			{
				src: '/img3.webp',
				text: 'Seafoam Green',
			},
			{
				src: '/img4.webp',
				text: 'Dusty Yale',
			},
			{
				src: '/img5.webp',
				text: 'Sterling Palms',
			},
			{
				src: '/img6.webp',
				text: 'Vintage Cobalt',
			},
			{
				src: '/img7.jpg',
				text: 'Castlaton Shine',
			},
			{
				src: '/img8.webp',
				text: 'Chanterelle Beige',
			},
		],
	};

	const kurtas = {
		title: 'Kurtas',
		images: [
			{
				src: '/kurtas/kurta1.1.webp',
				text: 'Rustic Orange',
			},
			{
				src: '/kurtas/kurta2.1.webp',
				text: 'Nahua',
			},
			{
				src: '/kurtas/kurta3.1.webp',
				text: 'Aztec Kurta',
			},
			{
				src: '/kurtas/kurta4.1.webp',
				text: 'brunette',
			},
			{
				src: '/kurtas/kurta5.1.webp',
				text: 'Lapis',
			},
			{
				src: '/kurtas/kurta6.1.webp',
				text: 'Gwalior',
			},
			{
				src: '/kurtas/kurta7.1.webp',
				text: 'Asfar Kurta',
			},
			{
				src: '/kurtas/kurta8.1.webp',
				text: 'Zuhal',
			},
			{
				src: '/kurtas/kurta9.1.webp',
				text: 'Ilia',
			},
			{
				src: '/kurtas/kurta10.1.webp',
				text: 'Iyad',
			},
			{
				src: '/kurtas/kurta11.2.webp',
				text: 'Deep Water Kurta',
			},
			{
				src: '/kurtas/kurta12.1.webp',
				text: 'Arzoo A',
			},
		],
	};

	return (
		<>
			{/* <Counter /> */}
			<div className={`${styles.window}`}>
				<div className={`${styles.box}`}>
					<div className={`${styles.slide}`}>
						<Image
							className={`${styles.img}`}
							src="/display-photo/dp1.1-thobes.png"
							alt="cloth"
							width="1200"
							height="600"
							priority={true}
						/>
					</div>
					<div className={`${styles.slide}`}>
						<Image
							className={`${styles.img}`}
							src="/display-photo/dp2.1-shirts.png"
							alt="cloth"
							width="1200"
							height="600"
							priority={true}
						/>
					</div>
					<div className={`${styles.slide}`}>
						<Image
							className={`${styles.img}`}
							src="/display-photo/dp3.1-suits.png"
							alt="cloth"
							width="1200"
							height="600"
							priority={true}
						/>
					</div>
					<div className={`${styles.slide}`}>
						<Image
							className={`${styles.img}`}
							src="/display-photo/dp4-kurtas.png"
							alt="cloth"
							width="1200"
							height="600"
							priority={true}
						/>
					</div>
					<div className={`${styles.slide}`}>
						<Image
							className={`${styles.img}`}
							src="/display-photo/dp5-sherwani.png"
							alt="cloth"
							width="1200"
							height="600"
							priority={true}
						/>
					</div>
					<div className={`${styles.slide}`}>
						<Image
							className={`${styles.img}`}
							src="/display-photo/dp6-vest.png"
							alt="cloth"
							width="1200"
							height="600"
							priority={true}
						/>
					</div>
				</div>
			</div>
			<DisplayGallery imageGrid={kurtas} />
			<DisplayGallery imageGrid={imageGrid} />
			{/* <DisplayGallery imageGrid={imageGrid} /> */}
		</>
	);
}

export const metadata: Metadata = {
	title: 'Zoll & Meter',
};
