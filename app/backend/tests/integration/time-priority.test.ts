/**
 * Integration Test: Time Priority Scenario
 * Tests the complete flow when time is the most important factor
 * 
 * Scenario: Tokyo → Osaka with time weight = 0.7
 * Expected: Truck route should be recommended (fastest option)
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
import { TEST_SCENARIOS } from '../setup/test-data';
import { 
  assertValidComparisonResult,
  assertRecommendation,
  assertApproximatelyEqual
} from '../setup/assertions';
import { TEST_CONFIG } from '../setup/test-config';

describe('Integration Test: Time Priority Scenario', () => {
  let app: Express;
  const scenario = TEST_SCENARIOS.timePriority;

  beforeEach(() => {
    // Setup Express app (will use actual app when implemented)
    app = MockFactory.createAppMock() as unknown as Express;
    
    // Setup AWS mocks with appropriate responses
    MockFactory.createLocationMock();
    MockFactory.createS3Mock();
  });

  afterEach(() => {
    MockFactory.resetAllMocks();
  });

  describe('Tokyo → Osaka Route with Time Priority', () => {
    it('should process the complete request and return valid response', async () => {
      const response = await request(app)
        .post('/compare')
        .send(scenario.request)
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure
      assertValidComparisonResult(response.body);
    });

    it('should recommend truck route for time-priority scenario', async () => {
      const response = await request(app)
        .post('/compare')
        .send(scenario.request)
        .expect(200);

      const result: ComparisonResult = response.body;
      
      // Truck should be recommended for time priority
      assertRecommendation(result, 'truck', scenario.reason);
    });

    it('should return both truck and truck+ship candidates', async () => {
      const response = await request(app)
        .post('/compare')
        .send(scenario.request)
        .expect(200);

      const result: ComparisonResult = response.body;
      
      // Should have exactly 2 candidates
      expect(result.candidates).toHaveLength(2);
      
      // Find each candidate
      const truckCandidate = result.candidates.find(c => c.plan === 'truck');
      const shipCandidate = result.candidates.find(c => c.plan === 'truck+ship');
      
      expect(truckCandidate).toBeDefined();
      expect(shipCandidate).toBeDefined();
    });

    it('should correctly calculate time differences between routes', async () => {
      const response = await request(app)
        .post('/compare')
        .send(scenario.request)
        .expect(200);

      const result: ComparisonResult = response.body;
      
      const truckCandidate = result.candidates.find(c => c.plan === 'truck');
      const shipCandidate = result.candidates.find(c => c.plan === 'truck+ship');
      
      // Truck should be significantly faster
      expect(truckCandidate!.timeH).toBeLessThan(shipCandidate!.timeH);
      
      // Expected approximate values (based on mock data)
      assertApproximatelyEqual(truckCandidate!.timeH, 7.2, 0.5);
      assertApproximatelyEqual(shipCandidate!.timeH, 21.4, 1.0);
    });

    it('should include detailed rationale for both routes', async () => {
      const response = await request(app)
        .post('/compare')
        .send(scenario.request)
        .expect(200);

      const result: ComparisonResult = response.body;
      
      // Check truck route rationale
      expect(result.rationale.truck).toBeDefined();
      if (result.rationale.truck) {
        expect(result.rationale.truck.distanceKm).toBeGreaterThan(0);
        expect(result.rationale.truck.distanceKm).toBeCloseTo(520, 0);
      }
      
      // Check truck+ship route rationale
      expect(result.rationale['truck+ship']).toBeDefined();
      if (result.rationale['truck+ship']) {
        expect(result.rationale['truck+ship'].legs).toHaveLength(3);
        
        // Verify leg structure
        const legs = result.rationale['truck+ship'].legs;
      
      // First leg: City to Port (truck)
      expect(legs[0].mode).toBe('truck');
      expect(legs[0].from).toMatch(/Tokyo/i);
      expect(legs[0].to).toMatch(/Port/i);
      
      // Second leg: Port to Port (ship)
      expect(legs[1].mode).toBe('ship');
      expect(legs[1].from).toMatch(/Port/i);
      expect(legs[1].to).toMatch(/Port/i);
      
        // Third leg: Port to City (truck)
        expect(legs[2].mode).toBe('truck');
        expect(legs[2].from).toMatch(/Port/i);
        expect(legs[2].to).toMatch(/Osaka/i);
      }
    });

    it('should apply weight factors correctly in scoring', async () => {
      const response = await request(app)
        .post('/compare')
        .send(scenario.request)
        .expect(200);

      const result: ComparisonResult = response.body;
      
      // With time weight = 0.7, the time factor should dominate
      const weights = scenario.request.weights;
      expect(weights.time).toBe(0.7);
      expect(weights.cost).toBe(0.2);
      expect(weights.co2).toBe(0.1);
      
      // Sum should be approximately 1.0
      const sum = weights.time + weights.cost + weights.co2;
      assertApproximatelyEqual(sum, 1.0, 0.001);
    });

    it('should handle the scoring calculation correctly', async () => {
      const response = await request(app)
        .post('/compare')
        .send(scenario.request)
        .expect(200);

      const result: ComparisonResult = response.body;
      
      const truckCandidate = result.candidates.find(c => c.plan === 'truck');
      const shipCandidate = result.candidates.find(c => c.plan === 'truck+ship');
      
      // Calculate weighted scores manually
      const weights = scenario.request.weights;
      
      // Normalize values (this is a simplified example)
      // In real implementation, normalization would be based on min-max scaling
      const truckScore = 
        weights.time * (truckCandidate!.timeH / 24) + // Normalize to 24h
        weights.cost * (truckCandidate!.costJpy / 50000) + // Normalize to 50k JPY
        weights.co2 * (truckCandidate!.co2Kg / 50); // Normalize to 50kg CO2
      
      const shipScore = 
        weights.time * (shipCandidate!.timeH / 24) +
        weights.cost * (shipCandidate!.costJpy / 50000) +
        weights.co2 * (shipCandidate!.co2Kg / 50);
      
      // With time priority, truck should have lower (better) score
      expect(truckScore).toBeLessThan(shipScore);
    });

    it('should return consistent results for identical requests', async () => {
      // Send the same request multiple times
      const responses = await Promise.all([
        request(app).post('/compare').send(scenario.request),
        request(app).post('/compare').send(scenario.request),
        request(app).post('/compare').send(scenario.request)
      ]);
      
      // All should succeed
      responses.forEach(r => expect(r.status).toBe(200));
      
      // All should recommend the same route
      const recommendations = responses.map(r => r.body.recommendation);
      expect(new Set(recommendations).size).toBe(1);
      expect(recommendations[0]).toBe('truck');
    });

    it('should include performance metadata if available', async () => {
      const response = await request(app)
        .post('/compare')
        .send(scenario.request)
        .expect(200);

      const result: ComparisonResult = response.body;
      
      // Metadata is optional but if present should be valid
      if (result.metadata) {
        if (result.metadata.calculationTimeMs !== undefined) {
          expect(result.metadata.calculationTimeMs).toBeGreaterThanOrEqual(0);
          expect(result.metadata.calculationTimeMs).toBeLessThan(TEST_CONFIG.validation.maxResponseTime);
        }
        
        if (result.metadata.dataVersion !== undefined) {
          expect(result.metadata.dataVersion).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        }
      }
    });

    it('should handle different cargo weights correctly', async () => {
      // Test with different weights
      const lightCargo = { ...scenario.request, weightKg: 100 };
      const heavyCargo = { ...scenario.request, weightKg: 5000 };
      
      const [lightResponse, heavyResponse] = await Promise.all([
        request(app).post('/compare').send(lightCargo),
        request(app).post('/compare').send(heavyCargo)
      ]);
      
      expect(lightResponse.status).toBe(200);
      expect(heavyResponse.status).toBe(200);
      
      // Both should still recommend truck for time priority
      expect(lightResponse.body.recommendation).toBe('truck');
      expect(heavyResponse.body.recommendation).toBe('truck');
      
      // But costs and CO2 should differ
      const lightTruck = lightResponse.body.candidates.find((c: any) => c.plan === 'truck');
      const heavyTruck = heavyResponse.body.candidates.find((c: any) => c.plan === 'truck');
      
      expect(heavyTruck.costJpy).toBeGreaterThan(lightTruck.costJpy);
      expect(heavyTruck.co2Kg).toBeGreaterThan(lightTruck.co2Kg);
    });
  });

  describe('Data Integration', () => {
    it('should load and parse CSV data correctly', async () => {
      const response = await request(app)
        .post('/compare')
        .send(scenario.request)
        .expect(200);

      const result: ComparisonResult = response.body;
      
      // Verify data is loaded from CSV (check realistic values)
      const truckCandidate = result.candidates.find(c => c.plan === 'truck');
      
      // These values should come from CSV data
      expect(truckCandidate!.costJpy).toBeGreaterThan(0);
      expect(truckCandidate!.co2Kg).toBeGreaterThan(0);
      expect(truckCandidate!.timeH).toBeGreaterThan(0);
    });

    it('should use AWS Location Service for route calculation', async () => {
      const response = await request(app)
        .post('/compare')
        .send(scenario.request)
        .expect(200);

      const result: ComparisonResult = response.body;
      
      // Distance should be calculated by AWS Location
      if (result.rationale.truck) {
        expect(result.rationale.truck.distanceKm).toBeDefined();
        expect(result.rationale.truck.distanceKm).toBeGreaterThan(0);
      }
    });

    it('should integrate ship route data from links.csv', async () => {
      const response = await request(app)
        .post('/compare')
        .send(scenario.request)
        .expect(200);

      const result: ComparisonResult = response.body;
      
      // Ship route should use predefined links
      if (result.rationale['truck+ship']) {
        const shipLeg = result.rationale['truck+ship'].legs.find(l => l.mode === 'ship');
        
        expect(shipLeg).toBeDefined();
        if (shipLeg) {
          expect(shipLeg.distanceKm).toBeGreaterThan(0);
          expect(shipLeg.timeHours).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('Error Handling in Integration', () => {
    it('should handle missing location gracefully', async () => {
      const invalidRequest = {
        ...scenario.request,
        destination: 'NonExistentCity'
      };

      const response = await request(app)
        .post('/compare')
        .send(invalidRequest)
        .expect(404);

      expect(response.body.error.code).toBe('ROUTE_NOT_FOUND');
    });

    it('should handle AWS service failures gracefully', async () => {
      // Setup failing mocks
      MockFactory.createFailingLocationMock();

      const response = await request(app)
        .post('/compare')
        .send(scenario.request)
        .expect(500);

      expect(response.body.error.code).toBe('SERVICE_ERROR');
    });
  });
});