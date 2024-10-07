import React from 'react';
import styles from './DisplayGallery.module.scss';
import Image from 'next/image';
import Link from 'next/link';

const DisplayGallery = ({ imageGrid }) => {
	return (
		<>
			<div className={`${styles.main}`}>
				<h2>{imageGrid.title}</h2>
				<div className={`${styles.container}`}>
					{imageGrid.images.map((image, index) => (
						<div className={`${styles.frame}`} key={index}>
							<Link href="/product">
								<Image
									src={image.src}
									alt={image.text}
									width="205"
									height="286"
								/>
								<p className={`${styles.imgtext}`}>
									{image.text}
								</p>
							</Link>
						</div>
					))}
					<Link
						className={`${styles.viewall}`}
						href="/collections/kurtas"
					>
						VIEW ALL
					</Link>
				</div>
			</div>
		</>
	);
};

export default DisplayGallery;
