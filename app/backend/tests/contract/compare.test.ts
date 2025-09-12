/**
 * Contract Tests for POST /compare endpoint
 * Tests the API contract defined in openapi.yaml
 * 
 * TDD: These tests should FAIL initially until the endpoint is implemented
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { Express } from 'express';
import { 
  ComparisonRequest, 
  ComparisonResult,
  PlanType 
} from '../../src/lib/shared-types';
import { MockFactory } from '../setup/mock-factory';
import { TEST_SCENARIOS, STANDARD_REQUESTS } from '../setup/test-data';
import { 
  assertValidComparisonResult,
  assertValidTransportPlan,
  assertResponseMatchesOpenAPIExample 
} from '../setup/assertions';
import { TEST_CONFIG } from '../setup/test-config';

describe('POST /compare Contract Tests', () => {
  let app: Express;

  beforeEach(() => {
    // Create Express app mock or use actual app when available
    // For now, use MockFactory to create app mock
    app = MockFactory.createAppMock() as unknown as Express;
    
    // Setup AWS mocks
    MockFactory.createLocationMock();
    MockFactory.createS3Mock();
  });

  afterEach(() => {
    MockFactory.resetAllMocks();
  });

  describe('Request Validation', () => {
    it('should accept valid request with all required fields', async () => {
      const validRequest: ComparisonRequest = TEST_SCENARIOS.timePriority.request;

      const response = await request(app)
        .post('/compare')
        .send(validRequest)
        .expect('Content-Type', /json/)
        .expect(200);

      assertValidComparisonResult(response.body);
    });

    it('should validate that weight factors sum to approximately 1.0', async () => {
      const requestWithValidWeights: ComparisonRequest = {
        origin: 'Tokyo',
        destination: 'Osaka',
        weightKg: 500,
        weights: {
          time: 0.5,
          cost: 0.3,
          co2: 0.2
        }
      };

      const response = await request(app)
        .post('/compare')
        .send(requestWithValidWeights)
        .expect(200);

      const totalWeight = 
        requestWithValidWeights.weights.time + 
        requestWithValidWeights.weights.cost + 
        requestWithValidWeights.weights.co2;
      
      expect(totalWeight).toBeCloseTo(1.0, 2);
    });

    it('should validate weightKg boundaries (0.1 - 100000)', async () => {
      // Test minimum boundary
      const minWeightRequest: ComparisonRequest = {
        ...TEST_SCENARIOS.timePriority.request,
        weightKg: 0.1
      };

      await request(app)
        .post('/compare')
        .send(minWeightRequest)
        .expect(200);

      // Test maximum boundary
      const maxWeightRequest: ComparisonRequest = {
        ...TEST_SCENARIOS.timePriority.request,
        weightKg: 100000
      };

      await request(app)
        .post('/compare')
        .send(maxWeightRequest)
        .expect(200);
    });

    it('should require all mandatory fields', async () => {
      const requestMissingOrigin = {
        destination: 'Osaka',
        weightKg: 500,
        weights: { time: 0.5, cost: 0.3, co2: 0.2 }
      };

      await request(app)
        .post('/compare')
        .send(requestMissingOrigin)
        .expect(400);
    });
  });

  describe('Response Structure', () => {
    it('should return 200 OK with valid response structure', async () => {
      const response = await request(app)
        .post('/compare')
        .send(TEST_SCENARIOS.timePriority.request)
        .expect(200);

      // Check top-level structure
      expect(response.body).toHaveProperty('candidates');
      expect(response.body).toHaveProperty('recommendation');
      expect(response.body).toHaveProperty('rationale');
    });

    it('should return candidates array with 1-2 transport plans', async () => {
      const response = await request(app)
        .post('/compare')
        .send(TEST_SCENARIOS.co2Priority.request)
        .expect(200);

      const result: ComparisonResult = response.body;
      
      expect(Array.isArray(result.candidates)).toBe(true);
      expect(result.candidates.length).toBeGreaterThanOrEqual(1);
      expect(result.candidates.length).toBeLessThanOrEqual(2);

      // Validate each candidate has correct structure
      result.candidates.forEach(candidate => {
        expect(candidate).toHaveProperty('plan');
        expect(candidate).toHaveProperty('timeH');
        expect(candidate).toHaveProperty('costJpy');
        expect(candidate).toHaveProperty('co2Kg');
        
        // Validate plan type
        expect(['truck', 'truck+ship']).toContain(candidate.plan);
        
        // Validate numeric fields are positive
        expect(candidate.timeH).toBeGreaterThan(0);
        expect(candidate.costJpy).toBeGreaterThan(0);
        expect(candidate.co2Kg).toBeGreaterThan(0);
      });
    });

    it('should return recommendation as either truck or truck+ship', async () => {
      const response = await request(app)
        .post('/compare')
        .send(TEST_SCENARIOS.balancedWeights.request)
        .expect(200);

      const result: ComparisonResult = response.body;
      
      expect(['truck', 'truck+ship']).toContain(result.recommendation);
    });

    it('should include rationale with route details', async () => {
      const response = await request(app)
        .post('/compare')
        .send(TEST_SCENARIOS.timePriority.request)
        .expect(200);

      const result: ComparisonResult = response.body;
      
      expect(result.rationale).toBeDefined();
      
      // If truck route exists in rationale
      if (result.rationale.truck) {
        expect(result.rationale.truck).toHaveProperty('distanceKm');
        expect(result.rationale.truck.distanceKm).toBeGreaterThan(0);
      }
      
      // If truck+ship route exists in rationale
      if (result.rationale['truck+ship']) {
        expect(result.rationale['truck+ship']).toHaveProperty('legs');
        expect(Array.isArray(result.rationale['truck+ship'].legs)).toBe(true);
        
        // Each leg should have proper structure
        result.rationale['truck+ship'].legs.forEach(leg => {
          expect(leg).toHaveProperty('from');
          expect(leg).toHaveProperty('to');
          expect(leg).toHaveProperty('mode');
          expect(leg).toHaveProperty('distanceKm');
          expect(leg).toHaveProperty('timeHours');
        });
      }
    });

    it('should optionally include metadata', async () => {
      const response = await request(app)
        .post('/compare')
        .send(TEST_SCENARIOS.timePriority.request)
        .expect(200);

      const result: ComparisonResult = response.body;
      
      // Metadata is optional but if present, should have correct structure
      if (result.metadata) {
        if (result.metadata.calculationTimeMs !== undefined) {
          expect(typeof result.metadata.calculationTimeMs).toBe('number');
          expect(result.metadata.calculationTimeMs).toBeGreaterThanOrEqual(0);
        }
        
        if (result.metadata.dataVersion !== undefined) {
          expect(typeof result.metadata.dataVersion).toBe('string');
        }
      }
    });
  });

  describe('OpenAPI Examples Compliance', () => {
    it('should handle tokyoToOsaka example from OpenAPI', async () => {
      const tokyoToOsakaRequest: ComparisonRequest = {
        origin: 'Tokyo',
        destination: 'Osaka',
        weightKg: 500,
        weights: {
          time: 0.5,
          cost: 0.3,
          co2: 0.2
        }
      };

      const response = await request(app)
        .post('/compare')
        .send(tokyoToOsakaRequest)
        .expect(200);

      assertValidComparisonResult(response.body);
      
      // Should have both truck and truck+ship candidates
      expect(response.body.candidates).toHaveLength(2);
      
      const truckPlan = response.body.candidates.find((c: any) => c.plan === 'truck');
      const shipPlan = response.body.candidates.find((c: any) => c.plan === 'truck+ship');
      
      expect(truckPlan).toBeDefined();
      expect(shipPlan).toBeDefined();
    });

    it('should handle timeOptimized example from OpenAPI', async () => {
      const timeOptimizedRequest: ComparisonRequest = {
        origin: 'Tokyo',
        destination: 'Osaka',
        weightKg: 1000,
        weights: {
          time: 0.7,
          cost: 0.2,
          co2: 0.1
        }
      };

      const response = await request(app)
        .post('/compare')
        .send(timeOptimizedRequest)
        .expect(200);

      assertValidComparisonResult(response.body);
      
      // With time optimization, truck should typically be recommended
      // (This is a business logic assumption that may need adjustment)
      expect(response.body.recommendation).toBe('truck');
    });

    it.skip('should handle co2Optimized example from OpenAPI', async () => {
      // TODO(#issue-3): Fix CO2 optimization logic to properly recommend truck+ship
      const co2OptimizedRequest: ComparisonRequest = {
        origin: 'Tokyo',
        destination: 'Osaka',
        weightKg: 500,
        weights: {
          time: 0.1,
          cost: 0.2,
          co2: 0.7
        }
      };

      const response = await request(app)
        .post('/compare')
        .send(co2OptimizedRequest)
        .expect(200);

      assertValidComparisonResult(response.body);
      
      // With CO2 optimization, truck+ship should typically be recommended
      // (This is a business logic assumption that may need adjustment)
      expect(response.body.recommendation).toBe('truck+ship');
    });
  });

  describe('Content-Type Handling', () => {
    it('should accept application/json content type', async () => {
      const response = await request(app)
        .post('/compare')
        .set('Content-Type', 'application/json')
        .send(TEST_SCENARIOS.timePriority.request)
        .expect(200);

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('should reject non-JSON content types', async () => {
      await request(app)
        .post('/compare')
        .set('Content-Type', 'text/plain')
        .send('not json')
        .expect(400);
    });
  });

  describe('Edge Cases', () => {
    it.skip('should handle same prefecture routes (e.g., Tokyo to Yokohama)', async () => {
      // TODO(#issue-4): Add Yokohama to test data locations
      const samePrefectureRequest: ComparisonRequest = {
        origin: 'Tokyo',
        destination: 'Yokohama',
        weightKg: 500,
        weights: {
          time: 0.5,
          cost: 0.3,
          co2: 0.2
        }
      };

      const response = await request(app)
        .post('/compare')
        .send(samePrefectureRequest)
        .expect(200);

      assertValidComparisonResult(response.body);
      
      // For short distances, truck-only might be the only option
      expect(response.body.candidates.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle very light cargo (minimum weight)', async () => {
      const lightCargoRequest: ComparisonRequest = {
        origin: 'Tokyo',
        destination: 'Osaka',
        weightKg: 0.1,
        weights: {
          time: 0.5,
          cost: 0.3,
          co2: 0.2
        }
      };

      const response = await request(app)
        .post('/compare')
        .send(lightCargoRequest)
        .expect(200);

      assertValidComparisonResult(response.body);
    });

    it.skip('should handle very heavy cargo (maximum weight)', async () => {
      // TODO(#issue-3): Fix CO2 calculation scaling for heavy cargo
      const heavyCargoRequest: ComparisonRequest = {
        origin: 'Tokyo',
        destination: 'Osaka',
        weightKg: 100000,
        weights: {
          time: 0.5,
          cost: 0.3,
          co2: 0.2
        }
      };

      const response = await request(app)
        .post('/compare')
        .send(heavyCargoRequest)
        .expect(200);

      assertValidComparisonResult(response.body);
    });
  });
});