/**
 * Shared TypeScript type definitions for Eco-Route MVP
 * These types are used by both frontend and backend
 */

// ============= Enums =============

export enum LocationType {
  CITY = 'city',
  PORT = 'port',
}

export enum ModeType {
  TRUCK = 'truck',
  SHIP = 'ship',
}

export enum PlanType {
  TRUCK = 'truck',
  TRUCK_SHIP = 'truck+ship',
}

export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  ROUTE_NOT_FOUND = 'ROUTE_NOT_FOUND',
  DATA_ERROR = 'DATA_ERROR',
  SERVICE_ERROR = 'SERVICE_ERROR',
}

// ============= Core Entities =============

/**
 * Represents a geographic point (city or port)
 */
export interface Location {
  id: string;           // Unique identifier
  name: string;         // Display name (e.g., "Tokyo", "東京港")
  lat: number;          // Latitude (-90 to 90)
  lon: number;          // Longitude (-180 to 180)
  type: LocationType;   // Classification
}

/**
 * Defines characteristics of a transportation method
 */
export interface TransportMode {
  mode: ModeType;               // Mode identifier
  costPerKm: number;            // Cost in JPY per kilometer
  co2KgPerTonKm: number;        // CO2 emissions per ton-kilometer
  avgSpeedKmph: number;         // Average speed in km/h
}

/**
 * Represents a single segment of a journey
 */
export interface TransportLeg {
  from: string;         // Origin location name
  to: string;           // Destination location name
  mode: ModeType;       // Transportation mode
  distanceKm: number;   // Distance in kilometers
  timeHours: number;    // Duration in hours
}

/**
 * Represents a complete transportation option
 */
export interface TransportPlan {
  plan: PlanType;       // Plan identifier
  timeH: number;        // Total time in hours
  costJpy: number;      // Total cost in Japanese Yen
  co2Kg: number;        // Total CO2 emissions in kg
  legs?: TransportLeg[]; // Route segments (for multi-modal)
}

/**
 * User-defined importance weights for optimization
 */
export interface WeightFactors {
  time: number;   // Weight for time (0.0 - 1.0)
  cost: number;   // Weight for cost (0.0 - 1.0)
  co2: number;    // Weight for CO2 (0.0 - 1.0)
}

/**
 * Input parameters for route comparison
 */
export interface ComparisonRequest {
  origin: string;        // Starting location name
  destination: string;   // Ending location name
  weightKg: number;      // Cargo weight in kilograms
  weights: WeightFactors; // Optimization weights
}

/**
 * Detailed explanation of route calculations
 */
export interface RouteRationale {
  truck?: {
    distanceKm: number;    // Direct truck distance
  };
  'truck+ship'?: {
    legs: TransportLeg[];  // Detailed route segments
  };
}

/**
 * Complete response from comparison API
 */
export interface ComparisonResult {
  candidates: TransportPlan[];    // All evaluated plans
  recommendation: PlanType;       // Recommended plan
  rationale: RouteRationale;       // Calculation details
  metadata?: {
    calculationTimeMs: number;    // Processing time
    dataVersion: string;          // CSV data version
  };
}

/**
 * Error response structure
 */
export interface ErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    field?: string;      // For validation errors
    details?: unknown;   // Additional context
  };
  requestId: string;     // Tracking identifier
  timestamp: string;     // ISO 8601 format
}

// ============= Validation Helpers =============

/**
 * Validates location coordinates
 */
export const isValidCoordinate = (lat: number, lon: number): boolean => {
  return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
};

/**
 * Validates weight factors sum to approximately 1.0
 */
export const normalizeWeights = (weights: WeightFactors): WeightFactors => {
  const sum = weights.time + weights.cost + weights.co2;
  if (sum === 0) {
    return { time: 0.33, cost: 0.33, co2: 0.34 };
  }
  return {
    time: weights.time / sum,
    cost: weights.cost / sum,
    co2: weights.co2 / sum,
  };
};

/**
 * Type guard for error response
 */
export const isErrorResponse = (response: unknown): response is ErrorResponse => {
  return (
    typeof response === 'object' &&
    response !== null &&
    'error' in response &&
    'requestId' in response &&
    'timestamp' in response
  );
};