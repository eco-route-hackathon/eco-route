import axios from 'axios';

// axios.isAxiosErrorの代用型ガード
function isAxiosError(
  err: unknown
): err is { isAxiosError: boolean; code?: string; response?: any; request?: any } {
  return (
    typeof err === 'object' &&
    err !== null &&
    'isAxiosError' in err &&
    (err as any).isAxiosError === true
  );
}
import type { ComparisonRequest, ComparisonResult } from '../types';

// API設定
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const API_TIMEOUT = 30000; // 30秒

// Axiosインスタンス作成
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// エラーメッセージの取得
const getErrorMessage = (error: unknown): string => {
  if (isAxiosError(error)) {
    // サーバーからのエラーレスポンス
    if (error.response?.data?.error) {
      return error.response.data.error.message;
    }
    // ネットワークエラー
    if (error.code === 'ECONNABORTED') {
      return 'リクエストがタイムアウトしました。もう一度お試しください。';
    }
    if (!error.response) {
      return 'サーバーに接続できません。ネットワーク接続を確認してください。';
    }
    // HTTPステータスによるメッセージ
    switch (error.response.status) {
      case 400:
        return '入力内容に誤りがあります。';
      case 404:
        return 'ルートが見つかりません。';
      case 500:
        return 'サーバーエラーが発生しました。';
      default:
        return `エラーが発生しました (${error.response.status})`;
    }
  }
  return 'エラーが発生しました。';
};

// API関数
export const compareRoutes = async (request: ComparisonRequest): Promise<ComparisonResult> => {
  try {
    const response = await apiClient.post<ComparisonResult>('/compare', request);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

// ヘルスチェック（オプション）
export const checkHealth = async (): Promise<boolean> => {
  try {
    const response = await apiClient.get('/health');
    return response.status === 200;
  } catch {
    return false;
  }
};

// デバッグ用：API URL を確認
export const getApiUrl = (): string => {
  return API_BASE_URL;
};

// API設定を確認
export const getApiConfig = () => {
  return {
    baseURL: API_BASE_URL,
    timeout: API_TIMEOUT,
  };
};
