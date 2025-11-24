import styles from './about.module.scss';

export default function AboutPage() {
    return (
        <div className={styles.main}>
            <h1>ABOUT ZOLL & METÉR</h1>
            <p className={styles.subtitle}>
                Crafting Excellence in Menswear Since Our Inception
            </p>

            <div className={styles.content}>
                <p>
                    Welcome to Zoll & Metér, where tradition meets contemporary elegance.
                    We are dedicated to creating exceptional menswear that celebrates
                    craftsmanship, quality, and timeless style.
                </p>

                <p>
                    Our journey began with a simple vision: to provide discerning gentlemen
                    with clothing that not only looks exceptional but feels extraordinary.
                    Every piece in our collection is thoughtfully designed and meticulously
                    crafted to ensure the highest standards of quality and comfort.
                </p>

                <h2>Our Philosophy</h2>
                <p>
                    At Zoll & Metér, we believe that clothing is more than just fabric—it's
                    an expression of identity, confidence, and personal style. We draw
                    inspiration from classic tailoring traditions while embracing modern
                    design sensibilities to create pieces that are both timeless and
                    contemporary.
                </p>

                <div className={styles.values}>
                    <div className={styles.value}>
                        <h3>Quality</h3>
                        <p>
                            We source the finest materials and work with skilled artisans to
                            ensure every garment meets our exacting standards.
                        </p>
                    </div>
                    <div className={styles.value}>
                        <h3>Craftsmanship</h3>
                        <p>
                            Each piece is crafted with attention to detail, honoring traditional
                            techniques while embracing innovation.
                        </p>
                    </div>
                    <div className={styles.value}>
                        <h3>Elegance</h3>
                        <p>
                            Our designs embody sophistication and refinement, perfect for the
                            modern gentleman who values style.
                        </p>
                    </div>
                </div>

                <h2>Our Collection</h2>
                <p>
                    From elegant kurtas and sherwanis to contemporary suits and accessories,
                    our collection offers a diverse range of options for every occasion.
                    Whether you're dressing for a wedding, a formal event, or simply want to
                    elevate your everyday style, Zoll & Metér has something exceptional for
                    you.
                </p>

                <p>
                    Thank you for choosing Zoll & Metér. We look forward to being part of
                    your style journey.
                </p>
            </div>
        </div>
    );
}
