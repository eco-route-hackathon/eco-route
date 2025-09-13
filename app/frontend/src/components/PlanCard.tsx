import React from 'react';
import type { TransportPlan } from '../types';
import {
  formatTime,
  formatCurrency,
  formatCO2,
  formatTimeDifference,
  formatCostDifference,
  formatCO2Difference,
  getPlanLabel,
  getPlanIcon,
} from '../utils/formatters';
import styles from '../styles/components/PlanCard.module.css';

interface PlanCardProps {
  plan: TransportPlan;
  isRecommended: boolean;
  comparisonBase?: TransportPlan;
  priority?: 'primary' | 'secondary';
}

export const PlanCard: React.FC<PlanCardProps> = ({
  plan,
  isRecommended,
  comparisonBase,
  priority = 'secondary',
}) => {
  const cardClass = [
    styles.card,
    isRecommended ? styles.recommended : styles.alternative,
    priority === 'primary' ? styles.primary : styles.secondary,
  ].join(' ');

  // 差分表示の計算
  const getDifferences = () => {
    if (!comparisonBase || comparisonBase.plan === plan.plan) {
      return null;
    }

    return {
      time: formatTimeDifference(plan.timeH, comparisonBase.timeH),
      cost: formatCostDifference(plan.costJpy, comparisonBase.costJpy),
      co2: formatCO2Difference(plan.co2Kg, comparisonBase.co2Kg),
    };
  };

  const differences = getDifferences();

  // デートシミュレーション遷移用
  const handleDateSimulate = () => {
    // ルート情報をクエリやstateで/dateに渡す（仮実装: location.href）
    window.location.href = `/date?plan=${encodeURIComponent(JSON.stringify(plan))}`;
  };

  return (
    <div className={cardClass}>
      {/* カードヘッダー */}
      <div className={styles.header}>
        <div className={styles.planInfo}>
          <span className={styles.planIcon}>{getPlanIcon(plan.plan)}</span>
          <h4 className={styles.planTitle}>{getPlanLabel(plan.plan)}</h4>
        </div>

        {isRecommended && (
          <div className={styles.badge}>
            <span className={styles.badgeIcon}>⭐</span>
            <span className={styles.badgeText}>おすすめ</span>
          </div>
        )}
      </div>

      {/* メトリクス表示 */}
      <div className={styles.metrics}>
        {/* 時間 */}
        <div className={styles.metric}>
          <div className={styles.metricHeader}>
            <span className={styles.metricIcon}>⏱️</span>
            <span className={styles.metricLabel}>時間</span>
          </div>
          <div className={styles.metricValue}>{formatTime(plan.timeH)}</div>
          {differences && (
            <div
              className={`${styles.difference} ${
                plan.timeH < comparisonBase!.timeH ? styles.better : styles.worse
              }`}
            >
              {differences.time}
            </div>
          )}
        </div>

        {/* コスト */}
        <div className={styles.metric}>
          <div className={styles.metricHeader}>
            <span className={styles.metricIcon}>💰</span>
            <span className={styles.metricLabel}>コスト</span>
          </div>
          <div className={styles.metricValue}>{formatCurrency(plan.costJpy)}</div>
          {differences && (
            <div
              className={`${styles.difference} ${
                plan.costJpy < comparisonBase!.costJpy ? styles.better : styles.worse
              }`}
            >
              {differences.cost}
            </div>
          )}
        </div>

        {/* CO2 */}
        <div className={styles.metric}>
          <div className={styles.metricHeader}>
            <span className={styles.metricIcon}>🌱</span>
            <span className={styles.metricLabel}>CO2排出</span>
          </div>
          <div className={styles.metricValue}>{formatCO2(plan.co2Kg)}</div>
          {differences && (
            <div
              className={`${styles.difference} ${
                plan.co2Kg < comparisonBase!.co2Kg ? styles.better : styles.worse
              }`}
            >
              {differences.co2}
            </div>
          )}
        </div>
      </div>

      {/* ルート詳細（truck+shipの場合） */}
      {plan.legs && plan.legs.length > 0 && (
        <div className={styles.routeDetails}>
          <h5 className={styles.routeTitle}>ルート詳細</h5>
          <div className={styles.legsList}>
            {plan.legs.map((leg, index) => (
              <div key={index} className={styles.legItem}>
                <span className={styles.legIcon}>{leg.mode === 'truck' ? '🚚' : '🚢'}</span>
                <div className={styles.legInfo}>
                  <div className={styles.legRoute}>
                    {leg.from} → {leg.to}
                  </div>
                  <div className={styles.legStats}>
                    <span className={styles.legDistance}>{leg.distanceKm.toLocaleString()}km</span>
                    <span className={styles.legTime}>{formatTime(leg.timeHours)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 推奨理由（推奨プランの場合のみ） */}
      {isRecommended && (
        <div className={styles.recommendation}>
          <div className={styles.recommendationHeader}>
            <span className={styles.recommendationIcon}>💡</span>
            <span className={styles.recommendationLabel}>選ばれた理由</span>
          </div>
          <p className={styles.recommendationText}>
            あなたの重視する条件において最適なバランスを実現しています
          </p>
        </div>
      )}

      {/* デートシミュレーションボタン（標準装備） */}
      <div className={styles.dateSimButtonArea}>
        <button className={styles.dateSimButton} onClick={handleDateSimulate}>
          このルートでデートする（荷物＝女の子）
        </button>
      </div>
    </div>
  );
};
