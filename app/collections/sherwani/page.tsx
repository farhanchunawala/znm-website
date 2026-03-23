import DisplayGallery from '@/components/DisplayGallery/DisplayGallery';
import styles from './sherwani.module.scss';

export default function SherwaniPage() {
	const sherwaniCollection = {
		title: 'SHERWANI COLLECTION',
		images: [
			{
				src: '/kurta/80.png',
				text: 'Royal Ivory Sherwani',
			},
			{
				src: '/kurta/81.png',
				text: 'Midnight Blue Gold',
			},
			{
				src: '/kurta/82.png',
				text: 'Crimson Velvet',
			},
			{
				src: '/kurta/83.png',
				text: 'Emerald Regal',
			},
			{
				src: '/kurta/84.png',
				text: 'Pearl White Classic',
			},
			{
				src: '/kurta/85.png',
				text: 'Burgundy Prince',
			},
			{
				src: '/kurta/86.png',
				text: 'Sapphire Elegance',
			},
			{
				src: '/kurta/87.png',
				text: 'Desert Sand Sherwani',
			},
			{
				src: '/kurta/88.png',
				text: 'Ruby Traditional',
			},
			{
				src: '/kurta/89.png',
				text: 'Forest Green Gold',
			},
			{
				src: '/kurta/90.png',
				text: 'Onyx Luxury',
			},
			{
				src: '/kurta/91.png',
				text: 'Imperial Gold',
			},
		],
	};

	return (
		<div className={styles.main}>
			<div className={styles.header}>
				<h1>SHERWANI COLLECTION</h1>
				<p className={styles.description}>
					Discover our exquisite collection of sherwanis, crafted with
					precision and adorned with intricate details. Perfect for
					weddings and special occasions.
				</p>
			</div>
			<DisplayGallery imageGrid={sherwaniCollection} />
		</div>
	);
}
