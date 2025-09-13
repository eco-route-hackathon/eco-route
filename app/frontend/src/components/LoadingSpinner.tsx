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
    <div className={styles.container}>
      <div className={spinnerClass}>
        <div className={styles.spinnerInner}>
          <div className={styles.truck}>🚚</div>
          <div className={styles.ship}>🚢</div>
        </div>
        <div className={styles.dots}>
          <span className={styles.dot}></span>
          <span className={styles.dot}></span>
          <span className={styles.dot}></span>
        </div>
      </div>
      {message && (
        <p className={styles.message}>{message}</p>
      )}
    </div>
  );
};