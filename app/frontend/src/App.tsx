import { useState, useCallback } from 'react';
import type { FormState, ComparisonRequest } from './types';
import { DEFAULT_FORM_STATE } from './types';
import { ComparisonForm } from './components/ComparisonForm';
import { ResultsDisplay } from './components/ResultsDisplay';
import { useComparisonAPI } from './hooks/useComparisonAPI';
import styles from './styles/App.module.css';
import JapanMap from './components/JapanMap';

function App() {
  const [formState, setFormState] = useState<FormState>(DEFAULT_FORM_STATE);
  const { callCompareAPI, loading, result, error, clearError, clearResult, currentApiUrl } =
    useComparisonAPI();

  // フォーム状態の更新ハンドラー
  const handleFormChange = useCallback(
    (updates: Partial<FormState>) => {
      setFormState((prev) => ({ ...prev, ...updates }));
      // フォーム変更時にエラーをクリア
      if (error) {
        clearError();
      }
    },
    [error, clearError]
  );

  // フォーム送信ハンドラー
  const handleSubmit = useCallback(async () => {
    // 重量を数値に変換
    const weightKg = parseFloat(formState.weightKg);

    if (isNaN(weightKg)) {
      return; // バリデーションエラーはフォーム側で処理
    }

    // APIリクエスト作成
    const request: ComparisonRequest = {
      origin: formState.origin,
      destination: formState.destination,
      weightKg,
      weights: formState.weights,
    };

    // 前回の結果をクリア
    clearResult();

    // API呼び出し
    await callCompareAPI(request);
  }, [formState, callCompareAPI, clearResult]);

  // 新しい比較を開始
  const handleNewComparison = useCallback(() => {
    clearResult();
    clearError();
  }, [clearResult, clearError]);

  return (
    <div className={styles.container}>
      {/* ヘッダー */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>
            <span className={styles.icon}>🌱</span>
            Eco Route
          </h1>
          <p className={styles.subtitle}>環境に優しい輸送ルートを見つけよう</p>
        </div>
      </header>

      {/* 日本地図を最初に表示 */}
      <div style={{ margin: '24px 0' }}>
        <JapanMap />
      </div>

      {/* メインコンテンツ */}
      <main className={styles.main}>
        {/* フォームカラム */}
        <div className={styles.formColumn}>
          <ComparisonForm
            formState={formState}
            onFormChange={handleFormChange}
            onSubmit={handleSubmit}
            isLoading={loading}
          />

          {/* 新しい比較ボタン（結果表示時のみ） */}
          {(result || error) && (
            <div className={styles.newComparisonSection}>
              <button
                type="button"
                className={styles.newComparisonButton}
                onClick={handleNewComparison}
                disabled={loading}
              >
                🔄 新しい比較を開始
              </button>
            </div>
          )}
        </div>

        {/* 結果カラム */}
        <div className={styles.resultsColumn}>
          <ResultsDisplay loading={loading} result={result} error={error} />
        </div>
      </main>

      {/* フッター */}
      <footer className={styles.footer}>
        <p className={styles.footerText}>© 2025 Eco Route MVP - 持続可能な輸送の選択を支援</p>
        <p className={styles.apiInfo}>API接続先: {currentApiUrl}</p>
      </footer>
    </div>
  );
}

export default App;
