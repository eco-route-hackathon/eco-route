import React from 'react';
import type { ComparisonResult } from '../types';
import { PlanCard } from './PlanCard';
import { LazyComparisonChart } from './LazyComparisonChart';
import { LoadingSpinner } from './LoadingSpinner';
import styles from '../styles/components/ResultsDisplay.module.css';

interface ResultsDisplayProps {
  loading: boolean;
  result: ComparisonResult | null;
  error: string | null;
}

export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({
  loading,
  result,
  error
}) => {
  // ローディング状態
  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <LoadingSpinner />
          <p className={styles.loadingText}>ルートを計算中...</p>
        </div>
      </div>
    );
  }

  // エラー状態
  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorContainer} role="alert" aria-live="assertive">
          <div className={styles.errorIcon} aria-hidden="true">⚠️</div>
          <h3 className={styles.errorTitle}>エラーが発生しました</h3>
          <p className={styles.errorMessage}>{error}</p>
          <button 
            className={styles.retryButton}
            onClick={() => window.location.reload()}
            aria-label="ページを再読み込みしてエラーを解決する"
          >
            再読み込み
          </button>
        </div>
      </div>
    );
  }

  // 結果未取得状態
  if (!result) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📊</div>
          <h3 className={styles.emptyTitle}>輸送ルートを比較しましょう</h3>
          <p className={styles.emptyMessage}>
            フォームに情報を入力して「ルートを比較する」ボタンを押してください
          </p>
        </div>
      </div>
    );
  }

  // 結果表示状態
  const { candidates, recommendation, rationale, metadata } = result;
  
  // 推奨プランを先頭に、その他を後に並べる
  const sortedCandidates = [...candidates].sort((a, b) => {
    if (a.plan === recommendation && b.plan !== recommendation) return -1;
    if (a.plan !== recommendation && b.plan === recommendation) return 1;
    return 0;
  });

  return (
    <div className={styles.container}>
      {/* ヘッダー */}
      <div className={styles.header}>
        <h2 className={styles.title}>📊 比較結果</h2>
        {metadata && (
          <div className={styles.metadata}>
            <span className={styles.calcTime}>
              計算時間: {metadata.calculationTimeMs}ms
            </span>
            <span className={styles.dataVersion}>
              データ: {metadata.dataVersion}
            </span>
          </div>
        )}
      </div>

      {/* 推奨プラン表示 */}
      <div className={styles.recommendationSection}>
        <div className={styles.recommendationHeader}>
          <span className={styles.recommendationIcon}>⭐</span>
          <h3 className={styles.recommendationTitle}>おすすめのプラン</h3>
        </div>
        {sortedCandidates.map((plan, index) => (
          <PlanCard
            key={plan.plan}
            plan={plan}
            isRecommended={plan.plan === recommendation}
            comparisonBase={candidates.find(c => c.plan !== plan.plan) || candidates[0]}
            priority={index === 0 ? 'primary' : 'secondary'}
          />
        ))}
      </div>

      {/* 比較グラフ */}
      <div className={styles.chartSection}>
        <h3 className={styles.chartTitle}>📈 詳細比較</h3>
        <LazyComparisonChart candidates={candidates} recommendation={recommendation} />
      </div>

      {/* ルート詳細 */}
      {rationale && (
        <div className={styles.rationaleSection}>
          <h3 className={styles.rationaleTitle}>🗺️ ルート詳細</h3>
          
          {rationale.truck && (
            <div className={styles.rationaleItem}>
              <h4 className={styles.rationaleSubtitle}>🚚 トラックのみ</h4>
              <p className={styles.rationaleText}>
                直行距離: {rationale.truck.distanceKm.toLocaleString()}km
              </p>
            </div>
          )}
          
          {rationale['truck+ship'] && (
            <div className={styles.rationaleItem}>
              <h4 className={styles.rationaleSubtitle}>🚚🚢 トラック+船舶</h4>
              <div className={styles.legsList}>
                {rationale['truck+ship'].legs.map((leg, index) => (
                  <div key={index} className={styles.legItem}>
                    <span className={styles.legMode}>
                      {leg.mode === 'truck' ? '🚚' : '🚢'}
                    </span>
                    <span className={styles.legRoute}>
                      {leg.from} → {leg.to}
                    </span>
                    <span className={styles.legDistance}>
                      {leg.distanceKm.toLocaleString()}km
                    </span>
                    <span className={styles.legTime}>
                      {leg.timeHours.toFixed(1)}時間
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};