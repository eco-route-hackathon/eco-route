/**
 * Compare Handler
 * Handles POST /compare endpoint
 */

import { Request, Response, NextFunction } from 'express';
import {
  ComparisonRequest,
  TransportPlan,
  PlanType,
  Location,
  ModeType,
  ErrorCode,
} from '../lib/shared-types';
import { validateComparisonRequest, parseComparisonRequest } from './validators';
import { CsvDataLoader } from '../services/CsvDataLoader';
import { RouteCalculator } from '../services/RouteCalculator';
import { ScoreOptimizer } from '../services/ScoreOptimizer';
import { ShipLink } from '../services/CsvDataLoader';

// Initialize services (in production, these would be dependency injected)
const csvLoader = new CsvDataLoader({
  bucketName: process.env.S3_BUCKET || 'eco-route-data',
  region: process.env.AWS_REGION || 'ap-northeast-1',
  localDataPath: process.env.LOCAL_DATA_PATH
});

const routeCalculator = new RouteCalculator({
  calculatorName: process.env.ROUTE_CALCULATOR_NAME || 'eco-route-calculator',
  region: process.env.AWS_REGION || 'ap-northeast-1',
});

const scoreOptimizer = new ScoreOptimizer({
  normalizationMethod: 'min-max',
});

/**
 * Compare handler for POST /compare endpoint
 */
export async function compareHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const startTime = Date.now();

  try {
    // 1. Validate request
    const validationError = validateComparisonRequest(req.body);
    if (validationError) {
      const error: any = new Error(validationError.message);
      error.code = ErrorCode.VALIDATION_ERROR;
      error.field = validationError.field;
      error.statusCode = 400;
      throw error;
    }

    // 2. Parse request
    const request: ComparisonRequest = parseComparisonRequest(req.body);

    // 3. Load data from CSV
    const [locations, modes, shipLinks] = await Promise.all([
      csvLoader.loadLocations(),
      csvLoader.loadTransportModes(),
      csvLoader.loadShipLinks(),
    ]);

    // 4. Find origin and destination locations
    const origin = findLocation(locations, request.origin);
    if (!origin) {
      const error: any = new Error(`Location not found: ${request.origin}`);
      error.code = ErrorCode.ROUTE_NOT_FOUND;
      error.details = { location: request.origin };
      error.statusCode = 404;
      throw error;
    }

    const destination = findLocation(locations, request.destination);
    if (!destination) {
      const error: any = new Error(`Location not found: ${request.destination}`);
      error.code = ErrorCode.ROUTE_NOT_FOUND;
      error.details = { location: request.destination };
      error.statusCode = 404;
      throw error;
    }

    // 5. Get transport mode parameters
    const truckMode = modes.find((m) => m.mode === ModeType.TRUCK);
    const shipMode = modes.find((m) => m.mode === ModeType.SHIP);

    if (!truckMode) {
      const error: any = new Error('Truck mode configuration not found');
      error.code = ErrorCode.DATA_ERROR;
      error.statusCode = 500;
      throw error;
    }

    // 6. Calculate truck-only route
    const truckRoute = await routeCalculator.calculateTruckRoute(origin, destination);

    // Calculate truck plan metrics
    const truckPlan: TransportPlan = {
      plan: PlanType.TRUCK,
      timeH: truckRoute.timeHours,
      costJpy: truckRoute.distanceKm * truckMode.costPerKm,
      co2Kg: (truckRoute.distanceKm * truckMode.co2KgPerTonKm * request.weightKg) / 1000,
    };

    const plans: TransportPlan[] = [truckPlan];

    // 7. Try to calculate truck+ship route
    let shipPlan: TransportPlan | null = null;

    // Find nearest ports
    const originPort = routeCalculator.findNearestPort(origin, locations);
    const destinationPort = routeCalculator.findNearestPort(destination, locations);

    if (originPort && destinationPort && shipMode) {
      // Find ship link between ports
      const shipLink = findShipLink(shipLinks, originPort.id, destinationPort.id);

      if (shipLink) {
        // Calculate multi-modal route
        const shipLinkInfo = {
          from: originPort,
          to: destinationPort,
          distanceKm: shipLink.distanceKm,
          timeHours: shipLink.timeHours,
        };

        const legs = await routeCalculator.planMultiModalRoute(
          origin,
          destination,
          originPort,
          destinationPort,
          shipLinkInfo
        );

        // Calculate total metrics for truck+ship
        let totalTime = 0;
        let totalCost = 0;
        let totalCo2 = 0;

        for (const leg of legs) {
          totalTime += leg.timeHours;

          if (leg.mode === ModeType.TRUCK) {
            totalCost += leg.distanceKm * truckMode.costPerKm;
            totalCo2 += (leg.distanceKm * truckMode.co2KgPerTonKm * request.weightKg) / 1000;
          } else if (leg.mode === ModeType.SHIP) {
            totalCost += leg.distanceKm * shipMode.costPerKm;
            totalCo2 += (leg.distanceKm * shipMode.co2KgPerTonKm * request.weightKg) / 1000;
          }
        }

        shipPlan = {
          plan: PlanType.TRUCK_SHIP,
          timeH: totalTime,
          costJpy: totalCost,
          co2Kg: totalCo2,
          legs,
        };

        plans.push(shipPlan);
      }
    }

    // 8. Compare plans and get recommendation
    const comparisonResult = scoreOptimizer.generateComparisonResult(plans, request.weights, {
      truckDistance: truckRoute.distanceKm,
      calculationTimeMs: Date.now() - startTime,
    });

    // 9. Send response
    res.json(comparisonResult);
  } catch (error: any) {
    // Pass to error handler middleware
    next(error);
  }
}

/**
 * Find location by name (case-insensitive)
 */
function findLocation(locations: Location[], name: string): Location | undefined {
  const normalizedName = name.toLowerCase().trim();
  return locations.find(
    (loc) => loc.name.toLowerCase() === normalizedName || loc.id.toLowerCase() === normalizedName
  );
}

/**
 * Find ship link between ports
 */
function findShipLink(
  links: ShipLink[],
  fromPortId: string,
  toPortId: string
): ShipLink | undefined {
  // Normalize IDs for comparison (handle both numeric and string IDs)
  const normalizeId = (id: string) => id.toString().trim();
  const fromId = normalizeId(fromPortId);
  const toId = normalizeId(toPortId);

  return links.find((link) => {
    const linkFromId = normalizeId(link.fromPortId);
    const linkToId = normalizeId(link.toPortId);
    return (
      (linkFromId === fromId && linkToId === toId) || (linkFromId === toId && linkToId === fromId)
    );
  });
}
