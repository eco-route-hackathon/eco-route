import React from 'react';
import type { ComparisonResult } from '../types';
import { PlanCard } from './PlanCard';
import { LazyComparisonChart } from './LazyComparisonChart';
import { LoadingSpinner } from './LoadingSpinner';
import styles from '../styles/components/ResultsDisplay.module.css';
import { ShuzoOverlay } from './ShuzoOverlay';
import { getRestStopForLeg } from '../utils/restStops';
import { useState, useEffect } from 'react';

interface ResultsDisplayProps {
  loading: boolean;
  result: ComparisonResult | null;
  error: string | null;
}

export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ loading, result, error }) => {
  const [showShuzo, setShowShuzo] = useState(false);
  const [showRestPanel, setShowRestPanel] = useState(false);
  const overlayButton = (
    <>
      <ShuzoOverlay visible={showShuzo} onFinish={() => setShowShuzo(false)} />
      <div className={styles.floatingTestButtonContainer}>
        <button
          className={styles.testButton}
          onClick={() => setShowShuzo(true)}
          aria-label="松岡修造をテスト表示"
        >
          🔥 修造テスト
        </button>
        <button
          className={styles.secondaryTestButton}
          onClick={() => setShowRestPanel((s) => !s)}
          aria-label="休憩候補テスト表示"
        >
          ☕ 休憩候補
        </button>
      </div>
      {showRestPanel && (
        <div className={styles.restPanel} role="region" aria-label="休憩候補パネル">
          <h4 style={{ margin: '0 0 0.5rem 0' }}>休憩候補のテスト表示</h4>
          <div>
            {result && result.rationale && result.rationale['truck+ship'] ? (
              result.rationale['truck+ship'].legs.map((leg: any, i: number) => {
                const s = getRestStopForLeg(leg as any);
                return (
                  <div key={i} style={{ marginBottom: '0.5rem' }}>
                    <div style={{ fontWeight: 700 }}>
                      {leg.from} → {leg.to}
                    </div>
                    <div>{s ? `${s.name} — ${s.reason}` : '候補なし'}</div>
                  </div>
                );
              })
            ) : (
              <div>結果がないためサンプル: お台場海浜公園 — 海沿いで気分転換に最適。</div>
            )}
          </div>
        </div>
      )}
    </>
  );
  // ローディング状態
  if (loading) {
    return (
      <div className={styles.container}>
        {overlayButton}
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
        {overlayButton}
        <div className={styles.errorContainer} role="alert" aria-live="assertive">
          <div className={styles.errorIcon} aria-hidden="true">
            ⚠️
          </div>
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
        {overlayButton}
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

  // 自動トリガー: CO2 がベスト案に対して +100% を超えるプランがある場合、松岡修造を表示
  useEffect(() => {
    if (!candidates || candidates.length === 0) return;
    try {
      const co2s = candidates.map((c) => c.co2Kg).filter((v) => typeof v === 'number' && !isNaN(v));
      if (co2s.length === 0) return;
      const minCo2 = Math.min(...co2s);
      if (minCo2 <= 0) return; // 不正値回避
      const thresholdPercent = 100; // 100% より多い（= ベストの2倍以上）
      const hasHuge = co2s.some((v) => ((v - minCo2) / minCo2) * 100 > thresholdPercent);
      if (hasHuge) {
        setShowShuzo(true);
      }
    } catch (e) {
      // silently ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  // 推奨プランを先頭に、その他を後に並べる
  const sortedCandidates = [...candidates].sort((a, b) => {
    if (a.plan === recommendation && b.plan !== recommendation) return -1;
    if (a.plan !== recommendation && b.plan === recommendation) return 1;
    return 0;
  });

  return (
    <>
      {overlayButton}

      <div className={styles.container}>
        {/* ヘッダー */}
        <div className={styles.header}>
          <h2 className={styles.title}>📊 比較結果</h2>
          {metadata && (
            <div className={styles.metadata}>
              <span className={styles.calcTime}>計算時間: {metadata.calculationTimeMs}ms</span>
              <span className={styles.dataVersion}>データ: {metadata.dataVersion}</span>
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
              comparisonBase={candidates.find((c) => c.plan !== plan.plan) || candidates[0]}
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
                  {rationale['truck+ship'].legs.map((leg, index) => {
                    const suggestion = getRestStopForLeg(leg as any);
                    return (
                      <div key={index} className={styles.legItem}>
                        <span className={styles.legMode}>{leg.mode === 'truck' ? '🚚' : '🚢'}</span>
                        <span className={styles.legRoute}>
                          {leg.from} → {leg.to}
                        </span>
                        <span className={styles.legDistance}>
                          {leg.distanceKm.toLocaleString()}km
                        </span>
                        <span className={styles.legTime}>{leg.timeHours.toFixed(1)}時間</span>
                        {suggestion && (
                          <div className={styles.restSuggestion}>
                            <strong>おすすめ休憩:</strong> {suggestion.name} — {suggestion.reason}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};
