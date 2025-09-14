import React, { useEffect } from 'react';
import styles from '../styles/components/ShuzoOverlay.module.css';

interface ShuzoOverlayProps {
  visible: boolean;
  onFinish?: () => void;
  durationMs?: number;
}

export const ShuzoOverlay: React.FC<ShuzoOverlayProps> = ({
  visible,
  onFinish,
  durationMs = 3000,
}) => {
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => {
      onFinish && onFinish();
    }, durationMs);
    return () => clearTimeout(t);
  }, [visible, durationMs, onFinish]);

  if (!visible) return null;

  return (
    <div className={styles.backdrop} role="dialog" aria-live="assertive">
      <div className={styles.card}>
        <img src="/assets/syuzo.png" alt="松岡修造" className={styles.shuzoImg} />
        <div className={styles.speech}>
          <div className={styles.speechText}>もっと、熱くなれよ！</div>
          <div className={styles.speechSub}>（CO2が100%を超えています）</div>
        </div>
      </div>
    </div>
  );
};
