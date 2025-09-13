import React from 'react';
import type { WeightFactors } from '../types';
import { WEIGHT_PRESETS } from '../types';
import { adjustWeights, normalizeSliderValue, denormalizeSliderValue } from '../utils/formatters';
import styles from '../styles/components/WeightSliders.module.css';

interface WeightSlidersProps {
  weights: WeightFactors;
  onChange: (weights: WeightFactors) => void;
  disabled?: boolean;
}

export const WeightSliders: React.FC<WeightSlidersProps> = ({
  weights,
  onChange,
  disabled = false
}) => {
  // スライダー変更ハンドラー
  const handleSliderChange = (field: 'time' | 'cost' | 'co2', value: number) => {
    const newValue = denormalizeSliderValue(value);
    const adjustedWeights = adjustWeights(weights, field, newValue);
    onChange(adjustedWeights);
  };

  // プリセット適用ハンドラー
  const handlePresetClick = (presetWeights: WeightFactors) => {
    onChange(presetWeights);
  };

  // リセットハンドラー
  const handleReset = () => {
    onChange({ time: 0.33, cost: 0.33, co2: 0.34 });
  };

  // スライダー項目の定義
  const sliderItems = [
    {
      key: 'time' as const,
      label: '時間',
      icon: '⏱️',
      description: '速く届けたい',
      color: '#2196F3'
    },
    {
      key: 'cost' as const,
      label: 'コスト',
      icon: '💰',
      description: '安く送りたい',
      color: '#4CAF50'
    },
    {
      key: 'co2' as const,
      label: 'CO2',
      icon: '🌱',
      description: '環境に優しく',
      color: '#FF5722'
    }
  ];

  return (
    <div className={styles.container}>
      <div className={styles.title}>何を重視しますか？</div>
      
      {/* スライダー */}
      <div className={styles.slidersContainer}>
        {sliderItems.map((item) => (
          <div key={item.key} className={styles.sliderGroup}>
            <div className={styles.sliderLabel}>
              <div className={styles.sliderName}>
                <span className={styles.icon}>{item.icon}</span>
                <span className={styles.label}>{item.label}</span>
                <span className={styles.description}>{item.description}</span>
              </div>
              <span className={styles.percentage} style={{ color: item.color }}>
                {normalizeSliderValue(weights[item.key])}%
              </span>
            </div>
            <div className={styles.sliderWrapper}>
              <input
                type="range"
                min="0"
                max="100"
                value={normalizeSliderValue(weights[item.key])}
                onChange={(e) => handleSliderChange(item.key, parseInt(e.target.value))}
                className={styles.slider}
                style={{
                  background: `linear-gradient(to right, ${item.color} 0%, ${item.color} ${normalizeSliderValue(weights[item.key])}%, #ddd ${normalizeSliderValue(weights[item.key])}%, #ddd 100%)`
                }}
                disabled={disabled}
              />
            </div>
          </div>
        ))}
      </div>

      {/* プリセットボタン */}
      <div className={styles.presetsContainer}>
        <div className={styles.presetsTitle}>プリセット</div>
        <div className={styles.presetButtons}>
          {WEIGHT_PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              className={styles.presetButton}
              onClick={() => handlePresetClick(preset.weights)}
              disabled={disabled}
            >
              <span className={styles.presetIcon}>{preset.icon}</span>
              <span className={styles.presetLabel}>{preset.label}</span>
            </button>
          ))}
        </div>
        
        {/* リセットボタン */}
        <button
          type="button"
          className={styles.resetButton}
          onClick={handleReset}
          disabled={disabled}
        >
          ⚖️ バランス型にリセット
        </button>
      </div>

      {/* 合計表示 */}
      <div className={styles.totalDisplay}>
        <span className={styles.totalLabel}>合計:</span>
        <span className={styles.totalValue}>
          {Math.round((weights.time + weights.cost + weights.co2) * 100)}%
        </span>
      </div>
    </div>
  );
};