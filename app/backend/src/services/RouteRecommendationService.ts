/**
 * RouteRecommendationService
 * Provides recommendations for restaurants, service areas, and attractions along routes
 */

import {
  TransportPlan,
  PlanType,
  TransportLeg,
  RestaurantRecommendation,
  ServiceAreaRecommendation,
  AttractionRecommendation,
  RouteRecommendations,
  RecommendationPreferences
} from '../lib/shared-types';
import { RecommendationDataLoader } from './RecommendationDataLoader';
import { join } from 'path';

interface RouteAnalysis {
  totalDistance: number;
  totalDuration: number;
  legs: TransportLeg[];
  routePoints: Array<{ lat: number; lon: number; name: string }>;
}

interface RecommendationConfig {
  maxDistanceFromRoute: number; // km
  maxRecommendationsPerType: number;
  dataVersion: string;
}

export class RouteRecommendationService {
  private config: RecommendationConfig;
  private dataLoader: RecommendationDataLoader;

  constructor(config?: Partial<RecommendationConfig>) {
    this.config = {
      maxDistanceFromRoute: 5.0, // 5km
      maxRecommendationsPerType: 10,
      dataVersion: '1.0.0',
      ...config
    };
    this.dataLoader = new RecommendationDataLoader({
      dataPath: join(process.cwd(), 'data'),
      cacheEnabled: true
    });
  }

  /**
   * Generate comprehensive route recommendations
   */
  async getRouteRecommendations(
    route: TransportPlan,
    preferences: RecommendationPreferences = {}
  ): Promise<RouteRecommendations> {
    try {
      // Analyze the route
      const routeAnalysis = this.analyzeRoute(route);
      
      // Generate recommendations for each category
      const restaurants = await this.findRestaurants(routeAnalysis, preferences);
      const serviceAreas = await this.findServiceAreas(routeAnalysis, preferences);
      const attractions = preferences.includeAttractions 
        ? await this.findAttractions(routeAnalysis, preferences)
        : [];

      // Generate route ID
      const routeId = this.generateRouteId(route);

      return {
        routeId,
        totalDistance: routeAnalysis.totalDistance,
        estimatedDuration: routeAnalysis.totalDuration,
        recommendations: {
          restaurants,
          serviceAreas,
          attractions
        },
        summary: {
          totalRestaurants: restaurants.length,
          totalServiceAreas: serviceAreas.length,
          totalAttractions: attractions.length,
          recommendedStops: this.calculateRecommendedStops(restaurants, serviceAreas, attractions)
        },
        metadata: {
          generatedAt: new Date().toISOString(),
          dataVersion: this.config.dataVersion,
          algorithmVersion: '1.0.0'
        }
      };
    } catch (error) {
      console.error('Error generating route recommendations:', error);
      throw new Error('Failed to generate route recommendations');
    }
  }

  /**
   * Analyze route to extract key information
   */
  private analyzeRoute(route: TransportPlan): RouteAnalysis {
    const legs = route.legs || [];
    const totalDistance = legs.reduce((sum, leg) => sum + leg.distanceKm, 0);
    const totalDuration = legs.reduce((sum, leg) => sum + leg.timeHours, 0);

    // Extract route points (simplified - in real implementation, would use actual route geometry)
    const routePoints: Array<{ lat: number; lon: number; name: string }> = [];
    
    legs.forEach((leg, index) => {
      // Add start point
      if (index === 0) {
        routePoints.push({
          lat: this.extractLatFromLocation(leg.from),
          lon: this.extractLonFromLocation(leg.from),
          name: leg.from
        });
      }
      
      // Add end point
      routePoints.push({
        lat: this.extractLatFromLocation(leg.to),
        lon: this.extractLonFromLocation(leg.to),
        name: leg.to
      });
    });

    return {
      totalDistance,
      totalDuration,
      legs,
      routePoints
    };
  }

  /**
   * Find restaurants along the route
   */
  private async findRestaurants(
    routeAnalysis: RouteAnalysis,
    preferences: RecommendationPreferences
  ): Promise<RestaurantRecommendation[]> {
    try {
      // Load restaurants from CSV data
      const restaurants = await this.dataLoader.findRestaurantsNearRoute(
        routeAnalysis.routePoints,
        preferences.maxDistanceFromRoute || this.config.maxDistanceFromRoute,
        {
          foodTypes: preferences.foodTypes,
          priceRange: preferences.priceRange,
          amenities: preferences.amenities
        }
      );

      // Limit number of results
      return restaurants.slice(0, this.config.maxRecommendationsPerType);
    } catch (error) {
      console.error('Error finding restaurants:', error);
      // Fallback to mock data
      return this.generateMockRestaurants(routeAnalysis, preferences);
    }
  }

