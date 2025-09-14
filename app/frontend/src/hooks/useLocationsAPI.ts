import { useState, useEffect } from 'react';
import axios, { type AxiosError } from 'axios';

interface Location {
  id: string;
  name: string;
}

interface LocationsResponse {
  locations: Location[];
}

interface UseLocationsAPIResult {
  locations: Array<{ value: string; label: string }>;
  loading: boolean;
  error: string | null;
}

export const useLocationsAPI = (): UseLocationsAPIResult => {
  const [locations, setLocations] = useState<Array<{ value: string; label: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // API URL設定
  const getAPIUrl = () => {
    if (import.meta.env.VITE_API_URL) {
      return import.meta.env.VITE_API_URL;
    }
    // 開発環境デフォルト
    return 'http://localhost:3000';
  };

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const apiUrl = getAPIUrl();
        const response = await axios.get<LocationsResponse>(`${apiUrl}/locations`, {
          timeout: 10000, // 10秒タイムアウト
        });

        // API レスポンスをドロップダウン用の形式に変換
        const formattedLocations = response.data.locations.map((location) => ({
          value: location.name,
          label: location.name,
        }));

        setLocations(formattedLocations);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch locations:', err);

        if (axios.isAxiosError(err)) {
          const axiosError = err as AxiosError;
          if (axiosError.code === 'ECONNABORTED') {
            setError('都市一覧の取得がタイムアウトしました');
          } else if (axiosError.response) {
            setError('都市一覧の取得に失敗しました');
          } else if (axiosError.request) {
            setError('サーバーに接続できません');
          } else {
            setError('予期しないエラーが発生しました');
          }
        } else {
          setError('予期しないエラーが発生しました');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchLocations();
  }, []);

  return {
    locations,
    loading,
    error,
  };
};