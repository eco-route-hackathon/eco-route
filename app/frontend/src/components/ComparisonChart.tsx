import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import type { TransportPlan, PlanType } from '../types';
import { 
  formatTime, 
  formatCurrency, 
  formatCO2,
  getPlanLabel 
} from '../utils/formatters';
import styles from '../styles/components/ComparisonChart.module.css';

interface ComparisonChartProps {
  candidates: TransportPlan[];
  recommendation: PlanType;
}

export const ComparisonChart: React.FC<ComparisonChartProps> = ({
  candidates,
  recommendation
}) => {
  // グラフ用データの準備
  const chartData = candidates.map(plan => ({
    name: getPlanLabel(plan.plan),
    plan: plan.plan,
    時間: plan.timeH,
    コスト: plan.costJpy,
    CO2: plan.co2Kg,
    isRecommended: plan.plan === recommendation
  }));

  // カスタムTooltip
  interface TooltipProps {
    active?: boolean;
    payload?: Array<{
      payload: {
        時間: number;
        コスト: number;
        CO2: number;
        isRecommended: boolean;
      }
    }>;
    label?: string;
  }

  const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className={styles.tooltip}>
          <div className={styles.tooltipHeader}>
            <span className={styles.tooltipTitle}>{label}</span>
            {data.isRecommended && (
              <span className={styles.tooltipBadge}>⭐ おすすめ</span>
            )}
          </div>
          <div className={styles.tooltipContent}>
            <div className={styles.tooltipItem}>
              <span className={styles.tooltipLabel}>⏱️ 時間:</span>
              <span className={styles.tooltipValue}>{formatTime(data.時間)}</span>
            </div>
            <div className={styles.tooltipItem}>
              <span className={styles.tooltipLabel}>💰 コスト:</span>
              <span className={styles.tooltipValue}>{formatCurrency(data.コスト)}</span>
            </div>
            <div className={styles.tooltipItem}>
              <span className={styles.tooltipLabel}>🌱 CO2:</span>
              <span className={styles.tooltipValue}>{formatCO2(data.CO2)}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // バーの色設定
  const getBarColor = (planType: string) => {
    return planType === recommendation ? '#4CAF50' : '#9E9E9E';
  };

  // Y軸のフォーマッター
  const formatYAxis = (value: number, key: string) => {
    switch (key) {
      case '時間':
        return `${value.toFixed(0)}h`;
      case 'コスト':
        return `¥${(value / 1000).toFixed(0)}k`;
      case 'CO2':
        return `${value.toFixed(0)}kg`;
      default:
        return value.toString();
    }
  };

  return (
    <div className={styles.container}>
      {/* 時間比較 */}
      <div className={styles.chartSection}>
        <h4 className={styles.chartTitle}>⏱️ 時間比較</h4>
        <div className={styles.chartWrapper}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12 }}
                interval={0}
              />
              <YAxis 
                tickFormatter={(value) => formatYAxis(value, '時間')}
                tick={{ fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="時間" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry.plan)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* コスト比較 */}
      <div className={styles.chartSection}>
        <h4 className={styles.chartTitle}>💰 コスト比較</h4>
        <div className={styles.chartWrapper}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12 }}
                interval={0}
              />
              <YAxis 
                tickFormatter={(value) => formatYAxis(value, 'コスト')}
                tick={{ fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="コスト" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry.plan)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* CO2比較 */}
      <div className={styles.chartSection}>
        <h4 className={styles.chartTitle}>🌱 CO2排出量比較</h4>
        <div className={styles.chartWrapper}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12 }}
                interval={0}
              />
              <YAxis 
                tickFormatter={(value) => formatYAxis(value, 'CO2')}
                tick={{ fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="CO2" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry.plan)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 凡例 */}
      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <div className={`${styles.legendColor} ${styles.recommended}`}></div>
          <span className={styles.legendLabel}>⭐ おすすめプラン</span>
        </div>
        <div className={styles.legendItem}>
          <div className={`${styles.legendColor} ${styles.alternative}`}></div>
          <span className={styles.legendLabel}>その他のプラン</span>
        </div>
      </div>
    </div>
  );
};