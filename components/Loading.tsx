import * as React from 'react'

import styles from './styles.module.css'

export const Loading: React.FC = () => (
  <div className={`${styles.container} ${styles.loadingPage}`}>
    <div className={styles.loadingSheet}>
      <div role='status' className={styles.loadingLabel}>
        <span className={styles.loadingSpark} aria-hidden='true'>
          ✦
        </span>
        Getting your next read ready
        <span className={styles.loadingDots} aria-hidden='true'>
          <i />
          <i />
          <i />
        </span>
      </div>
      <div className={styles.loadingSkeleton} aria-hidden='true'>
        <span />
        <span />
        <span />
        <span />
      </div>
    </div>
  </div>
)
