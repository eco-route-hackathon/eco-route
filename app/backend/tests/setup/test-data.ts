/**
 * Standard Test Data
 * All test data must come from this file to ensure consistency.
 * Based on OpenAPI examples and quickstart.md scenarios.
 */

import { 
  Location, 
  TransportMode, 
  TransportLeg,
  TransportPlan,
  ComparisonRequest,
  ComparisonResult,
  PlanType,
  ModeType,
  LocationType
} from '../../src/lib/shared-types';

/**
 * Fixed test scenarios from quickstart.md
 */
export const TEST_SCENARIOS = {
  // Scenario 1: Time Priority (from quickstart.md)
  timePriority: {
    request: {
      origin: 'Tokyo',
      destination: 'Osaka',
      weightKg: 500,
      weights: {
        time: 0.7,
        cost: 0.2,
        co2: 0.1
      }
    },
    expectedRecommendation: 'truck' as PlanType,
    reason: 'Truck is faster for time-priority scenarios'
  },

  // Scenario 2: CO2 Priority (from quickstart.md)
  co2Priority: {
    request: {
      origin: 'Tokyo',
      destination: 'Osaka',
      weightKg: 500,
      weights: {
        time: 0.1,
        cost: 0.2,
        co2: 0.7
      }
    },
    expectedRecommendation: 'truck+ship' as PlanType,
    reason: 'Ship has lower CO2 emissions'
  },

  // Scenario 3: Balanced Weights (from quickstart.md)
  balanced: {
    request: {
      origin: 'Tokyo',
      destination: 'Osaka',
      weightKg: 1000,
      weights: {
        time: 0.33,
        cost: 0.33,
        co2: 0.34
      }
    },
    expectedRecommendation: null, // Depends on calculation
    reason: 'Balanced weights result depends on normalized scores'
  },

  // Additional test scenarios
  costPriority: {
    request: {
      origin: 'Tokyo',
      destination: 'Osaka',
      weightKg: 2000,
      weights: {
        time: 0.1,
        cost: 0.8,
        co2: 0.1
      }
    },
    expectedRecommendation: 'truck+ship' as PlanType,
    reason: 'Ship is more cost-effective'
  }
};

/**
 * Fixed CSV data content
 * Must match mock-factory.ts responses
 */
export const CSV_DATA = {
  modes: {
    headers: ['mode', 'cost_per_km', 'co2_kg_per_ton_km', 'avg_speed_kmph'],
    rows: [
      ['truck', '50', '0.1', '60'],
      ['ship', '20', '0.02', '20']
    ],
    raw: 'mode,cost_per_km,co2_kg_per_ton_km,avg_speed_kmph\ntruck,50,0.1,60\nship,20,0.02,20'
  },
  
  locations: {
    headers: ['id', 'name', 'lat', 'lon', 'type'],
    rows: [
      ['1', 'Tokyo', '35.6762', '139.6503', 'city'],
      ['2', 'Osaka', '34.6937', '135.5023', 'city'],
      ['3', 'TokyoPort', '35.6551', '139.7595', 'port'],
      ['4', 'OsakaPort', '34.6500', '135.4300', 'port'],
      ['5', 'Nagoya', '35.1815', '136.9066', 'city'],
      ['6', 'NagoyaPort', '35.0833', '136.8833', 'port']
    ],
    raw: 'id,name,lat,lon,type\n1,Tokyo,35.6762,139.6503,city\n2,Osaka,34.6937,135.5023,city\n3,TokyoPort,35.6551,139.7595,port\n4,OsakaPort,34.6500,135.4300,port\n5,Nagoya,35.1815,136.9066,city\n6,NagoyaPort,35.0833,136.8833,port'
  },
  
  links: {
    headers: ['from', 'to', 'mode', 'distance_km', 'time_hours'],
    rows: [
      ['TokyoPort', 'OsakaPort', 'ship', '410', '20.5'],
      ['TokyoPort', 'NagoyaPort', 'ship', '280', '14.0'],
      ['NagoyaPort', 'OsakaPort', 'ship', '130', '6.5']
    ],
    raw: 'from,to,mode,distance_km,time_hours\nTokyoPort,OsakaPort,ship,410,20.5\nTokyoPort,NagoyaPort,ship,280,14.0\nNagoyaPort,OsakaPort,ship,130,6.5'
  }
};

/**
 * Parsed data objects for direct use in tests
 */
