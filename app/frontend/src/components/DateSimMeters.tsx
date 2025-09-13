import React from 'react';
import styles from '../styles/components/DateSimMeters.module.css';

interface DateSimMetersProps {
  affinity: number; // -100..+100
  airQuality: number; // 0..100
}

export const DateSimMeters: React.FC<DateSimMetersProps> = ({ affinity, airQuality }) => {
  return (
    <div className={styles.metersRoot}>
      <div className={styles.meterBox}>
        <span className={styles.meterLabel}>好感度</span>
        <div className={styles.meterBarBg}>
          <div
            className={styles.meterBarFill}
            style={{ width: `${(affinity + 100) / 2}%`, background: '#e57373' }}
          />
        </div>
        <span className={styles.meterValue}>{affinity}</span>
      </div>
      <div className={styles.meterBox}>
        <span className={styles.meterLabel}>空気感</span>
        <div className={styles.meterBarBg}>
          <div
            className={styles.meterBarFill}
            style={{ width: `${airQuality}%`, background: '#64b5f6' }}
          />
        </div>
        <span className={styles.meterValue}>{airQuality}</span>
      </div>
    </div>
  );
};
