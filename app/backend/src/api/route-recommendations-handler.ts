/**
 * Route Recommendations API Handler
 * Handles POST /route/recommendations requests
 */

import { Request, Response, NextFunction } from 'express';
import { RouteRecommendationService } from '../services/RouteRecommendationService';
import { 
  TransportPlan, 
  RecommendationPreferences,
  RouteRecommendations,
  ErrorCode 
} from '../lib/shared-types';

interface RouteRecommendationRequest {
  route: TransportPlan;
  preferences?: RecommendationPreferences;
}

/**
 * Validate route recommendation request
 */
function validateRouteRecommendationRequest(body: any): { isValid: boolean; error?: string; field?: string } {
  if (!body || typeof body !== 'object') {
    return { isValid: false, error: 'Request body is required', field: 'body' };
  }

  if (!body.route) {
    return { isValid: false, error: 'Route is required', field: 'route' };
  }

  const { route } = body;

  // Validate route structure
  if (!route.plan || !['truck', 'truck+ship'].includes(route.plan)) {
    return { isValid: false, error: 'Invalid route plan type', field: 'route.plan' };
  }

  if (!route.legs || !Array.isArray(route.legs) || route.legs.length === 0) {
    return { isValid: false, error: 'Route legs are required', field: 'route.legs' };
  }

  // Validate each leg
  for (let i = 0; i < route.legs.length; i++) {
    const leg = route.legs[i];
    if (!leg.from || !leg.to || typeof leg.from !== 'string' || typeof leg.to !== 'string') {
      return { isValid: false, error: `Invalid leg ${i}: from and to are required`, field: `route.legs[${i}]` };
    }
    if (typeof leg.distanceKm !== 'number' || leg.distanceKm <= 0) {
      return { isValid: false, error: `Invalid leg ${i}: distanceKm must be positive`, field: `route.legs[${i}].distanceKm` };
    }
    if (typeof leg.timeHours !== 'number' || leg.timeHours <= 0) {
      return { isValid: false, error: `Invalid leg ${i}: timeHours must be positive`, field: `route.legs[${i}].timeHours` };
    }
  }

  // Validate preferences if provided
  if (body.preferences) {
    const { preferences } = body;
    
    if (preferences.foodTypes && (!Array.isArray(preferences.foodTypes) || 
        !preferences.foodTypes.every((type: any) => typeof type === 'string'))) {
      return { isValid: false, error: 'foodTypes must be an array of strings', field: 'preferences.foodTypes' };
    }

    if (preferences.priceRange && !['low', 'medium', 'high'].includes(preferences.priceRange)) {
      return { isValid: false, error: 'priceRange must be low, medium, or high', field: 'preferences.priceRange' };
    }

    if (preferences.amenities && (!Array.isArray(preferences.amenities) || 
        !preferences.amenities.every((amenity: any) => typeof amenity === 'string'))) {
      return { isValid: false, error: 'amenities must be an array of strings', field: 'preferences.amenities' };
    }

    if (preferences.maxDistanceFromRoute && (typeof preferences.maxDistanceFromRoute !== 'number' || preferences.maxDistanceFromRoute <= 0)) {
      return { isValid: false, error: 'maxDistanceFromRoute must be a positive number', field: 'preferences.maxDistanceFromRoute' };
    }

    if (preferences.maxStopTime && (typeof preferences.maxStopTime !== 'number' || preferences.maxStopTime <= 0)) {
      return { isValid: false, error: 'maxStopTime must be a positive number', field: 'preferences.maxStopTime' };
    }

    if (preferences.includeAttractions && typeof preferences.includeAttractions !== 'boolean') {
      return { isValid: false, error: 'includeAttractions must be a boolean', field: 'preferences.includeAttractions' };
    }
  }

  return { isValid: true };
}

/**
 * Route recommendations handler
 */
export async function routeRecommendationsHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const startTime = Date.now();
  
  try {
    // Validate request
    const validation = validateRouteRecommendationRequest(req.body);
    if (!validation.isValid) {
      res.status(400).json({
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: validation.error,
          field: validation.field
        },
        requestId: req.headers['x-request-id'] || 'unknown',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const { route, preferences = {} } = req.body as RouteRecommendationRequest;

    // Initialize service
    const recommendationService = new RouteRecommendationService({
      maxDistanceFromRoute: preferences.maxDistanceFromRoute || 5.0,
      maxRecommendationsPerType: 10,
      dataVersion: '1.0.0'
    });

    // Generate recommendations
    const recommendations = await recommendationService.getRouteRecommendations(route, preferences);

    // Add processing time to metadata
    const processingTime = Date.now() - startTime;
    recommendations.metadata = {
      ...recommendations.metadata,
      processingTimeMs: processingTime,
      requestId: req.headers['x-request-id'] || 'unknown'
    };

    // Send response
    res.status(200).json(recommendations);

  } catch (error) {
    console.error('Route recommendations error:', error);
    
    res.status(500).json({
      error: {
        code: ErrorCode.SERVICE_ERROR,
        message: 'Failed to generate route recommendations',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      requestId: req.headers['x-request-id'] || 'unknown',
      timestamp: new Date().toISOString()
    });
  }
}