export const PARSED_DATA = {
  modes: [
    {
      mode: 'truck' as ModeType,
      costPerKm: 50,
      co2KgPerTonKm: 0.1,
      avgSpeedKmph: 60
    },
    {
      mode: 'ship' as ModeType,
      costPerKm: 20,
      co2KgPerTonKm: 0.02,
      avgSpeedKmph: 20
    }
  ] as TransportMode[],

  locations: [
    { id: '1', name: 'Tokyo', lat: 35.6762, lon: 139.6503, type: 'city' as LocationType },
    { id: '2', name: 'Osaka', lat: 34.6937, lon: 135.5023, type: 'city' as LocationType },
    { id: '3', name: 'TokyoPort', lat: 35.6551, lon: 139.7595, type: 'port' as LocationType },
    { id: '4', name: 'OsakaPort', lat: 34.6500, lon: 135.4300, type: 'port' as LocationType },
    { id: '5', name: 'Nagoya', lat: 35.1815, lon: 136.9066, type: 'city' as LocationType },
    { id: '6', name: 'NagoyaPort', lat: 35.0833, lon: 136.8833, type: 'port' as LocationType }
  ] as Location[],

  links: [
    {
      from: 'TokyoPort',
      to: 'OsakaPort',
      mode: 'ship' as ModeType,
      distanceKm: 410,
      timeHours: 20.5
    },
    {
      from: 'TokyoPort',
      to: 'NagoyaPort',
      mode: 'ship' as ModeType,
      distanceKm: 280,
      timeHours: 14.0
    },
    {
      from: 'NagoyaPort',
      to: 'OsakaPort',
      mode: 'ship' as ModeType,
      distanceKm: 130,
      timeHours: 6.5
    }
  ] as TransportLeg[]
};

/**
 * Expected calculation results
 * Pre-calculated for test validation
 */
export const EXPECTED_RESULTS = {
  tokyoToOsaka: {
    truck: {
      distanceKm: 520,
      timeH: 7.2,
      costJpy: 26000, // 520 * 50
      co2Kg: 26 // 520 * 0.1 * 0.5t
    },
    truckShip: {
      legs: [
        { from: 'Tokyo', to: 'TokyoPort', distanceKm: 15, timeHours: 0.25 }, // 15km at 60km/h
        { from: 'TokyoPort', to: 'OsakaPort', distanceKm: 410, timeHours: 20.5 },
        { from: 'OsakaPort', to: 'Osaka', distanceKm: 12, timeHours: 0.2 } // 12km at 60km/h
      ],
      totalDistanceKm: 437,
      totalTimeH: 20.95,
      totalCostJpy: 9550, // (15*50) + (410*20) + (12*50) = 750 + 8200 + 600
      totalCo2Kg: 5.85 // (15*0.1*0.5) + (410*0.02*0.5) + (12*0.1*0.5)
    }
  }
};

/**
 * Error test cases
 */
export const ERROR_CASES = {
  validation: {
    negativeWeight: {
      request: { weightKg: -100 },
      expectedError: 'VALIDATION_ERROR',
      expectedMessage: 'Cargo weight must be positive'
    },
    missingOrigin: {
      request: { origin: '' },
      expectedError: 'VALIDATION_ERROR',
      expectedMessage: 'Origin is required'
    },
    sameOriginDestination: {
      request: { origin: 'Tokyo', destination: 'Tokyo' },
      expectedError: 'VALIDATION_ERROR',
      expectedMessage: 'Origin and destination must be different'
    }
  },
  routeNotFound: {
    unknownLocation: {
      request: { origin: 'InvalidCity' },
      expectedError: 'ROUTE_NOT_FOUND',
      expectedMessage: "Location 'InvalidCity' not found"
    }
  },
  dataError: {
    csvParseError: {
      expectedError: 'DATA_ERROR',
      expectedMessage: 'Failed to parse CSV data'
    }
  },
  serviceError: {
    awsError: {
      expectedError: 'SERVICE_ERROR',
      expectedMessage: 'Failed to calculate route'
    }
  }
};

/**
 * Response time benchmarks
 */
export const PERFORMANCE_BENCHMARKS = {
  maxResponseTime: 2000, // 2 seconds
  avgResponseTime: 500, // 500ms target
  p95ResponseTime: 1500, // 95th percentile
  p99ResponseTime: 1900 // 99th percentile
};