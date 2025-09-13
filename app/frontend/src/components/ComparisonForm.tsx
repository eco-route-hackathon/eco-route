import React from 'react';
import type { FormState } from '../types';
import { AVAILABLE_LOCATIONS } from '../types';
import { validateWeight } from '../utils/formatters';
import { WeightSliders } from './WeightSliders';
import styles from '../styles/components/ComparisonForm.module.css';

interface ComparisonFormProps {
  formState: FormState;
  onFormChange: (updates: Partial<FormState>) => void;
  onSubmit: () => void;
  isLoading: boolean;
}

export const ComparisonForm: React.FC<ComparisonFormProps> = ({
  formState,
  onFormChange,
  onSubmit,
  isLoading
}) => {
  // 重量のバリデーションエラー
  const weightError = validateWeight(formState.weightKg);
  
  // 送信可能かどうかの判定
  const canSubmit = !weightError && 
                   formState.origin !== formState.destination && 
                   !isLoading;

  // フォーム送信ハンドラー
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canSubmit) {
      onSubmit();
    }
  };

  // 入力値変更ハンドラー
  const handleInputChange = (field: keyof FormState, value: string) => {
    onFormChange({ [field]: value });
  };

  return (
    <form className={styles.container} onSubmit={handleSubmit}>
      <h2 className={styles.title}>🚚 vs 🚢 輸送方法を比較</h2>
      
      {/* 出発地選択 */}
      <div className={styles.formGroup}>
        <label htmlFor="origin" className={styles.label}>
          出発地
        </label>
        <select
          id="origin"
          className={styles.select}
          value={formState.origin}
          onChange={(e) => handleInputChange('origin', e.target.value)}
          disabled={isLoading}
        >
          {AVAILABLE_LOCATIONS.map((location) => (
            <option key={location.value} value={location.value}>
              {location.label}
            </option>
          ))}
        </select>
      </div>

      {/* 到着地選択 */}
      <div className={styles.formGroup}>
        <label htmlFor="destination" className={styles.label}>
          到着地
        </label>
        <select
          id="destination"
          className={styles.select}
          value={formState.destination}
          onChange={(e) => handleInputChange('destination', e.target.value)}
          disabled={isLoading}
        >
          {AVAILABLE_LOCATIONS.map((location) => (
            <option key={location.value} value={location.value}>
              {location.label}
            </option>
          ))}
        </select>
        {formState.origin === formState.destination && (
          <div className={styles.error}>
            出発地と到着地は異なる場所を選択してください
          </div>
        )}
      </div>

      {/* 重量入力 */}
      <div className={styles.formGroup}>
        <label htmlFor="weight" className={styles.label}>
          重量（kg）
        </label>
        <input
          id="weight"
          type="number"
          className={styles.input}
          value={formState.weightKg}
          onChange={(e) => handleInputChange('weightKg', e.target.value)}
          placeholder="500"
          min="0.1"
          max="100000"
          step="0.1"
          disabled={isLoading}
        />
        {weightError && (
          <div className={styles.error}>
            {weightError}
          </div>
        )}
      </div>

      {/* 重み調整スライダー */}
      <div className={styles.formGroup}>
        <WeightSliders
          weights={formState.weights}
          onChange={(weights) => onFormChange({ weights })}
          disabled={isLoading}
        />
      </div>

      {/* 送信ボタン */}
      <button
        type="submit"
        className={styles.submitButton}
        disabled={!canSubmit}
      >
        {isLoading ? (
          <span className={styles.loading}>
            ⏳ ルートを計算中...
          </span>
        ) : (
          '🔍 ルートを比較する'
        )}
      </button>
    </form>
  );
};