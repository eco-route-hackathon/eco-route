/**
 * Route Recommendations API Integration Tests
 * Tests for POST /route/recommendations endpoint
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { RouteRecommendationService } from '../../src/services/RouteRecommendationService';
import { RecommendationDataLoader } from '../../src/services/RecommendationDataLoader';

// Mock the services
vi.mock('../../src/services/RouteRecommendationService');
vi.mock('../../src/services/RecommendationDataLoader');

const MockRouteRecommendationService = vi.mocked(RouteRecommendationService);
const MockRecommendationDataLoader = vi.mocked(RecommendationDataLoader);

describe('POST /route/recommendations', () => {
  let app: any;
  let mockService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create mock service instance
    mockService = {
      getRouteRecommendations: vi.fn()
    };
    
    MockRouteRecommendationService.mockImplementation(() => mockService);
    
    app = createApp();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  const validRouteRequest = {
    route: {
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
    },
    preferences: {
      foodTypes: ['japanese', 'western'],
      priceRange: 'medium',
      maxDistanceFromRoute: 5.0,
      includeAttractions: true
    }
  };

  const mockRecommendations = {
    routeId: 'route_abc123',
    totalDistance: 520,
    estimatedDuration: 7.2,
    recommendations: {
      restaurants: [
        {
          id: 'rest_001',
          name: '東京駅ラーメン街',
          type: 'restaurant',
          cuisine: ['japanese'],
          priceRange: 'medium',
          location: {
            lat: 35.6812,
            lon: 139.7671,
            address: '東京都千代田区丸の内1-9-1'
          },
          rating: 4.2,
          distanceFromRoute: 0.5,
          estimatedStopTime: 45,
          amenities: ['parking', 'restroom', 'wifi'],
          openingHours: '06:00-23:00',
          description: '東京駅構内の人気ラーメン店'
        }
      ],
      serviceAreas: [
        {
          id: 'sa_001',
          name: '東名高速 海老名SA',
          type: 'service_area',
          location: {
            lat: 35.4658,
            lon: 139.6205,
            address: '神奈川県海老名市海老名1-1-1'
          },
          distanceFromRoute: 0.2,
          facilities: ['restroom', 'parking', 'gas_station', 'restaurant'],
          estimatedStopTime: 20,
          openingHours: '24/7',
          description: '東名高速道路の大型サービスエリア'
        }
      ],
      attractions: [
        {
          id: 'attr_001',
          name: '東京タワー',
          type: 'tourist_spot',
          location: {
            lat: 35.6586,
            lon: 139.7454,
            address: '東京都港区芝公園4-2-8'
          },
          distanceFromRoute: 1.5,
          estimatedVisitTime: 120,
          rating: 4.2,
          category: ['landmark', 'observation_deck'],
          description: '東京のシンボルタワー'
        }
      ]
    },
    summary: {
      totalRestaurants: 1,
      totalServiceAreas: 1,
      totalAttractions: 1,
      recommendedStops: 2
    },
    metadata: {
      generatedAt: '2024-01-01T00:00:00.000Z',
      dataVersion: '1.0.0',
      algorithmVersion: '1.0.0'
    }
  };

  describe('successful requests', () => {
    it('should return route recommendations for valid request', async () => {
      mockService.getRouteRecommendations.mockResolvedValue(mockRecommendations);

      const response = await request(app)
        .post('/route/recommendations')
        .send(validRouteRequest)
        .expect(200);

      expect(response.body).toEqual(mockRecommendations);
      expect(mockService.getRouteRecommendations).toHaveBeenCalledWith(
        validRouteRequest.route,
        validRouteRequest.preferences
      );
    });

    it('should return recommendations without preferences', async () => {
      const requestWithoutPreferences = {
        route: validRouteRequest.route
      };

      mockService.getRouteRecommendations.mockResolvedValue(mockRecommendations);

      const response = await request(app)
        .post('/route/recommendations')
        .send(requestWithoutPreferences)
        .expect(200);

      expect(response.body).toEqual(mockRecommendations);
      expect(mockService.getRouteRecommendations).toHaveBeenCalledWith(
        validRouteRequest.route,
        {}
      );
    });

    it('should include request ID in metadata', async () => {
      mockService.getRouteRecommendations.mockResolvedValue(mockRecommendations);

      const response = await request(app)
        .post('/route/recommendations')
        .set('x-request-id', 'test-request-123')
        .send(validRouteRequest)
        .expect(200);

      expect(response.body.metadata.requestId).toBe('test-request-123');
    });

    it('should include processing time in metadata', async () => {
      mockService.getRouteRecommendations.mockResolvedValue(mockRecommendations);

      const response = await request(app)
        .post('/route/recommendations')
        .send(validRouteRequest)
        .expect(200);

      expect(response.body.metadata.processingTimeMs).toBeDefined();
      expect(typeof response.body.metadata.processingTimeMs).toBe('number');
    });
  });

  describe('validation errors', () => {
    it('should return 400 for missing request body', async () => {
      const response = await request(app)
        .post('/route/recommendations')
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toBe('Route is required');
    });

    it('should return 400 for missing route', async () => {
      const response = await request(app)
        .post('/route/recommendations')
        .send({ preferences: {} })
        .expect(400);

      expect(response.body.error.message).toBe('Route is required');
    });

    it('should return 400 for invalid route plan', async () => {
      const invalidRequest = {
        route: {
          plan: 'invalid',
          legs: []
        }
      };

      const response = await request(app)
        .post('/route/recommendations')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.error.message).toBe('Invalid route plan type');
    });

    it('should return 400 for empty legs array', async () => {
      const invalidRequest = {
        route: {
          plan: 'truck',
          legs: []
        }
      };

      const response = await request(app)
        .post('/route/recommendations')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.error.message).toBe('Route legs are required');
    });

    it('should return 400 for invalid leg data', async () => {
      const invalidRequest = {
        route: {
          plan: 'truck',
          legs: [
            {
              from: 'Tokyo',
              to: '', // Invalid empty destination
              distanceKm: 100,
              timeHours: 2.0
            }
          ]
        }
      };

      const response = await request(app)
        .post('/route/recommendations')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.error.message).toContain('Invalid leg');
    });

    it('should return 400 for invalid distance', async () => {
      const invalidRequest = {
        route: {
          plan: 'truck',
          legs: [
            {
              from: 'Tokyo',
              to: 'Osaka',
              distanceKm: -100, // Invalid negative distance
              timeHours: 2.0
            }
          ]
        }
      };

      const response = await request(app)
        .post('/route/recommendations')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.error.message).toContain('distanceKm must be positive');
    });

    it('should return 400 for invalid preferences', async () => {
      const invalidRequest = {
        route: validRouteRequest.route,
        preferences: {
          foodTypes: 'invalid', // Should be array
          priceRange: 'invalid', // Should be low/medium/high
          maxDistanceFromRoute: -1 // Should be positive
        }
      };

      const response = await request(app)
        .post('/route/recommendations')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.error.message).toContain('foodTypes must be an array');
    });

    it('should return 400 for invalid price range', async () => {
      const invalidRequest = {
        route: validRouteRequest.route,
        preferences: {
          priceRange: 'expensive' // Invalid value
        }
      };

      const response = await request(app)
        .post('/route/recommendations')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.error.message).toContain('priceRange must be low, medium, or high');
    });
  });

  describe('service errors', () => {
    it('should return 500 for service errors', async () => {
      mockService.getRouteRecommendations.mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .post('/route/recommendations')
        .send(validRouteRequest)
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('SERVICE_ERROR');
      expect(response.body.error.message).toBe('Failed to generate route recommendations');
      expect(response.body.error.details).toBe('Service error');
    });

    it('should return 500 for unknown errors', async () => {
      mockService.getRouteRecommendations.mockRejectedValue('Unknown error');

      const response = await request(app)
        .post('/route/recommendations')
        .send(validRouteRequest)
        .expect(500);

      expect(response.body.error.details).toBe('Unknown error');
    });
  });

  describe('request headers', () => {
    it('should handle missing request ID', async () => {
      mockService.getRouteRecommendations.mockResolvedValue(mockRecommendations);

      const response = await request(app)
        .post('/route/recommendations')
        .send(validRouteRequest)
        .expect(200);

      expect(response.body.metadata.requestId).toBe('unknown');
    });

    it('should preserve request ID from headers', async () => {
      mockService.getRouteRecommendations.mockResolvedValue(mockRecommendations);

      const response = await request(app)
        .post('/route/recommendations')
        .set('x-request-id', 'custom-request-id')
        .send(validRouteRequest)
        .expect(200);

      expect(response.body.metadata.requestId).toBe('custom-request-id');
    });
  });

  describe('content type handling', () => {
    it('should accept JSON content type', async () => {
      mockService.getRouteRecommendations.mockResolvedValue(mockRecommendations);

      await request(app)
        .post('/route/recommendations')
        .set('Content-Type', 'application/json')
        .send(validRouteRequest)
        .expect(200);
    });

    it('should handle missing content type', async () => {
      mockService.getRouteRecommendations.mockResolvedValue(mockRecommendations);

      await request(app)
        .post('/route/recommendations')
        .send(validRouteRequest)
        .expect(200);
    });
  });

  describe('response format', () => {
    it('should return valid response structure', async () => {
      mockService.getRouteRecommendations.mockResolvedValue(mockRecommendations);

      const response = await request(app)
        .post('/route/recommendations')
        .send(validRouteRequest)
        .expect(200);

      // Check response structure
      expect(response.body).toHaveProperty('routeId');
      expect(response.body).toHaveProperty('totalDistance');
      expect(response.body).toHaveProperty('estimatedDuration');
      expect(response.body).toHaveProperty('recommendations');
      expect(response.body).toHaveProperty('summary');
      expect(response.body).toHaveProperty('metadata');

      // Check recommendations structure
      expect(response.body.recommendations).toHaveProperty('restaurants');
      expect(response.body.recommendations).toHaveProperty('serviceAreas');
      expect(response.body.recommendations).toHaveProperty('attractions');

      // Check summary structure
      expect(response.body.summary).toHaveProperty('totalRestaurants');
      expect(response.body.summary).toHaveProperty('totalServiceAreas');
      expect(response.body.summary).toHaveProperty('totalAttractions');
      expect(response.body.summary).toHaveProperty('recommendedStops');

      // Check metadata structure
      expect(response.body.metadata).toHaveProperty('generatedAt');
      expect(response.body.metadata).toHaveProperty('dataVersion');
      expect(response.body.metadata).toHaveProperty('algorithmVersion');
      expect(response.body.metadata).toHaveProperty('processingTimeMs');
      expect(response.body.metadata).toHaveProperty('requestId');
    });
  });
});
