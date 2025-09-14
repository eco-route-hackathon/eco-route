/**
 * RecommendationDataLoader
 * Loads restaurant, service area, and attraction data from CSV files
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { parse } from 'csv-parse/sync';
import {
  RestaurantRecommendation,
  ServiceAreaRecommendation,
  AttractionRecommendation
} from '../lib/shared-types';

interface DataLoaderConfig {
  dataPath?: string;
  cacheEnabled?: boolean;
}

export class RecommendationDataLoader {
  private dataPath: string;
  private cacheEnabled: boolean;
  private cache: Map<string, any[]> = new Map();
  private cacheExpiration: number = 3600000; // 1 hour

  constructor(config: DataLoaderConfig = {}) {
    this.dataPath = config.dataPath || join(process.cwd(), 'data');
    this.cacheEnabled = config.cacheEnabled ?? true;
  }

  /**
   * Load restaurant data from CSV
   */
  async loadRestaurants(): Promise<RestaurantRecommendation[]> {
    const cacheKey = 'restaurants';
    
    if (this.cacheEnabled && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      const csvData = this.loadCsvFile('restaurants.csv');
      const restaurants = this.parseRestaurants(csvData);
      
      if (this.cacheEnabled) {
        this.cache.set(cacheKey, restaurants);
        setTimeout(() => this.cache.delete(cacheKey), this.cacheExpiration);
      }
      
      return restaurants;
    } catch (error) {
      console.error('Error loading restaurants:', error);
      return [];
    }
  }

  /**
   * Load service area data from CSV
   */
  async loadServiceAreas(): Promise<ServiceAreaRecommendation[]> {
    const cacheKey = 'service_areas';
    
    if (this.cacheEnabled && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      const csvData = this.loadCsvFile('service_areas.csv');
      const serviceAreas = this.parseServiceAreas(csvData);
      
      if (this.cacheEnabled) {
        this.cache.set(cacheKey, serviceAreas);
        setTimeout(() => this.cache.delete(cacheKey), this.cacheExpiration);
      }
      
      return serviceAreas;
    } catch (error) {
      console.error('Error loading service areas:', error);
      return [];
    }
  }

  /**
   * Load attraction data from CSV
   */
  async loadAttractions(): Promise<AttractionRecommendation[]> {
    const cacheKey = 'attractions';
    
    if (this.cacheEnabled && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      const csvData = this.loadCsvFile('attractions.csv');
      const attractions = this.parseAttractions(csvData);
      
      if (this.cacheEnabled) {
        this.cache.set(cacheKey, attractions);
        setTimeout(() => this.cache.delete(cacheKey), this.cacheExpiration);
      }
      
      return attractions;
    } catch (error) {
      console.error('Error loading attractions:', error);
      return [];
    }
  }

  /**
   * Find restaurants near route points
   */
  async findRestaurantsNearRoute(
    routePoints: Array<{ lat: number; lon: number; name: string }>,
    maxDistance: number = 5.0,
    preferences?: { foodTypes?: string[]; priceRange?: string; amenities?: string[] }
  ): Promise<RestaurantRecommendation[]> {
    const restaurants = await this.loadRestaurants();
    
    let filtered = restaurants.filter(restaurant => {
      // Check if restaurant is near any route point
      return routePoints.some(point => 
        this.calculateDistance(point.lat, point.lon, restaurant.location.lat, restaurant.location.lon) <= maxDistance
      );
    });

    // Apply preferences
    if (preferences) {
      if (preferences.foodTypes && preferences.foodTypes.length > 0) {
        filtered = filtered.filter(restaurant =>
          restaurant.cuisine.some(cuisine => preferences.foodTypes!.includes(cuisine))
        );
      }

      if (preferences.priceRange) {
        filtered = filtered.filter(restaurant => restaurant.priceRange === preferences.priceRange);
      }

      if (preferences.amenities && preferences.amenities.length > 0) {
        filtered = filtered.filter(restaurant =>
          preferences.amenities!.some(amenity => restaurant.amenities.includes(amenity))
        );
      }
    }

    return filtered;
  }

  /**
   * Find service areas near route points
   */
  async findServiceAreasNearRoute(
    routePoints: Array<{ lat: number; lon: number; name: string }>,
    maxDistance: number = 5.0
  ): Promise<ServiceAreaRecommendation[]> {
    const serviceAreas = await this.loadServiceAreas();
    
    return serviceAreas.filter(serviceArea => {
      return routePoints.some(point => 
        this.calculateDistance(point.lat, point.lon, serviceArea.location.lat, serviceArea.location.lon) <= maxDistance
      );
    });
  }

  /**
   * Find attractions near route points
   */
  async findAttractionsNearRoute(
    routePoints: Array<{ lat: number; lon: number; name: string }>,
    maxDistance: number = 10.0
  ): Promise<AttractionRecommendation[]> {
    const attractions = await this.loadAttractions();
    
    return attractions.filter(attraction => {
      return routePoints.some(point => 
        this.calculateDistance(point.lat, point.lon, attraction.location.lat, attraction.location.lon) <= maxDistance
      );
    });
  }

  /**
   * Load CSV file content
   */
  private loadCsvFile(filename: string): string {
    const filePath = join(this.dataPath, filename);
    
    if (!existsSync(filePath)) {
      throw new Error(`CSV file not found: ${filePath}`);
    }

    return readFileSync(filePath, 'utf-8');
  }

  /**
   * Parse restaurant CSV data
   */
  private parseRestaurants(csvData: string): RestaurantRecommendation[] {
    const records = parse(csvData, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    return records.map((record: any) => ({
      id: record.id,
      name: record.name,
      type: record.type as 'restaurant' | 'cafe' | 'fast_food' | 'convenience_store',
      cuisine: record.cuisine.split(',').map((c: string) => c.trim()),
      priceRange: record.price_range as 'low' | 'medium' | 'high',
      location: {
        lat: parseFloat(record.lat),
        lon: parseFloat(record.lon),
        address: record.address
      },
      rating: parseFloat(record.rating),
      distanceFromRoute: parseFloat(record.distance_from_route),
      estimatedStopTime: parseInt(record.estimated_stop_time),
      amenities: record.amenities.split(';').map((a: string) => a.trim()),
      openingHours: record.opening_hours,
      description: record.description || undefined
    }));
  }

  /**
   * Parse service area CSV data
   */
  private parseServiceAreas(csvData: string): ServiceAreaRecommendation[] {
    const records = parse(csvData, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    return records.map((record: any) => ({
      id: record.id,
      name: record.name,
      type: record.type as 'service_area' | 'rest_area' | 'parking_area',
      location: {
        lat: parseFloat(record.lat),
        lon: parseFloat(record.lon),
        address: record.address
      },
      distanceFromRoute: parseFloat(record.distance_from_route),
      facilities: record.facilities.split(';').map((f: string) => f.trim()),
      estimatedStopTime: parseInt(record.estimated_stop_time),
      openingHours: record.opening_hours,
      description: record.description || undefined
    }));
  }

  /**
   * Parse attraction CSV data
   */
  private parseAttractions(csvData: string): AttractionRecommendation[] {
    const records = parse(csvData, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    return records.map((record: any) => ({
      id: record.id,
      name: record.name,
      type: record.type as 'tourist_spot' | 'landmark' | 'museum' | 'park',
      location: {
        lat: parseFloat(record.lat),
        lon: parseFloat(record.lon),
        address: record.address
      },
      distanceFromRoute: parseFloat(record.distance_from_route),
      estimatedVisitTime: parseInt(record.estimated_visit_time),
      rating: parseFloat(record.rating),
      category: record.category.split(';').map((c: string) => c.trim()),
      description: record.description || undefined
    }));
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return distance;
  }

  /**
   * Convert degrees to radians
   */
  private deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}
