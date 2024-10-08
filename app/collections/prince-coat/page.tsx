import Head from 'next/head';
// import Image from 'next/image';
import styles from '../../styles/Home.module.scss';
// import { Inter } from 'next/font/google';
// const inter = Inter({ subsets: ['latin'] });
import DisplayGallery from '@/components/DisplayGallery/DisplayGallery';

export default function Home() {
	const imageGrid = {
		title: '',
		images: [
			{
				src: '/sherwani/sherwani 1.1.webp',
				text: 'Morning Mist',
			},
			{
				src: '/sherwani/sherwani 2.1.webp',
				text: 'Pine Green',
			},
			{
				src: '/sherwani/sherwani 3.1.webp',
				text: 'Seafoam Green',
			},
			{
				src: '/sherwani/sherwani 4.1.webp',
				text: 'Dusty Yale',
			},
			{
				src: '/sherwani/sherwani 5.1.webp',
				text: 'Sterling Palms',
			},
			{
				src: '/sherwani/sherwani 6.1.webp',
				text: 'Vintage Cobalt',
			},
			{
				src: '/sherwani/sherwani 7.1.webp',
				text: 'Castlaton Shine',
			},
			{
				src: '/sherwani/sherwani 8.1.webp',
				text: 'Chanterelle Beige',
			},
			{
				src: '/sherwani/sherwani 9.1.webp',
				text: 'Chanterelle Beige',
			},
			{
				src: '/sherwani/sherwani 10.1.webp',
				text: 'Chanterelle Beige',
			},
			{
				src: '/sherwani/sherwani 11.1.webp',
				text: 'Chanterelle Beige',
			},
			{
				src: '/sherwani/sherwani 12.1.webp',
				text: 'Chanterelle Beige',
			},
		],
	};

	return (
		<>
			<Head>
				<title>Prince Coat</title>
				<meta
					name="description"
					content="Generated by create next app"
				/>
				<meta
					name="viewport"
					content="width=device-width, initial-scale=1"
				/>
				<link rel="icon" href="/zmlogo.png" />
			</Head>
			<main className={`${styles.homepage}`}>
				<DisplayGallery imageGrid={imageGrid}></DisplayGallery>
				<footer></footer>
			</main>
		</>
	);
}
