/**
 * RouteCalculator Service
 * Calculates routes using AWS Location Service
 */

import { 
  LocationClient, 
  CalculateRouteCommand,
  CalculateRouteCommandInput,
  CalculateRouteCommandOutput 
} from '@aws-sdk/client-location';
import { 
  Location, 
  LocationType, 
  ModeType, 
  TransportLeg 
} from '../lib/shared-types';

interface RouteCalculatorConfig {
  calculatorName: string;
  region: string;
}

interface RouteResult {
  distanceKm: number;
  timeHours: number;
}

interface ShipLinkInfo {
  from: Location;
  to: Location;
  distanceKm: number;
  timeHours: number;
}

interface RouteOptions {
  retries?: number;
  includeAlternatives?: boolean;
  retryCount?: number; // Internal use
}

export class RouteCalculator {
  private locationClient: LocationClient;
  private calculatorName: string;
  private routeCache: Map<string, RouteResult> = new Map();
  private requestQueue: Array<() => Promise<any>> = [];
  private activeRequests = 0;
  private maxConcurrentRequests = 5;
  private requestDelay = 200; // milliseconds (5 requests per second)
  private lastRequestTime = 0;

  constructor(config: RouteCalculatorConfig) {
    this.calculatorName = config.calculatorName;
    this.locationClient = new LocationClient({ region: config.region });
  }

  /**
   * Calculate truck route between two locations
   */
  async calculateTruckRoute(origin: Location, destination: Location, options?: RouteOptions): Promise<RouteResult> {
    // Handle both old and new API signatures
    const opts: RouteOptions = typeof options === 'number' 
      ? { retryCount: options } 
      : (options || {});
    
    const maxRetries = opts.retries || 3;
    const currentRetry = opts.retryCount || 0;

    // Validate coordinates
    if (!this.isValidCoordinate(origin.lat, origin.lon) || 
        !this.isValidCoordinate(destination.lat, destination.lon)) {
      throw new Error('Invalid coordinates');
    }

    // Check cache first (unless includeAlternatives is set)
    const cacheKey = `${origin.id}-${destination.id}`;
    if (!opts.includeAlternatives && this.routeCache.has(cacheKey)) {
      return this.routeCache.get(cacheKey)!;
    }

    // Apply throttling
    return this.throttleRequest(async () => {
      const input: CalculateRouteCommandInput = {
        CalculatorName: this.calculatorName,
        DeparturePosition: [origin.lon, origin.lat],
        DestinationPosition: [destination.lon, destination.lat],
        TravelMode: 'Truck',
        DistanceUnit: 'Kilometers',
        IncludeLegGeometry: false
      };

      try {
        const command = new CalculateRouteCommand(input);
        const response: CalculateRouteCommandOutput = await this.locationClient.send(command);

        if (!response || !response.Summary) {
          throw new Error('Invalid response from AWS Location Service');
        }

        const result: RouteResult = {
          distanceKm: response.Summary.Distance || 0,
          timeHours: (response.Summary.DurationSeconds || 0) / 3600
        };

        // Cache the result
        if (!opts.includeAlternatives) {
          this.routeCache.set(cacheKey, result);
        }

        return result;
      } catch (error: any) {
        // Retry logic for timeout errors
        if (error.message === 'Timeout' && currentRetry < maxRetries - 1) {
          return this.calculateTruckRoute(origin, destination, {
            ...opts,
            retryCount: currentRetry + 1
          });
        }
        
        if (error.name === 'ResourceNotFoundException') {
          throw new Error(`Route calculator ${this.calculatorName} not found`);
        }
        if (error.name === 'ValidationException') {
          throw new Error('Invalid coordinates provided');
        }
        throw error;
      }
    });
  }

  /**
   * Validate coordinates
   */
  private isValidCoordinate(lat: number, lon: number): boolean {
    return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
  }

  /**
   * Plan multi-modal route (truck + ship + truck)
   */
  async planMultiModalRoute(
    origin: Location,
    destination: Location,
    originPort: Location,
    destinationPort: Location,
    shipLink: ShipLinkInfo
  ): Promise<TransportLeg[]> {
    const legs: TransportLeg[] = [];

    // First leg: City to Port (truck)
    const firstLeg = await this.calculateTruckRoute(origin, originPort);
    legs.push({
      from: origin.name,
      to: originPort.name,
      mode: ModeType.TRUCK,
      distanceKm: firstLeg.distanceKm,
      timeHours: firstLeg.timeHours
    });

    // Second leg: Port to Port (ship)
    legs.push({
      from: originPort.name,
      to: destinationPort.name,
      mode: ModeType.SHIP,
      distanceKm: shipLink.distanceKm,
      timeHours: shipLink.timeHours
    });

    // Third leg: Port to City (truck)
    const lastLeg = await this.calculateTruckRoute(destinationPort, destination);
    legs.push({
      from: destinationPort.name,
      to: destination.name,
      mode: ModeType.TRUCK,
      distanceKm: lastLeg.distanceKm,
      timeHours: lastLeg.timeHours
    });

    return legs;
  }

