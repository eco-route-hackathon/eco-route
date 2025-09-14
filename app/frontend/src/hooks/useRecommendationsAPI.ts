/**
 * Custom hook for calling the route recommendations API
 */

import { useState, useCallback } from 'react';
import type { 
  RecommendationRequest, 
  RouteRecommendations, 
  ErrorResponse 
} from '../types';

const API_BASE_URL = 'http://localhost:3000';

export const useRecommendationsAPI = () => {
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<RouteRecommendations | null>(null);
  const [error, setError] = useState<string | null>(null);

  const callRecommendationsAPI = useCallback(async (request: RecommendationRequest) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/route/recommendations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorData = data as ErrorResponse;
        throw new Error(errorData.error.message || 'Failed to fetch recommendations');
      }

      setRecommendations(data as RouteRecommendations);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      setRecommendations(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearRecommendations = useCallback(() => {
    setRecommendations(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    callRecommendationsAPI,
    loading,
    recommendations,
    error,
    clearRecommendations,
    clearError,
  };
};
