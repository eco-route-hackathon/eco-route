/**
 * 数値フォーマット用ユーティリティ
 */

// 数値を3桁区切りでフォーマット
export const formatNumber = (value: number, decimals = 0): string => {
  return value.toLocaleString('ja-JP', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

// 金額フォーマット（円）
export const formatCurrency = (value: number): string => {
  return `¥${formatNumber(value)}`;
};

// 時間フォーマット（時間を時間と分に変換）
export const formatTime = (hours: number): string => {
  if (hours < 1) {
    const minutes = Math.round(hours * 60);
    return `${minutes}分`;
  }
  
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  
  if (minutes === 0) {
    return `${wholeHours}時間`;
  }
  
  return `${wholeHours}時間${minutes}分`;
};

// CO2フォーマット（kg）
export const formatCO2 = (kg: number): string => {
  if (kg < 1) {
    return `${formatNumber(kg * 1000)}g`;
  }
  return `${formatNumber(kg, 1)}kg`;
};

// パーセンテージフォーマット
export const formatPercentage = (value: number, includeSign = false): string => {
  const formatted = `${formatNumber(Math.abs(value))}%`;
  if (includeSign && value > 0) {
    return `+${formatted}`;
  }
  if (includeSign && value < 0) {
    return `-${formatted}`;
  }
  return formatted;
};

// 差分計算（ベースに対する差分％）
export const calculateDifference = (value: number, base: number): number => {
  if (base === 0) return 0;
  return ((value - base) / base) * 100;
};

// 差分の表示テキスト
export const formatDifference = (value: number, base: number): string => {
  const diff = calculateDifference(value, base);
  
  if (Math.abs(diff) < 1) {
    return 'ほぼ同じ';
  }
  
  if (diff > 0) {
    return `${formatNumber(Math.abs(diff))}%多い`;
  }
  
  return `${formatNumber(Math.abs(diff))}%少ない`;
};

// 時間の差分表示（より詳細）
export const formatTimeDifference = (value: number, base: number): string => {
  const diff = calculateDifference(value, base);
  
  if (Math.abs(diff) < 5) {
    return 'ほぼ同じ';
  }
  
  const times = value / base;
  if (times >= 2) {
    return `約${formatNumber(times, 1)}倍`;
  }
  
  if (diff > 0) {
    return `${formatNumber(Math.abs(diff))}%遅い`;
  }
  
  return `${formatNumber(Math.abs(diff))}%速い`;
};

// コストの差分表示
export const formatCostDifference = (value: number, base: number): string => {
  const diff = calculateDifference(value, base);
  
  if (Math.abs(diff) < 1) {
    return 'ほぼ同じ';
  }
  
  if (diff > 0) {
    return `${formatNumber(Math.abs(diff))}%高い`;
  }
  
  return `${formatNumber(Math.abs(diff))}%安い`;
};

// CO2の差分表示
export const formatCO2Difference = (value: number, base: number): string => {
  const diff = calculateDifference(value, base);
  
  if (Math.abs(diff) < 1) {
    return 'ほぼ同じ';
  }
  
  if (diff > 0) {
    return `${formatNumber(Math.abs(diff))}%多い`;
  }
  
  return `${formatNumber(Math.abs(diff))}%削減`;
};

// 重量のバリデーション
export const validateWeight = (value: string): string | null => {
  const num = parseFloat(value);
  
  if (isNaN(num)) {
    return '数値を入力してください';
  }
  
  if (num < 0.1) {
    return '0.1kg以上を入力してください';
  }
  
  if (num > 100000) {
    return '100,000kg以下を入力してください';
  }
  
  return null;
};

// スライダー値を0-100に正規化
export const normalizeSliderValue = (value: number): number => {
  return Math.round(value * 100);
};

// スライダー値を0-1に変換
export const denormalizeSliderValue = (value: number): number => {
  return value / 100;
};

// 重みの合計を100%に調整
export const adjustWeights = (
  weights: { time: number; cost: number; co2: number },
  changedField: 'time' | 'cost' | 'co2',
  newValue: number
): { time: number; cost: number; co2: number } => {
  const result = { ...weights, [changedField]: newValue };
  const total = result.time + result.cost + result.co2;
  
  if (total === 0) {
    return { time: 0.33, cost: 0.33, co2: 0.34 };
  }
  
  // 100%を超えている場合は他の値を比例的に調整
  if (total > 1) {
    const excess = total - 1;
    const otherFields = Object.keys(result).filter(key => key !== changedField) as Array<'time' | 'cost' | 'co2'>;
    const otherTotal = otherFields.reduce((sum, key) => sum + result[key], 0);
    
    if (otherTotal > 0) {
      otherFields.forEach(key => {
        const ratio = result[key] / otherTotal;
        result[key] = Math.max(0, result[key] - (excess * ratio));
      });
    }
  }
  
  return result;
};

// プラン名の日本語変換
export const getPlanLabel = (plan: string): string => {
  switch (plan) {
    case 'truck':
      return 'トラックのみ';
    case 'truck+ship':
      return 'トラック+船舶';
    default:
      return plan;
  }
};

// モード名の日本語変換
export const getModeLabel = (mode: string): string => {
  switch (mode) {
    case 'truck':
      return 'トラック';
    case 'ship':
      return '船舶';
    default:
      return mode;
  }
};

// プランのアイコン
export const getPlanIcon = (plan: string): string => {
  switch (plan) {
    case 'truck':
      return '🚚';
    case 'truck+ship':
      return '🚚🚢';
    default:
      return '🚛';
  }
};

// モードのアイコン
export const getModeIcon = (mode: string): string => {
  switch (mode) {
    case 'truck':
      return '🚚';
    case 'ship':
      return '🚢';
    default:
      return '🚛';
  }
};