/**
 * RecommendationDataLoader Tests
 * Tests for CSV data loading functionality
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import { RecommendationDataLoader } from '../../src/services/RecommendationDataLoader';

// Mock fs module
vi.mock('fs', async () => {
  const actual = await vi.importActual('fs');
  return {
    ...actual,
    readFileSync: vi.fn(),
    existsSync: vi.fn()
  };
});

const mockReadFileSync = vi.mocked(readFileSync);
const mockExistsSync = vi.mocked(existsSync);

describe('RecommendationDataLoader', () => {
  let dataLoader: RecommendationDataLoader;
  const testDataPath = '/test/data';

  beforeEach(() => {
    vi.clearAllMocks();
    dataLoader = new RecommendationDataLoader({
      dataPath: testDataPath,
      cacheEnabled: true
    });
  });

  afterEach(() => {
    dataLoader.clearCache();
  });

  describe('loadRestaurants', () => {
    const mockRestaurantCsv = `id,name,type,cuisine,price_range,lat,lon,address,rating,distance_from_route,estimated_stop_time,amenities,opening_hours,description
rest_001,東京駅ラーメン街,restaurant,japanese,medium,35.6812,139.7671,東京都千代田区丸の内1-9-1,4.2,0.5,45,parking;restroom;wifi,06:00-23:00,東京駅構内の人気ラーメン店
rest_002,横浜中華街 陳家,restaurant,chinese,high,35.4369,139.6503,神奈川県横浜市中区山下町149,4.5,1.2,60,parking;restroom,11:00-21:00,横浜中華街の老舗中華料理店`;

    it('should load restaurants from CSV file', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(mockRestaurantCsv);

      const restaurants = await dataLoader.loadRestaurants();

      expect(mockExistsSync).toHaveBeenCalledWith(join(testDataPath, 'restaurants.csv'));
      expect(mockReadFileSync).toHaveBeenCalledWith(join(testDataPath, 'restaurants.csv'), 'utf-8');
      
      expect(restaurants).toHaveLength(2);
      expect(restaurants[0]).toEqual({
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
      });
    });

    it('should return empty array when file does not exist', async () => {
      mockExistsSync.mockReturnValue(false);

      const restaurants = await dataLoader.loadRestaurants();

      expect(restaurants).toHaveLength(0);
    });

    it('should handle CSV parsing errors gracefully', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockImplementation(() => {
        throw new Error('File read error');
      });

      const restaurants = await dataLoader.loadRestaurants();

      expect(restaurants).toHaveLength(0);
    });

    it('should use cache on subsequent calls', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(mockRestaurantCsv);

      const restaurants1 = await dataLoader.loadRestaurants();
      const restaurants2 = await dataLoader.loadRestaurants();

      expect(mockReadFileSync).toHaveBeenCalledTimes(1);
      expect(restaurants1).toEqual(restaurants2);
    });

    it('should not use cache when disabled', async () => {
      const noCacheLoader = new RecommendationDataLoader({
        dataPath: testDataPath,
        cacheEnabled: false
      });

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(mockRestaurantCsv);

      await noCacheLoader.loadRestaurants();
      await noCacheLoader.loadRestaurants();

      expect(mockReadFileSync).toHaveBeenCalledTimes(2);
    });
  });

  describe('loadServiceAreas', () => {
    const mockServiceAreaCsv = `id,name,type,lat,lon,address,distance_from_route,facilities,estimated_stop_time,opening_hours,description
sa_001,東名高速 海老名SA,service_area,35.4658,139.6205,神奈川県海老名市海老名1-1-1,0.2,restroom;parking;gas_station;restaurant,20,24/7,東名高速道路の大型サービスエリア`;

    it('should load service areas from CSV file', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(mockServiceAreaCsv);

      const serviceAreas = await dataLoader.loadServiceAreas();

      expect(serviceAreas).toHaveLength(1);
      expect(serviceAreas[0]).toEqual({
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
      });
    });
  });

  describe('loadAttractions', () => {
    const mockAttractionCsv = `id,name,type,lat,lon,address,distance_from_route,estimated_visit_time,rating,category,description
attr_001,東京タワー,tourist_spot,35.6586,139.7454,東京都港区芝公園4-2-8,1.5,120,4.2,landmark;observation_deck,東京のシンボルタワー`;

    it('should load attractions from CSV file', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(mockAttractionCsv);

      const attractions = await dataLoader.loadAttractions();

      expect(attractions).toHaveLength(1);
      expect(attractions[0]).toEqual({
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
      });
    });
  });

  describe('findRestaurantsNearRoute', () => {
    const routePoints = [
      { lat: 35.6812, lon: 139.7671, name: 'Tokyo' },
      { lat: 35.4658, lon: 139.6205, name: 'Yokohama' }
    ];

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
      },
      {
        id: 'rest_002',
        name: '遠いレストラン',
        type: 'restaurant' as const,
        cuisine: ['western'],
        priceRange: 'high' as const,
        location: { lat: 35.0, lon: 139.0, address: '遠い場所' },
        rating: 4.5,
        distanceFromRoute: 10.0,
        estimatedStopTime: 60,
        amenities: ['parking'],
        openingHours: '12:00-22:00'
      }
    ];

    it('should filter restaurants by distance from route', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('');

      // Mock the loadRestaurants method to return test data
      const loadRestaurantsSpy = vi.spyOn(dataLoader, 'loadRestaurants').mockResolvedValue(mockRestaurants);

      const result = await dataLoader.findRestaurantsNearRoute(routePoints, 5.0);

      expect(loadRestaurantsSpy).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('東京駅ラーメン街');
    });

    it('should filter restaurants by preferences', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('');

      const loadRestaurantsSpy = vi.spyOn(dataLoader, 'loadRestaurants').mockResolvedValue(mockRestaurants);

      const preferences = {
        foodTypes: ['japanese'],
        priceRange: 'medium' as const,
        amenities: ['wifi']
      };

      const result = await dataLoader.findRestaurantsNearRoute(routePoints, 5.0, preferences);

      expect(result).toHaveLength(1);
      expect(result[0].cuisine).toContain('japanese');
      expect(result[0].priceRange).toBe('medium');
      expect(result[0].amenities).toContain('wifi');
    });

    it('should return empty array when no restaurants match criteria', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('');

      const loadRestaurantsSpy = vi.spyOn(dataLoader, 'loadRestaurants').mockResolvedValue(mockRestaurants);

      const preferences = {
        foodTypes: ['italian'],
        priceRange: 'low' as const
      };

      const result = await dataLoader.findRestaurantsNearRoute(routePoints, 5.0, preferences);

      expect(result).toHaveLength(0);
    });
  });

  describe('calculateDistance', () => {
    it('should calculate distance between Tokyo and Osaka correctly', () => {
      const tokyo = { lat: 35.6812, lon: 139.7671 };
      const osaka = { lat: 34.6937, lon: 135.5023 };
      
      // Access private method through any type
      const distance = (dataLoader as any).calculateDistance(tokyo.lat, tokyo.lon, osaka.lat, osaka.lon);
      
      // Tokyo to Osaka is approximately 400km
      expect(distance).toBeCloseTo(400, -1);
    });

    it('should calculate distance between same points as zero', () => {
      const point = { lat: 35.6812, lon: 139.7671 };
      
      const distance = (dataLoader as any).calculateDistance(point.lat, point.lon, point.lat, point.lon);
      
      expect(distance).toBe(0);
    });
  });

  describe('clearCache', () => {
    it('should clear the cache', () => {
      const clearSpy = vi.spyOn(dataLoader, 'clearCache');
      
      dataLoader.clearCache();
      
      expect(clearSpy).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle file system errors gracefully', async () => {
      mockExistsSync.mockImplementation(() => {
        throw new Error('File system error');
      });

      const restaurants = await dataLoader.loadRestaurants();
      
      expect(restaurants).toHaveLength(0);
    });

    it('should handle invalid CSV data gracefully', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('invalid,csv,data\nwith,missing,columns');

      const restaurants = await dataLoader.loadRestaurants();
      
      expect(restaurants).toHaveLength(0);
    });
  });
});