  /**
   * Find service areas along the route
   */
  private async findServiceAreas(
    routeAnalysis: RouteAnalysis,
    preferences: RecommendationPreferences
  ): Promise<ServiceAreaRecommendation[]> {
    try {
      // Load service areas from CSV data
      const serviceAreas = await this.dataLoader.findServiceAreasNearRoute(
        routeAnalysis.routePoints,
        preferences.maxDistanceFromRoute || this.config.maxDistanceFromRoute
      );

      // Limit number of results
      return serviceAreas.slice(0, this.config.maxRecommendationsPerType);
    } catch (error) {
      console.error('Error finding service areas:', error);
      // Fallback to mock data
      return this.generateMockServiceAreas(routeAnalysis);
    }
  }

  /**
   * Find attractions along the route
   */
  private async findAttractions(
    routeAnalysis: RouteAnalysis,
    preferences: RecommendationPreferences
  ): Promise<AttractionRecommendation[]> {
    try {
      // Load attractions from CSV data
      const attractions = await this.dataLoader.findAttractionsNearRoute(
        routeAnalysis.routePoints,
        (preferences.maxDistanceFromRoute || this.config.maxDistanceFromRoute) * 2 // Attractions can be further
      );

      // Limit number of results
      return attractions.slice(0, this.config.maxRecommendationsPerType);
    } catch (error) {
      console.error('Error finding attractions:', error);
      return [];
    }
  }

  /**
   * Generate mock restaurants (fallback)
   */
  private generateMockRestaurants(
    routeAnalysis: RouteAnalysis,
    preferences: RecommendationPreferences
  ): RestaurantRecommendation[] {
    const mockRestaurants: RestaurantRecommendation[] = [];
    
    // Generate mock restaurants for each major leg
    routeAnalysis.legs.forEach((leg, index) => {
      if (leg.distanceKm > 50) { // Only for longer legs
        const restaurant = this.generateMockRestaurant(leg, index, preferences);
        mockRestaurants.push(restaurant);
      }
    });

    return this.filterRestaurants(mockRestaurants, preferences);
  }

  /**
   * Generate mock service areas (fallback)
   */
  private generateMockServiceAreas(routeAnalysis: RouteAnalysis): ServiceAreaRecommendation[] {
    const mockServiceAreas: ServiceAreaRecommendation[] = [];
    
    // Generate service areas for highway legs
    routeAnalysis.legs.forEach((leg, index) => {
      if (leg.distanceKm > 100 && leg.mode === 'truck') { // Highway sections
        const serviceArea = this.generateMockServiceArea(leg, index);
        mockServiceAreas.push(serviceArea);
      }
    });

    return mockServiceAreas.slice(0, this.config.maxRecommendationsPerType);
  }

  /**
   * Generate mock restaurant data
   */
  private generateMockRestaurant(
    leg: TransportLeg,
    index: number,
    preferences: RecommendationPreferences
  ): RestaurantRecommendation {
    const restaurantTypes = ['restaurant', 'cafe', 'fast_food', 'convenience_store'];
    const cuisines = ['japanese', 'western', 'chinese', 'italian', 'fast_food'];
    const priceRanges: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high'];

    return {
      id: `restaurant_${index}_${Date.now()}`,
      name: `Restaurant ${leg.from}-${leg.to}`,
      type: restaurantTypes[index % restaurantTypes.length] as any,
      cuisine: [cuisines[index % cuisines.length]],
      priceRange: priceRanges[index % priceRanges.length],
      location: {
        lat: this.extractLatFromLocation(leg.from) + (Math.random() - 0.5) * 0.01,
        lon: this.extractLonFromLocation(leg.from) + (Math.random() - 0.5) * 0.01,
        address: `Near ${leg.from}, Japan`
      },
      rating: 3.5 + Math.random() * 1.5,
      distanceFromRoute: Math.random() * 2, // 0-2km
      estimatedStopTime: 30 + Math.random() * 60, // 30-90 minutes
      amenities: ['parking', 'restroom', 'wifi'],
      openingHours: '06:00-22:00',
      description: `Convenient restaurant along the route from ${leg.from} to ${leg.to}`
    };
  }

