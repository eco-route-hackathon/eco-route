/**
 * Mock Factory for Consistent Test Mocking
 * All mocks must be created through this factory to ensure consistency.
 * DO NOT create mocks directly in test files.
 */

import { vi } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { LocationClient, CalculateRouteCommand } from '@aws-sdk/client-location';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { TEST_CONFIG } from './test-config';
import { ComparisonRequest, WeightFactors } from '../../src/lib/shared-types';
import { Readable } from 'stream';
import { createApp } from '../../src/app';

export class MockFactory {
  /**
   * Create AWS Location Service mock
   * Always returns the same distance/time for consistency
   */
  static createLocationMock() {
    const locationMock = mockClient(LocationClient);
    
    // Default response for Tokyo to Osaka
    locationMock.on(CalculateRouteCommand).resolves({
      Summary: {
        RouteBBox: [135.5023, 34.6937, 139.6503, 35.6762], // Bounding box
        DataSource: 'Here',
        Distance: 520, // 520 km
        DurationSeconds: 25920, // 7.2 hours
        DistanceUnit: 'Kilometers'
      },
      Legs: [{
        Distance: 520,
        DurationSeconds: 25920,
        StartPosition: [139.6503, 35.6762], // Tokyo
        EndPosition: [135.5023, 34.6937], // Osaka
        Steps: [] // Required property, empty for mock
      }]
    });

    return locationMock;
  }

  /**
   * Create S3 mock for CSV data
   * Returns consistent CSV data for all tests
   */
  static createS3Mock() {
    const s3Mock = mockClient(S3Client);
    
    // Mock responses for each CSV file
    s3Mock.on(GetObjectCommand, {
      Bucket: TEST_CONFIG.aws.resources.s3BucketName,
      Key: `${TEST_CONFIG.aws.resources.s3DataPrefix}modes.csv`
    }).resolves({
      Body: Readable.from(
        'mode,cost_per_km,co2_kg_per_ton_km,avg_speed_kmph\n' +
        'truck,50,0.1,60\n' +
        'ship,20,0.02,20'
      ) as any
    });

    s3Mock.on(GetObjectCommand, {
      Bucket: TEST_CONFIG.aws.resources.s3BucketName,
      Key: `${TEST_CONFIG.aws.resources.s3DataPrefix}locations.csv`
    }).resolves({
      Body: Readable.from(
        'id,name,lat,lon,type\n' +
        '1,Tokyo,35.6762,139.6503,city\n' +
        '2,Osaka,34.6937,135.5023,city\n' +
        '3,TokyoPort,35.6551,139.7595,port\n' +
        '4,OsakaPort,34.6500,135.4300,port'
      ) as any
    });

    s3Mock.on(GetObjectCommand, {
      Bucket: TEST_CONFIG.aws.resources.s3BucketName,
      Key: `${TEST_CONFIG.aws.resources.s3DataPrefix}links.csv`
    }).resolves({
      Body: Readable.from(
        'from_port_id,to_port_id,distance_km,time_hours,operator,frequency_per_week\n' +
        '3,4,410,20.5,ShipCo,7'
      ) as any
    });

    return s3Mock;
  }

  /**
   * Create a valid comparison request
   * Use this as base for all test requests
   */
  static createValidRequest(overrides: Partial<ComparisonRequest> = {}): ComparisonRequest {
    return {
      origin: 'Tokyo',
      destination: 'Osaka',
      weightKg: 500,
      weights: {
        time: 0.33,
        cost: 0.33,
        co2: 0.34
      },
      ...overrides
    };
  }

