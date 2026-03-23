import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './collections.module.scss';
import { Metadata } from 'next';

export const metadata: Metadata = {
	title: 'Collections | Zoll & Metér',
	description:
		'Explore our exclusive collections of Kurtas, Sherwanis, Suits, and more.',
};

const collections = [
	{
		title: 'Kurtas',
		image: '/display-photo/kurtas_thumb.png',
		link: '/collections/kurtas',
	},
	{
		title: 'Sherwanis',
		image: '/display-photo/sherwanis_thumb.png',
		link: '/collections/sherwani',
	},
	{
		title: 'Suits',
		image: '/display-photo/suits_thumb.png',
		link: '/collections/suits',
	},
	{
		title: 'Waist Coats',
		image: '/display-photo/waist_coats_thumb.png',
		link: '/collections/waist-coat',
	},
	{
		title: 'Trousers',
		image: '/display-photo/trousers_thumb.png',
		link: '/collections/trousers',
	},
	{
		title: 'Festive Collection',
		image: '/display-photo/festive_thumb.png',
		link: '/collections/festive-collection',
	},
];

export default function CollectionsPage() {
	return (
		<div className={styles.main}>
			<h1>OUR COLLECTIONS</h1>
			<div className={styles.grid}>
				{collections.map((collection, index) => (
					<Link
						href={collection.link}
						key={index}
						className={styles.card}
					>
						<div className={styles.imageWrapper}>
							<Image
								src={collection.image}
								alt={collection.title}
								fill
								sizes="(max-width: 768px) 50vw, 33vw"
								priority={index < 4}
							/>
						</div>
						<div className={styles.content}>
							<h2>{collection.title}</h2>
						</div>
					</Link>
				))}
			</div>
		</div>
	);
}
