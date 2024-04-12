import Image from 'next/image';
import type { Metadata } from 'next';
// import { Counter } from '../components/Counter';
import DisplayGallery from '../components/DisplayGallery/DisplayGallery';
import styles from './styles/Home.module.scss';

export default function IndexPage() {
	const imageGrid = {
		title: 'MENSWEAR 23',
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

	return (
		<>
			{/* <Counter /> */}
			<div className={`${styles.window}`}>
				<div className={`${styles.box}`}>
					<Image
						className={`${styles.img}`}
						src="/img0.webp"
						alt="cloth"
						width="1200"
						height="600"
						priority={true}
					/>
					<Image
						className={`${styles.img}`}
						src="/img0.webp"
						alt="cloth"
						width="1200"
						height="600"
						priority={true}
					/>
					<Image
						className={`${styles.img}`}
						src="/img0.webp"
						alt="cloth"
						width="1200"
						height="600"
						priority={true}
					/>
					<Image
						className={`${styles.img}`}
						src="/img0.webp"
						alt="cloth"
						width="1200"
						height="600"
						priority={true}
					/>
					<Image
						className={`${styles.img}`}
						src="/img0.webp"
						alt="cloth"
						width="1200"
						height="600"
						priority={true}
					/>
					<Image
						className={`${styles.img}`}
						src="/img0.webp"
						alt="cloth"
						width="1200"
						height="600"
						priority={true}
					/>
				</div>
			</div>
			<DisplayGallery imageGrid={imageGrid} />
			<DisplayGallery imageGrid={imageGrid} />
			<DisplayGallery imageGrid={imageGrid} />
		</>
	);
}

export const metadata: Metadata = {
	title: 'Redux Toolkit',
};