  /**
   * Create invalid requests for error testing
   */
  static createInvalidRequests() {
    return {
      negativeWeight: {
        ...this.createValidRequest(),
        weightKg: -100
      },
      zeroWeight: {
        ...this.createValidRequest(),
        weightKg: 0
      },
      missingOrigin: {
        ...this.createValidRequest(),
        origin: ''
      },
      sameOriginDestination: {
        ...this.createValidRequest(),
        destination: 'Tokyo'
      },
      invalidWeights: {
        ...this.createValidRequest(),
        weights: {
          time: -0.5,
          cost: 0.3,
          co2: 0.2
        }
      },
      sumNotOne: {
        ...this.createValidRequest(),
        weights: {
          time: 0.5,
          cost: 0.5,
          co2: 0.5
        } // Sum = 1.5, should be normalized
      }
    };
  }

  /**
   * Create weight scenarios for testing
   */
  static createWeightScenarios() {
    return {
      timePriority: {
        time: 0.7,
        cost: 0.2,
        co2: 0.1
      } as WeightFactors,
      costPriority: {
        time: 0.1,
        cost: 0.7,
        co2: 0.2
      } as WeightFactors,
      co2Priority: {
        time: 0.1,
        cost: 0.2,
        co2: 0.7
      } as WeightFactors,
      balanced: {
        time: 0.33,
        cost: 0.33,
        co2: 0.34
      } as WeightFactors
    };
  }

  /**
   * Create Express app mock for supertest
   */
  static createAppMock() {
    // Use the actual Express app
    return createApp();
  }

  /**
   * Reset all mocks
   * Call this in beforeEach() to ensure test isolation
   */
  static resetAllMocks() {
    vi.clearAllMocks();
    vi.resetModules();
  }

  /**
   * Create expected response structure
   * Use this to validate API responses
   */
  static createExpectedResponse(recommendation: 'truck' | 'truck+ship' = 'truck') {
    return {
      candidates: [
        {
          plan: 'truck',
          timeH: 7.2,
          costJpy: 26000, // 520km * 50 JPY/km
          co2Kg: 26 // 520km * 0.1 * 0.5t
        },
        {
          plan: 'truck+ship',
          timeH: 21.4, // 0.5 + 20.5 + 0.4
          costJpy: 10350, // (15km * 50) + (410km * 20) + (12km * 50)
          co2Kg: 5.26 // Calculated based on distances and modes
        }
      ],
      recommendation,
      rationale: {
        truck: {
          distanceKm: 520
        },
        'truck+ship': {
          legs: [
            { from: 'Tokyo', to: 'TokyoPort', mode: 'truck', distanceKm: 15, timeHours: 0.5 },
            { from: 'TokyoPort', to: 'OsakaPort', mode: 'ship', distanceKm: 410, timeHours: 20.5 },
            { from: 'OsakaPort', to: 'Osaka', mode: 'truck', distanceKm: 12, timeHours: 0.4 }
          ]
        }
      }
    };
  }

  /**
   * Create failing AWS Location mock for error testing
   * Simulates AWS Location Service failures
   */
  static createFailingLocationMock() {
    const locationMock = mockClient(LocationClient);
    
    locationMock.on(CalculateRouteCommand).rejects(new Error('AWS Location Service error: Unable to calculate route'));
    
    return locationMock;
  }

  /**
   * Create failing S3 mock for error testing
   * Simulates S3 service failures
   */
  static createFailingS3Mock() {
    const s3Mock = mockClient(S3Client);
    
    s3Mock.on(GetObjectCommand).rejects(new Error('S3 Service error: Access denied or bucket not found'));
    
    return s3Mock;
  }

  /**
   * Create corrupted data mock for error testing
   * Returns invalid CSV data to simulate data corruption
   */
  static createCorruptedDataMock() {
    const s3Mock = mockClient(S3Client);
    
    // Return corrupted/invalid CSV data
    const corruptedData = 'CORRUPTED_DATA_!@#$%^&*()_NOT_VALID_CSV';
    
    s3Mock.on(GetObjectCommand).resolves({
      Body: {
        transformToString: async () => corruptedData
      } as any
    });
    
    return s3Mock;
  }
}

// Export type for TypeScript support
export type LocationMock = ReturnType<typeof MockFactory.createLocationMock>;
export type S3Mock = ReturnType<typeof MockFactory.createS3Mock>;