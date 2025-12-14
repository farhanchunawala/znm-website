import React from 'react';
import styles from './layout.module.scss';

/**
 * Devtest Dashboard Layout
 * Shared layout for all devtest pages
 */

interface LayoutProps {
  children: React.ReactNode;
}

const DevtestLayout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className={styles.devtestLayout}>
      <nav className={styles.navbar}>
        <div className={styles.navContainer}>
          <div className={styles.logo}>
            <a href="/devfurqan">
              <span className={styles.emoji}>🧪</span>
              <span className={styles.title}>Devtest</span>
            </a>
          </div>
          
          <ul className={styles.navLinks}>
            <li>
              <a href="/devfurqan" className={styles.navLink}>
                Dashboard
              </a>
            </li>
            <li>
              <a href="/devfurqan/runner" className={styles.navLink}>
                Tests
              </a>
            </li>
            <li>
              <a href="/devfurqan/results" className={styles.navLink}>
                Results
              </a>
            </li>
            <li>
              <a href="/devfurqan/payment-simulator" className={styles.navLink}>
                Payments
              </a>
            </li>
            <li>
              <a href="/devfurqan/data-manager" className={styles.navLink}>
                Data
              </a>
            </li>
            <li>
              <a href="/devfurqan/architect" className={styles.navLink}>
                Flows
              </a>
            </li>
          </ul>
          
          <a href="/api/devtest/tests" className={styles.apiLink} target="_blank" rel="noopener">
            📡 API Docs
          </a>
        </div>
      </nav>
      
      <main className={styles.main}>
        {children}
      </main>
      
      <footer className={styles.footer}>
        <p>System Verification Dashboard • Development Testing Environment</p>
      </footer>
    </div>
  );
};

export default DevtestLayout;
