import { useState, useCallback } from 'react';
import type { FormState, ComparisonRequest, RecommendationRequest } from './types';
import { DEFAULT_FORM_STATE } from './types';
import { ComparisonForm } from './components/ComparisonForm';
import { ResultsDisplay } from './components/ResultsDisplay';
import { RecommendationsDisplay } from './components/RecommendationsDisplay';
import { useComparisonAPI } from './hooks/useComparisonAPI';
import { useRecommendationsAPI } from './hooks/useRecommendationsAPI';
import styles from './styles/App.module.css';

function App() {
  const [formState, setFormState] = useState<FormState>(DEFAULT_FORM_STATE);
  const {
    callCompareAPI,
    loading: comparisonLoading,
    result,
    error: comparisonError,
    clearError: clearComparisonError,
    clearResult: clearComparisonResult,
  } = useComparisonAPI();
  
  const {
    callRecommendationsAPI,
    loading: recommendationsLoading,
    recommendations,
    error: recommendationsError,
    clearRecommendations,
    clearError: clearRecommendationsError,
  } = useRecommendationsAPI();

  // フォーム状態の更新ハンドラー
  const handleFormChange = useCallback((updates: Partial<FormState>) => {
    setFormState(prev => ({ ...prev, ...updates }));
    // フォーム変更時にエラーをクリア
    if (comparisonError) {
      clearComparisonError();
    }
    if (recommendationsError) {
      clearRecommendationsError();
    }
  }, [comparisonError, clearComparisonError, recommendationsError, clearRecommendationsError]);

  // フォーム送信ハンドラー
  const handleSubmit = useCallback(async () => {
    // 重量を数値に変換
    const weightKg = parseFloat(formState.weightKg);
    
    if (isNaN(weightKg)) {
      return; // バリデーションエラーはフォーム側で処理
    }

    // APIリクエスト作成
    const comparisonRequest: ComparisonRequest = {
      origin: formState.origin,
      destination: formState.destination,
      weightKg,
      weights: formState.weights,
    };

    // 前回の結果をクリア
    clearComparisonResult();
    clearRecommendations();

    // ルート比較API呼び出し
    await callCompareAPI(comparisonRequest);

    // ルート推奨API呼び出し（ルート比較成功後）
    const recommendationRequest: RecommendationRequest = {
      route: {
        origin: formState.origin,
        destination: formState.destination,
        weightKg,
        weights: formState.weights,
      },
      preferences: {
        maxDistanceFromRoute: 5.0, // ルートから5km以内
        maxStopTime: 120, // 最大滞在時間120分
      },
    };

    // 推奨API呼び出し（並行実行）
    callRecommendationsAPI(recommendationRequest);
  }, [
    formState, 
    callCompareAPI, 
    clearComparisonResult, 
    callRecommendationsAPI, 
    clearRecommendations
  ]);

  // 新しい比較を開始
  const handleNewComparison = useCallback(() => {
    clearComparisonResult();
    clearComparisonError();
    clearRecommendations();
    clearRecommendationsError();
  }, [clearComparisonResult, clearComparisonError, clearRecommendations, clearRecommendationsError]);

  return (
    <div className={styles.container}>
      {/* ヘッダー */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>
            <span className={styles.icon}>🌱</span>
            Eco Route
          </h1>
          <p className={styles.subtitle}>
            環境に優しい輸送ルートを見つけよう
          </p>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className={styles.main}>
        {/* フォームカラム */}
        <div className={styles.formColumn}>
          <ComparisonForm
            formState={formState}
            onFormChange={handleFormChange}
            onSubmit={handleSubmit}
            isLoading={comparisonLoading || recommendationsLoading}
          />
          
          {/* 新しい比較ボタン（結果表示時のみ） */}
          {(result || comparisonError || recommendations) && (
            <div className={styles.newComparisonSection}>
              <button
                type="button"
                className={styles.newComparisonButton}
                onClick={handleNewComparison}
                disabled={comparisonLoading || recommendationsLoading}
              >
                🔄 新しい比較を開始
              </button>
            </div>
          )}
        </div>

        {/* 結果カラム */}
        <div className={styles.resultsColumn}>
          <ResultsDisplay
            loading={comparisonLoading}
            result={result}
            error={comparisonError}
          />
          
          {/* 推奨スポット表示 */}
          <RecommendationsDisplay
            loading={recommendationsLoading}
            recommendations={recommendations}
            error={recommendationsError}
          />
        </div>
      </main>

      {/* フッター */}
      <footer className={styles.footer}>
        <p className={styles.footerText}>
          © 2025 Eco Route MVP - 持続可能な輸送の選択を支援
        </p>
      </footer>
    </div>
  );
}

export default App;
