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
				src: '/',
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
		title: 'KURTAS',
		images: [
			{
				src: '/kurta/1.png',
				text: 'Rustic Orange',
			},
			{
				src: '/kurta/2.png',
				text: 'Nahua',
			},
			{
				src: '/kurta/3.png',
				text: 'Aztec Kurta',
			},
			{
				src: '/kurta/4.png',
				text: 'brunette',
			},
			{
				src: '/kurta/5.png',
				text: 'Lapis',
			},
			{
				src: '/kurta/6.png',
				text: 'Gwalior',
			},
			{
				src: '/kurta/7.png',
				text: 'Asfar Kurta',
			},
			{
				src: '/kurta/8.png',
				text: 'Zuhal',
			},
			{
				src: '/kurta/9.png',
				text: 'Ilia',
			},
			{
				src: '/kurta/10.png',
				text: 'Iyad',
			},
			{
				src: '/kurta/11.png',
				text: 'Deep Water Kurta',
			},
			{
				src: '/kurta/12.png',
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
							src="/display-photo/dp6-vest.png"
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
							src="/display-photo/dp1.1-kurtas.png"
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
