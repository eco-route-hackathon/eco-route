import React, { lazy, Suspense } from 'react';
import type { TransportPlan, PlanType } from '../types';
import { LoadingSpinner } from './LoadingSpinner';

const ComparisonChart = lazy(() => import('./ComparisonChart'));

interface LazyComparisonChartProps {
  candidates: TransportPlan[];
  recommendation: PlanType;
}

export const LazyComparisonChart: React.FC<LazyComparisonChartProps> = (props) => {
  return (
    <Suspense fallback={<LoadingSpinner size="small" message="グラフを読み込み中..." />}>
      <ComparisonChart {...props} />
    </Suspense>
  );
};