  /**
   * Find nearest port to a given location
   */
  findNearestPort(location: Location, allLocations: Location[]): Location | undefined {
    const ports = allLocations.filter(loc => loc.type === LocationType.PORT);
    
    if (ports.length === 0) {
      return undefined;
    }

    let nearestPort: Location | undefined;
    let minDistance = Infinity;

    for (const port of ports) {
      const distance = this.calculateDistance(location, port);
      if (distance < minDistance) {
        minDistance = distance;
        nearestPort = port;
      }
    }

    return nearestPort;
  }

  /**
   * Calculate straight-line distance between two locations (Haversine formula)
   */
  private calculateDistance(loc1: Location, loc2: Location): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(loc2.lat - loc1.lat);
    const dLon = this.toRad(loc2.lon - loc1.lon);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(loc1.lat)) * Math.cos(this.toRad(loc2.lat)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degree: number): number {
    return degree * (Math.PI / 180);
  }

  /**
   * Clear route cache
   */
  clearCache(): void {
    this.routeCache.clear();
  }

  /**
   * Calculate route with waypoints using AWS Location Service
   */
  async calculateRouteWithWaypoints(
    origin: Location,
    destination: Location,
    waypoints: Location[]
  ): Promise<any> {
    try {
      // Build waypoint positions for AWS Location Service
      const waypointPositions = waypoints.map(wp => [wp.lon, wp.lat]);
      
      const input: CalculateRouteCommandInput = {
        CalculatorName: this.calculatorName,
        DeparturePosition: [origin.lon, origin.lat],
        DestinationPosition: [destination.lon, destination.lat],
        WaypointPositions: waypointPositions,
        IncludeLegGeometry: false,
        TravelMode: 'Car',
        DepartureTime: new Date()
      };

      const command = new CalculateRouteCommand(input);
      const response: CalculateRouteCommandOutput = await this.locationClient.send(command);

      if (!response.Summary) {
        throw new Error('Invalid response from AWS Location Service');
      }

      const totalDistance = response.Summary.Distance || 0;
      const totalTime = (response.Summary.DurationSeconds || 0) / 3600; // Convert to hours

      // Extract leg information
      const legs = response.Legs?.map((leg, index) => ({
        from: index === 0 ? origin.name : waypoints[index - 1].name,
        to: index === waypoints.length ? destination.name : waypoints[index].name,
        distanceKm: leg.Distance || 0,
        timeHours: (leg.DurationSeconds || 0) / 3600
      })) || [];

      return {
        distanceKm: totalDistance,
        timeHours: totalTime,
        totalDistanceKm: totalDistance,
        totalTimeHours: totalTime,
        legs
      };
    } catch (error) {
      console.error('Error calculating route with waypoints:', error);
      throw error;
    }
  }

  /**
   * Calculate all routes in batch
   */
  async calculateAllRoutes(
    input: Location[] | Array<{ origin: Location; destination: Location }>
  ): Promise<RouteResult[]> {
    let pairs: Array<{ origin: Location; destination: Location }>;
    
    // Handle both input formats
    if (input.length > 0 && 'origin' in input[0]) {
      // Already in pairs format
      pairs = input as Array<{ origin: Location; destination: Location }>;
    } else {
      // Convert cities array to all possible pairs
      const cities = input as Location[];
      pairs = [];
      for (let i = 0; i < cities.length; i++) {
        for (let j = i + 1; j < cities.length; j++) {
          pairs.push({ origin: cities[i], destination: cities[j] });
        }
      }
    }
    
    const results: RouteResult[] = [];
    
    // Process requests with proper throttling (5 requests per second)
    for (let i = 0; i < pairs.length; i++) {
      const pair = pairs[i];
      const result = await this.throttleRequest(() => 
        this.calculateTruckRoute(pair.origin, pair.destination)
      );
      results.push(result);
    }
    
    return results;
  }

  /**
   * Throttle requests to respect rate limits (5 requests per second)
   */
  private async throttleRequest<T>(fn: () => Promise<T>): Promise<T> {
    // Ensure minimum delay between requests (200ms = 5 req/sec)
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.requestDelay) {
      await new Promise(resolve => setTimeout(resolve, this.requestDelay - timeSinceLastRequest));
    }
    
    this.lastRequestTime = Date.now();
    return await fn();
  }
}