  /**
   * Generate mock service area data
   */
  private generateMockServiceArea(leg: TransportLeg, index: number): ServiceAreaRecommendation {
    return {
      id: `service_area_${index}_${Date.now()}`,
      name: `Service Area ${leg.from}-${leg.to}`,
      type: 'service_area',
      location: {
        lat: this.extractLatFromLocation(leg.from) + (Math.random() - 0.5) * 0.005,
        lon: this.extractLonFromLocation(leg.from) + (Math.random() - 0.5) * 0.005,
        address: `Highway Service Area, Near ${leg.from}, Japan`
      },
      distanceFromRoute: Math.random() * 1, // 0-1km
      facilities: ['restroom', 'parking', 'gas_station', 'restaurant', 'convenience_store'],
      estimatedStopTime: 15 + Math.random() * 30, // 15-45 minutes
      openingHours: '24/7',
      description: `Highway service area with full facilities`
    };
  }

  /**
   * Filter restaurants based on preferences
   */
  private filterRestaurants(
    restaurants: RestaurantRecommendation[],
    preferences: RecommendationPreferences
  ): RestaurantRecommendation[] {
    let filtered = restaurants;

    // Filter by food types
    if (preferences.foodTypes && preferences.foodTypes.length > 0) {
      filtered = filtered.filter(restaurant =>
        restaurant.cuisine.some(cuisine => preferences.foodTypes!.includes(cuisine))
      );
    }

    // Filter by price range
    if (preferences.priceRange) {
      filtered = filtered.filter(restaurant => restaurant.priceRange === preferences.priceRange);
    }

    // Filter by distance
    const maxDistance = preferences.maxDistanceFromRoute || this.config.maxDistanceFromRoute;
    filtered = filtered.filter(restaurant => restaurant.distanceFromRoute <= maxDistance);

    // Limit number of results
    return filtered.slice(0, this.config.maxRecommendationsPerType);
  }

  /**
   * Calculate recommended number of stops
   */
  private calculateRecommendedStops(
    restaurants: RestaurantRecommendation[],
    serviceAreas: ServiceAreaRecommendation[],
    attractions: AttractionRecommendation[]
  ): number {
    // Simple heuristic: recommend stops every 2-3 hours
    const totalDuration = restaurants.length + serviceAreas.length + attractions.length;
    return Math.min(Math.max(1, Math.floor(totalDuration / 3)), 5);
  }

  /**
   * Generate unique route ID
   */
  private generateRouteId(route: TransportPlan): string {
    const legs = route.legs || [];
    const routeString = legs.map(leg => `${leg.from}-${leg.to}-${leg.distanceKm}-${leg.timeHours}`).join('|');
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).slice(2, 8);
    const hash = Buffer.from(routeString).toString('base64').slice(0, 8);
    return `route_${hash}_${timestamp}_${random}`;
  }

  /**
   * Extract latitude from location string (mock implementation)
   */
  private extractLatFromLocation(location: string): number {
    // Mock coordinates for major cities
    const coordinates: Record<string, number> = {
      'Tokyo': 35.6895,
      'Osaka': 34.6937,
      'Nagoya': 35.1815,
      'Kyoto': 35.0116,
      'Yokohama': 35.4658,
      'Kobe': 34.6901,
      'Fukuoka': 33.5904,
      'Sapporo': 43.0642,
      'Tokyo Port': 35.6895,
      'Osaka Port': 34.6937,
      'Yokohama Port': 35.4658,
      'Kobe Port': 34.6901,
      'Hakata Port': 33.5904
    };
    
    return coordinates[location] || 35.0; // Default to Tokyo area
  }

  /**
   * Extract longitude from location string (mock implementation)
   */
  private extractLonFromLocation(location: string): number {
    // Mock coordinates for major cities
    const coordinates: Record<string, number> = {
      'Tokyo': 139.6917,
      'Osaka': 135.5023,
      'Nagoya': 136.9066,
      'Kyoto': 135.7681,
      'Yokohama': 139.6205,
      'Kobe': 135.1956,
      'Fukuoka': 130.4017,
      'Sapporo': 141.3469,
      'Tokyo Port': 139.6917,
      'Osaka Port': 135.5023,
      'Yokohama Port': 139.6205,
      'Kobe Port': 135.1956,
      'Hakata Port': 130.4017
    };
    
    return coordinates[location] || 139.0; // Default to Tokyo area
  }
}
