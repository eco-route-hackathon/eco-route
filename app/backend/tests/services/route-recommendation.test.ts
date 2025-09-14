/**
 * RouteRecommendationService Tests
 * Tests for route recommendation functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RouteRecommendationService } from '../../src/services/RouteRecommendationService';
import { RecommendationDataLoader } from '../../src/services/RecommendationDataLoader';
import { TransportPlan, RecommendationPreferences } from '../../src/lib/shared-types';

// Mock the RecommendationDataLoader
vi.mock('../../src/services/RecommendationDataLoader');
const MockRecommendationDataLoader = vi.mocked(RecommendationDataLoader);

describe('RouteRecommendationService', () => {
  let service: RouteRecommendationService;
  let mockDataLoader: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create mock data loader
    mockDataLoader = {
      findRestaurantsNearRoute: vi.fn(),
      findServiceAreasNearRoute: vi.fn(),
      findAttractionsNearRoute: vi.fn(),
      clearCache: vi.fn()
    };

    MockRecommendationDataLoader.mockImplementation(() => mockDataLoader);
    
    service = new RouteRecommendationService({
      maxDistanceFromRoute: 5.0,
      maxRecommendationsPerType: 10,
      dataVersion: '1.0.0'
    });
  });

  describe('getRouteRecommendations', () => {
    const mockRoute: TransportPlan = {
      plan: 'truck+ship',
      legs: [
        {
          from: 'Tokyo',
          to: 'Osaka',
          distanceKm: 520,
          timeHours: 7.2,
          mode: 'truck',
          costYen: 15000,
          co2Kg: 45.2
        }
      ],
      totalDistanceKm: 520,
      totalTimeHours: 7.2,
      totalCostYen: 15000,
      totalCo2Kg: 45.2
    };

    it('should generate route recommendations with CSV data', async () => {
      // Mock CSV data responses
      const mockRestaurants = [
        {
          id: 'rest_001',
          name: '東京駅ラーメン街',
          type: 'restaurant' as const,
          cuisine: ['japanese'],
          priceRange: 'medium' as const,
          location: { lat: 35.6812, lon: 139.7671, address: '東京都千代田区丸の内1-9-1' },
          rating: 4.2,
          distanceFromRoute: 0.5,
          estimatedStopTime: 45,
          amenities: ['parking', 'restroom', 'wifi'],
          openingHours: '06:00-23:00',
          description: '東京駅構内の人気ラーメン店'
        }
      ];

      const mockServiceAreas = [
        {
          id: 'sa_001',
          name: '東名高速 海老名SA',
          type: 'service_area' as const,
          location: { lat: 35.4658, lon: 139.6205, address: '神奈川県海老名市海老名1-1-1' },
          distanceFromRoute: 0.2,
          facilities: ['restroom', 'parking', 'gas_station', 'restaurant'],
          estimatedStopTime: 20,
          openingHours: '24/7',
          description: '東名高速道路の大型サービスエリア'
        }
      ];

      const mockAttractions = [
        {
          id: 'attr_001',
          name: '東京タワー',
          type: 'tourist_spot' as const,
          location: { lat: 35.6586, lon: 139.7454, address: '東京都港区芝公園4-2-8' },
          distanceFromRoute: 1.5,
          estimatedVisitTime: 120,
          rating: 4.2,
          category: ['landmark', 'observation_deck'],
          description: '東京のシンボルタワー'
        }
      ];

      mockDataLoader.findRestaurantsNearRoute.mockResolvedValue(mockRestaurants);
      mockDataLoader.findServiceAreasNearRoute.mockResolvedValue(mockServiceAreas);
      mockDataLoader.findAttractionsNearRoute.mockResolvedValue(mockAttractions);

      const preferences: RecommendationPreferences = {
        foodTypes: ['japanese'],
        priceRange: 'medium',
        includeAttractions: true
      };

      const result = await service.getRouteRecommendations(mockRoute, preferences);

      // Verify result structure
      expect(result).toHaveProperty('routeId');
      expect(result).toHaveProperty('totalDistance', 520);
      expect(result).toHaveProperty('estimatedDuration', 7.2);
      expect(result).toHaveProperty('recommendations');
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('metadata');

      // Verify recommendations
      expect(result.recommendations.restaurants).toHaveLength(1);
      expect(result.recommendations.serviceAreas).toHaveLength(1);
      expect(result.recommendations.attractions).toHaveLength(1);

      // Verify summary
      expect(result.summary.totalRestaurants).toBe(1);
      expect(result.summary.totalServiceAreas).toBe(1);
      expect(result.summary.totalAttractions).toBe(1);
      expect(result.summary.recommendedStops).toBeGreaterThan(0);

      // Verify metadata
      expect(result.metadata.generatedAt).toBeDefined();
      expect(result.metadata.dataVersion).toBe('1.0.0');
      expect(result.metadata.algorithmVersion).toBe('1.0.0');
    });

    it('should handle preferences correctly', async () => {
      const preferences: RecommendationPreferences = {
        foodTypes: ['japanese', 'western'],
        priceRange: 'high',
        maxDistanceFromRoute: 3.0,
        includeAttractions: false
      };

      mockDataLoader.findRestaurantsNearRoute.mockResolvedValue([]);
      mockDataLoader.findServiceAreasNearRoute.mockResolvedValue([]);
      mockDataLoader.findAttractionsNearRoute.mockResolvedValue([]);

      const result = await service.getRouteRecommendations(mockRoute, preferences);

      // Verify that preferences were passed to data loader
      expect(mockDataLoader.findRestaurantsNearRoute).toHaveBeenCalledWith(
        expect.any(Array),
        3.0,
        {
          foodTypes: ['japanese', 'western'],
          priceRange: 'high',
          amenities: undefined
        }
      );

      // Verify attractions are not included
      expect(result.recommendations.attractions).toHaveLength(0);
    });

    it('should fallback to mock data when CSV loading fails', async () => {
      // Mock CSV loading failure
      mockDataLoader.findRestaurantsNearRoute.mockRejectedValue(new Error('CSV loading failed'));
      mockDataLoader.findServiceAreasNearRoute.mockRejectedValue(new Error('CSV loading failed'));
      mockDataLoader.findAttractionsNearRoute.mockResolvedValue([]);

      const result = await service.getRouteRecommendations(mockRoute);

      // Should still return a valid result with fallback data
      expect(result).toHaveProperty('routeId');
      expect(result).toHaveProperty('recommendations');
      expect(result.recommendations.restaurants).toBeDefined();
      expect(result.recommendations.serviceAreas).toBeDefined();
    });

    it('should generate unique route IDs', async () => {
      mockDataLoader.findRestaurantsNearRoute.mockResolvedValue([]);
      mockDataLoader.findServiceAreasNearRoute.mockResolvedValue([]);
      mockDataLoader.findAttractionsNearRoute.mockResolvedValue([]);

      const result1 = await service.getRouteRecommendations(mockRoute);
      const result2 = await service.getRouteRecommendations(mockRoute);

      // Route IDs should be different due to timestamp inclusion
      expect(result1.routeId).not.toBe(result2.routeId);

      // Different routes should have different IDs
      const differentRoute: TransportPlan = {
        ...mockRoute,
        legs: [
          {
            from: 'Tokyo',
            to: 'Kyoto',
            distanceKm: 450,
            timeHours: 6.5,
            mode: 'truck',
            costYen: 12000,
            co2Kg: 38.5
          }
        ]
      };

      const result3 = await service.getRouteRecommendations(differentRoute);
      expect(result1.routeId).not.toBe(result3.routeId);
    });

    it('should handle empty route legs', async () => {
      const emptyRoute: TransportPlan = {
        plan: 'truck',
        legs: [],
        totalDistanceKm: 0,
        totalTimeHours: 0,
        totalCostYen: 0,
        totalCo2Kg: 0
      };

      mockDataLoader.findRestaurantsNearRoute.mockResolvedValue([]);
      mockDataLoader.findServiceAreasNearRoute.mockResolvedValue([]);
      mockDataLoader.findAttractionsNearRoute.mockResolvedValue([]);

      const result = await service.getRouteRecommendations(emptyRoute);

      expect(result.totalDistance).toBe(0);
      expect(result.estimatedDuration).toBe(0);
      expect(result.recommendations.restaurants).toHaveLength(0);
      expect(result.recommendations.serviceAreas).toHaveLength(0);
      expect(result.recommendations.attractions).toHaveLength(0);
    });

    it('should respect maxRecommendationsPerType limit', async () => {
      const serviceWithLimit = new RouteRecommendationService({
        maxRecommendationsPerType: 2
      });

      const mockManyRestaurants = Array(5).fill(null).map((_, i) => ({
        id: `rest_${i}`,
        name: `Restaurant ${i}`,
        type: 'restaurant' as const,
        cuisine: ['japanese'],
        priceRange: 'medium' as const,
        location: { lat: 35.0 + i * 0.01, lon: 139.0 + i * 0.01, address: `Address ${i}` },
        rating: 4.0,
        distanceFromRoute: 1.0,
        estimatedStopTime: 30,
        amenities: ['parking'],
        openingHours: '10:00-20:00'
      }));

      mockDataLoader.findRestaurantsNearRoute.mockResolvedValue(mockManyRestaurants);
      mockDataLoader.findServiceAreasNearRoute.mockResolvedValue([]);
      mockDataLoader.findAttractionsNearRoute.mockResolvedValue([]);

      const result = await serviceWithLimit.getRouteRecommendations(mockRoute);

      expect(result.recommendations.restaurants).toHaveLength(2);
    });
  });

  describe('error handling', () => {
    it('should handle service errors gracefully', async () => {
      const invalidRoute = null as any;

      await expect(service.getRouteRecommendations(invalidRoute)).rejects.toThrow(
        'Failed to generate route recommendations'
      );
    });
  });
});
