import DisplayGallery from '@/components/DisplayGallery/DisplayGallery';
import styles from './sherwani.module.scss';

export default function SherwaniPage() {
    const sherwaniCollection = {
        title: 'SHERWANI COLLECTION',
        images: [
            {
                src: '/display-photo/dp5-sherwani.png',
                text: 'Royal Ivory',
            },
            {
                src: '/display-photo/dp5-sherwani.png',
                text: 'Midnight Blue',
            },
            {
                src: '/display-photo/dp5-sherwani.png',
                text: 'Crimson Gold',
            },
            {
                src: '/display-photo/dp5-sherwani.png',
                text: 'Emerald Green',
            },
            {
                src: '/display-photo/dp5-sherwani.png',
                text: 'Pearl White',
            },
            {
                src: '/display-photo/dp5-sherwani.png',
                text: 'Burgundy Silk',
            },
        ],
    };

    return (
        <div className={styles.main}>
            <div className={styles.header}>
                <h1>SHERWANI COLLECTION</h1>
                <p className={styles.description}>
                    Discover our exquisite collection of sherwanis, crafted with precision
                    and adorned with intricate details. Perfect for weddings and special
                    occasions.
                </p>
            </div>
            <DisplayGallery imageGrid={sherwaniCollection} />
        </div>
    );
}
