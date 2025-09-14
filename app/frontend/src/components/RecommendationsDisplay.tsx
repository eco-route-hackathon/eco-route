import React from 'react';
import type { RouteRecommendations } from '../types';
import { RecommendationCard } from './RecommendationCard';
import { LoadingSpinner } from './LoadingSpinner';
import styles from '../styles/components/RecommendationsDisplay.module.css';

interface RecommendationsDisplayProps {
  loading: boolean;
  recommendations: RouteRecommendations | null;
  error: string | null;
}

export const RecommendationsDisplay: React.FC<RecommendationsDisplayProps> = ({
  loading,
  recommendations,
  error
}) => {
  // ローディング状態
  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <LoadingSpinner />
          <p className={styles.loadingText}>推奨スポットを検索中...</p>
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
          <h3 className={styles.errorTitle}>推奨スポットの取得に失敗しました</h3>
          <p className={styles.errorMessage}>{error}</p>
        </div>
      </div>
    );
  }

  // 推奨結果未取得状態
  if (!recommendations) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📍</div>
          <h3 className={styles.emptyTitle}>ルートに沿った推奨スポット</h3>
          <p className={styles.emptyMessage}>
            ルート比較後に推奨スポットが表示されます
          </p>
        </div>
      </div>
    );
  }

  const { restaurants, serviceAreas, attractions, metadata } = recommendations;
  const totalRecommendations = restaurants.length + serviceAreas.length + attractions.length;

  return (
    <div className={styles.container}>
      {/* ヘッダー */}
      <div className={styles.header}>
        <h2 className={styles.title}>📍 ルート推奨スポット</h2>
        {metadata && (
          <div className={styles.metadata}>
            <span className={styles.totalCount}>
              推奨数: {totalRecommendations}件
            </span>
            {metadata.averageRating > 0 && (
              <span className={styles.avgRating}>
                平均評価: {metadata.averageRating.toFixed(1)}⭐
              </span>
            )}
            <span className={styles.calcTime}>
              検索時間: {metadata.calculationTimeMs}ms
            </span>
          </div>
        )}
      </div>

      {/* レストラン推奨 */}
      {restaurants.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>🍽️</span>
            レストラン・飲食店 ({restaurants.length}件)
          </h3>
          <div className={styles.cardsGrid}>
            {restaurants.map((restaurant) => (
              <RecommendationCard
                key={restaurant.id}
                type="restaurant"
                data={restaurant}
              />
            ))}
          </div>
        </div>
      )}

      {/* サービスエリア推奨 */}
      {serviceAreas.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>🛣️</span>
            サービスエリア ({serviceAreas.length}件)
          </h3>
          <div className={styles.cardsGrid}>
            {serviceAreas.map((serviceArea) => (
              <RecommendationCard
                key={serviceArea.id}
                type="serviceArea"
                data={serviceArea}
              />
            ))}
          </div>
        </div>
      )}

      {/* 観光地推奨 */}
      {attractions.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>🏛️</span>
            観光地・名所 ({attractions.length}件)
          </h3>
          <div className={styles.cardsGrid}>
            {attractions.map((attraction) => (
              <RecommendationCard
                key={attraction.id}
                type="attraction"
                data={attraction}
              />
            ))}
          </div>
        </div>
      )}

      {/* 推奨なしの場合 */}
      {totalRecommendations === 0 && (
        <div className={styles.noRecommendations}>
          <div className={styles.noRecIcon}>🔍</div>
          <h3 className={styles.noRecTitle}>推奨スポットが見つかりませんでした</h3>
          <p className={styles.noRecMessage}>
            このルート沿いには条件に合う推奨スポットがありません。
          </p>
        </div>
      )}
    </div>
  );
};
