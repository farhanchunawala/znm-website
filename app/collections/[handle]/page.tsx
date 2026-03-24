import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import DisplayGallery from '@/components/DisplayGallery/DisplayGallery';
import { getCollectionByHandle, getCollectionProducts } from '@/lib/services/collectionService';
import styles from './collection.module.scss';

interface Props {
	params: {
		handle: string;
	};
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const collection = await getCollectionByHandle(params.handle);
	if (!collection) return { title: 'Collection Not Found' };

	return {
		title: `${collection.title} | Zoll & Metér`,
		description: collection.description,
	};
}

export default async function CollectionPage({ params }: Props) {
	const collection = await getCollectionByHandle(params.handle);
	if (!collection) {
		notFound();
	}

	const { products } = await getCollectionProducts(collection._id.toString(), 0, 100);

	const imageGrid = {
		title: collection.title.toUpperCase(),
		images: products.map(p => ({
			_id: p._id,
			title: p.title,
			slug: p.slug,
			src: p.variants?.[0]?.images?.[0] || '/placeholder.png',
		})),
	};

	return (
		<div className={styles.main}>
			<div className={styles.header}>
				<h1>{collection.title.toUpperCase()}</h1>
				{collection.description && (
					<p className={styles.description}>
						{collection.description}
					</p>
				)}
			</div>
			<DisplayGallery imageGrid={imageGrid} />
		</div>
	);
}
