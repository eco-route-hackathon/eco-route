import { useState } from 'react';
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
import type { ComparisonRequest, ComparisonResult, ErrorResponse } from '../types';

interface UseComparisonAPIResult {
  callCompareAPI: (request: ComparisonRequest) => Promise<void>;
  loading: boolean;
  result: ComparisonResult | null;
  error: string | null;
  clearError: () => void;
  clearResult: () => void;
  currentApiUrl: string;
}

export const useComparisonAPI = (): UseComparisonAPIResult => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // API URL設定
  const getAPIUrl = () => {
    if (import.meta.env.VITE_API_URL) {
      return import.meta.env.VITE_API_URL;
    }
    // 開発環境デフォルト
    return 'http://localhost:3000';
  };

  const currentApiUrl = getAPIUrl();

  const callCompareAPI = async (request: ComparisonRequest): Promise<void> => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      console.log(`API呼び出し: ${currentApiUrl}/compare`);

      const response = await axios.post<ComparisonResult>(`${currentApiUrl}/compare`, request, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000, // 30秒タイムアウト
      });

      setResult(response.data);
    } catch (err) {
      console.error('API call failed:', err);
      // 型ガードでisAxiosErrorを使い、以降は型安全にアクセス
      if (isAxiosError(err)) {
        if (err.code === 'ECONNABORTED') {
          setError('リクエストがタイムアウトしました。しばらくしてから再試行してください。');
        } else if (err.response) {
          // サーバーエラーレスポンス
          const errorData = err.response.data as ErrorResponse;
          if (errorData?.error?.message) {
            setError(errorData.error.message);
          } else {
            switch (err.response.status) {
              case 400:
                setError('入力内容に問題があります。入力値を確認してください。');
                break;
              case 404:
                setError('指定された地点間のルートが見つかりません。');
                break;
              case 500:
                setError('サーバーでエラーが発生しました。しばらくしてから再試行してください。');
                break;
              default:
                setError(`エラーが発生しました (${err.response.status})`);
            }
          }
        } else if (err.request) {
          setError('サーバーに接続できません。インターネット接続を確認してください。');
        } else {
          setError('予期しないエラーが発生しました。');
        }
      } else {
        setError('予期しないエラーが発生しました。');
      }
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  const clearResult = () => {
    setResult(null);
  };

  return {
    callCompareAPI,
    loading,
    result,
    error,
    clearError,
    clearResult,
    currentApiUrl,
  };
};
