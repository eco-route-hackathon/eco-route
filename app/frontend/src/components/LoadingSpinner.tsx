import React from 'react';
import styles from '../styles/components/LoadingSpinner.module.css';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  message?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  message
}) => {
  const spinnerClass = [
    styles.spinner,
    styles[size]
  ].join(' ');

  return (
    <div className={styles.container} role="status" aria-live="polite">
      <div className={spinnerClass}>
        <div className={styles.spinnerInner} aria-hidden="true">
          <div className={styles.truck}>🚚</div>
          <div className={styles.ship}>🚢</div>
        </div>
        <div className={styles.dots} aria-hidden="true">
          <span className={styles.dot}></span>
          <span className={styles.dot}></span>
          <span className={styles.dot}></span>
        </div>
      </div>
      {message && (
        <p className={styles.message} aria-label={`読み込み状況: ${message}`}>
          {message}
        </p>
      )}
      <span className="sr-only">読み込み中です。しばらくお待ちください。</span>
    </div>
  );
};