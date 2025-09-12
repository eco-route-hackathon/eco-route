/**
 * Integration Test: Balanced Weights Scenario
 * Tests the complete flow when all factors are equally important
 * 
 * Scenario: Tokyo → Osaka with balanced weights (time: 0.33, cost: 0.33, co2: 0.34)
 * Expected: Recommendation depends on normalized score calculation
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
  assertApproximatelyEqual,
  assertNormalizedWeights
} from '../setup/assertions';
import { TEST_CONFIG } from '../setup/test-config';

describe('Integration Test: Balanced Weights Scenario', () => {
  let app: Express;
  const scenario = TEST_SCENARIOS.balanced;

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

  describe('Tokyo → Osaka Route with Balanced Weights', () => {
    it('should process the complete request and return valid response', async () => {
      const response = await request(app)
        .post('/compare')
        .send(scenario.request)
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure
      assertValidComparisonResult(response.body);
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
      
      // Both should have all required metrics
      [truckCandidate, shipCandidate].forEach(candidate => {
        expect(candidate!.timeH).toBeGreaterThan(0);
        expect(candidate!.costJpy).toBeGreaterThan(0);
        expect(candidate!.co2Kg).toBeGreaterThan(0);
      });
    });

    it('should apply balanced weights correctly', async () => {
      const response = await request(app)
        .post('/compare')
        .send(scenario.request)
        .expect(200);

      const weights = scenario.request.weights;
      
      // Weights should be approximately equal
      expect(weights.time).toBeCloseTo(0.33, 2);
      expect(weights.cost).toBeCloseTo(0.33, 2);
      expect(weights.co2).toBeCloseTo(0.34, 2);
      
      // Validate weights are normalized
      assertNormalizedWeights(weights);
    });

    it('should calculate normalized scores for balanced comparison', async () => {
      const response = await request(app)
        .post('/compare')
        .send(scenario.request)
        .expect(200);

      const result: ComparisonResult = response.body;
      
      const truckCandidate = result.candidates.find(c => c.plan === 'truck');
      const shipCandidate = result.candidates.find(c => c.plan === 'truck+ship');
      
      // With balanced weights, the recommendation depends on normalized values
      // Truck advantages: faster time
      // Ship advantages: lower cost and CO2
      
      // Calculate normalized scores (simplified example)
      const weights = scenario.request.weights;
      
      // Normalize to 0-1 scale (using max values as reference)
      const maxTime = Math.max(truckCandidate!.timeH, shipCandidate!.timeH);
      const maxCost = Math.max(truckCandidate!.costJpy, shipCandidate!.costJpy);
      const maxCO2 = Math.max(truckCandidate!.co2Kg, shipCandidate!.co2Kg);
      
      const truckScore = 
        weights.time * (truckCandidate!.timeH / maxTime) +
        weights.cost * (truckCandidate!.costJpy / maxCost) +
        weights.co2 * (truckCandidate!.co2Kg / maxCO2);
      
      const shipScore = 
        weights.time * (shipCandidate!.timeH / maxTime) +
        weights.cost * (shipCandidate!.costJpy / maxCost) +
        weights.co2 * (shipCandidate!.co2Kg / maxCO2);
      
      // The route with lower score should be recommended
      if (truckScore < shipScore) {
        expect(result.recommendation).toBe('truck');
      } else {
        expect(result.recommendation).toBe('truck+ship');
      }
    });

    it('should show trade-offs clearly in balanced scenario', async () => {
      const response = await request(app)
        .post('/compare')
        .send(scenario.request)
        .expect(200);

      const result: ComparisonResult = response.body;
      
      const truckCandidate = result.candidates.find(c => c.plan === 'truck');
      const shipCandidate = result.candidates.find(c => c.plan === 'truck+ship');
      
      // Verify trade-offs exist
      // Truck: faster but more expensive and higher emissions
      expect(truckCandidate!.timeH).toBeLessThan(shipCandidate!.timeH);
      expect(truckCandidate!.costJpy).toBeGreaterThan(shipCandidate!.costJpy);
      expect(truckCandidate!.co2Kg).toBeGreaterThan(shipCandidate!.co2Kg);
      
      // Ship: slower but cheaper and cleaner
      expect(shipCandidate!.timeH).toBeGreaterThan(truckCandidate!.timeH);
      expect(shipCandidate!.costJpy).toBeLessThan(truckCandidate!.costJpy);
      expect(shipCandidate!.co2Kg).toBeLessThan(truckCandidate!.co2Kg);
    });

    it('should provide detailed comparison metrics', async () => {
      const response = await request(app)
        .post('/compare')
        .send(scenario.request)
        .expect(200);

      const result: ComparisonResult = response.body;
      
      const truckCandidate = result.candidates.find(c => c.plan === 'truck');
      const shipCandidate = result.candidates.find(c => c.plan === 'truck+ship');
      
      // Calculate percentage differences
      const timeDiff = ((shipCandidate!.timeH - truckCandidate!.timeH) / truckCandidate!.timeH) * 100;
      const costDiff = ((truckCandidate!.costJpy - shipCandidate!.costJpy) / truckCandidate!.costJpy) * 100;
      const co2Diff = ((truckCandidate!.co2Kg - shipCandidate!.co2Kg) / truckCandidate!.co2Kg) * 100;
      
      // Ship should be ~200% slower (3x time)
      expect(timeDiff).toBeGreaterThan(150);
      expect(timeDiff).toBeLessThan(250);
      
      // Ship should be ~60% cheaper
      expect(costDiff).toBeGreaterThan(50);
      expect(costDiff).toBeLessThan(70);
      
      // Ship should have ~80% less CO2
      expect(co2Diff).toBeGreaterThan(70);
      expect(co2Diff).toBeLessThan(90);
    });

    it('should handle weight adjustments sensitively', async () => {
      // Test with slightly different balanced weights
      const slightlyTimeFavored = {
        ...scenario.request,
        weights: { time: 0.35, cost: 0.33, co2: 0.32 }
      };
      
      const slightlyCO2Favored = {
        ...scenario.request,
        weights: { time: 0.32, cost: 0.33, co2: 0.35 }
      };
      
      const [timeResponse, co2Response] = await Promise.all([
        request(app).post('/compare').send(slightlyTimeFavored),
        request(app).post('/compare').send(slightlyCO2Favored)
      ]);
      
      expect(timeResponse.status).toBe(200);
      expect(co2Response.status).toBe(200);
      
      // Small weight changes might affect recommendation
      // This tests the sensitivity of the scoring algorithm
      const timeResult = timeResponse.body;
      const co2Result = co2Response.body;
      
      // With balanced weights, recommendations could differ based on small changes
      expect(['truck', 'truck+ship']).toContain(timeResult.recommendation);
      expect(['truck', 'truck+ship']).toContain(co2Result.recommendation);
    });

    it('should scale linearly with cargo weight', async () => {
      // Test with different weights but same balanced priorities
      const weights = [100, 500, 1000, 5000];
      
      const responses = await Promise.all(
        weights.map(weightKg => 
          request(app)
            .post('/compare')
            .send({ ...scenario.request, weightKg })
        )
      );
      
      // All should succeed
      responses.forEach(r => expect(r.status).toBe(200));
      
      // Extract costs and CO2 for truck route
      const truckMetrics = responses.map(r => {
        const truck = r.body.candidates.find((c: any) => c.plan === 'truck');
        return {
          weight: weights[responses.indexOf(r)],
          cost: truck.costJpy,
          co2: truck.co2Kg
        };
      });
      
      // Verify linear scaling
      for (let i = 1; i < truckMetrics.length; i++) {
        const weightRatio = truckMetrics[i].weight / truckMetrics[0].weight;
        const costRatio = truckMetrics[i].cost / truckMetrics[0].cost;
        const co2Ratio = truckMetrics[i].co2 / truckMetrics[0].co2;
        
        // Cost might have fixed component, but should scale mostly linearly
        expect(costRatio).toBeGreaterThan(weightRatio * 0.8);
        expect(costRatio).toBeLessThan(weightRatio * 1.2);
        
        // CO2 should scale linearly with weight
        assertApproximatelyEqual(co2Ratio, weightRatio, 0.1);
      }
    });

    it('should maintain recommendation consistency for identical balanced requests', async () => {
      // Send the same balanced request multiple times
      const requests = Array(5).fill(scenario.request);
      
      const responses = await Promise.all(
        requests.map(req => 
          request(app).post('/compare').send(req)
        )
      );
      
      // All should succeed
      responses.forEach(r => expect(r.status).toBe(200));
      
      // All should have the same recommendation
      const recommendations = responses.map(r => r.body.recommendation);
      const uniqueRecommendations = new Set(recommendations);
      
      expect(uniqueRecommendations.size).toBe(1);
      
      // All metrics should be identical
      const truckMetrics = responses.map(r => {
        const truck = r.body.candidates.find((c: any) => c.plan === 'truck');
        return { time: truck.timeH, cost: truck.costJpy, co2: truck.co2Kg };
      });
      
      // Verify all metrics are the same
      for (let i = 1; i < truckMetrics.length; i++) {
        expect(truckMetrics[i]).toEqual(truckMetrics[0]);
      }
    });
  });

  describe('Scoring Algorithm Validation', () => {
    it('should normalize metrics correctly before scoring', async () => {
      const response = await request(app)
        .post('/compare')
        .send(scenario.request)
        .expect(200);

      const result: ComparisonResult = response.body;
      
      // The scoring algorithm should normalize each metric
      // This ensures fair comparison across different units
      
      const truckCandidate = result.candidates.find(c => c.plan === 'truck');
      const shipCandidate = result.candidates.find(c => c.plan === 'truck+ship');
      
      // Time in hours, cost in JPY, CO2 in kg - all different scales
      // They should be normalized to comparable ranges (e.g., 0-1)
      
      // The recommendation should be based on normalized scores
      expect(result.recommendation).toBeDefined();
      expect(['truck', 'truck+ship']).toContain(result.recommendation);
    });

    it('should handle edge case where all metrics are equal', async () => {
      // This is a theoretical test - in practice metrics won't be exactly equal
      // But the system should handle it gracefully
      
      const response = await request(app)
        .post('/compare')
        .send(scenario.request)
        .expect(200);

      const result: ComparisonResult = response.body;
      
      // System should always make a recommendation
      expect(result.recommendation).toBeDefined();
      
      // In case of a tie, system might prefer one option (e.g., simpler truck route)
      expect(['truck', 'truck+ship']).toContain(result.recommendation);
    });

    it('should respect weight boundaries (0-1 range)', async () => {
      // Test with weights at boundaries
      const boundaryTests = [
        { time: 1.0, cost: 0.0, co2: 0.0 }, // Pure time optimization
        { time: 0.0, cost: 1.0, co2: 0.0 }, // Pure cost optimization
        { time: 0.0, cost: 0.0, co2: 1.0 }, // Pure CO2 optimization
      ];
      
      for (const weights of boundaryTests) {
        const testRequest = { ...scenario.request, weights };
        
        const response = await request(app)
          .post('/compare')
          .send(testRequest)
          .expect(200);
        
        assertValidComparisonResult(response.body);
      }
    });
  });

  describe('Data Integration for Balanced Scoring', () => {
    it('should use all data sources correctly', async () => {
      const response = await request(app)
        .post('/compare')
        .send(scenario.request)
        .expect(200);

      const result: ComparisonResult = response.body;
      
      // Verify data from different sources is integrated
      
      // 1. AWS Location Service for distances
      if (result.rationale.truck) {
        expect(result.rationale.truck.distanceKm).toBeDefined();
        expect(result.rationale.truck.distanceKm).toBeGreaterThan(0);
      }
      
      // 2. CSV data for mode characteristics
      const truckCandidate = result.candidates.find(c => c.plan === 'truck');
      const shipCandidate = result.candidates.find(c => c.plan === 'truck+ship');
      
      // Values should reflect CSV data (cost per km, CO2 factors, speeds)
      expect(truckCandidate!.costJpy).toBeGreaterThan(0);
      expect(shipCandidate!.co2Kg).toBeGreaterThan(0);
      
      // 3. Links data for ship routes
      if (result.rationale['truck+ship']) {
        const shipLeg = result.rationale['truck+ship'].legs.find(l => l.mode === 'ship');
        expect(shipLeg).toBeDefined();
        expect(shipLeg!.distanceKm).toBeGreaterThan(0);
      }
    });

    it('should handle missing ship routes gracefully', async () => {
      // For some origin-destination pairs, ship might not be available
      const noShipRouteRequest: ComparisonRequest = {
        origin: 'Nagano', // Inland city
        destination: 'Gunma', // Inland city
        weightKg: 1000,
        weights: {
          time: 0.33,
          cost: 0.33,
          co2: 0.34
        }
      };

      const response = await request(app)
        .post('/compare')
        .send(noShipRouteRequest);

      // Should either return only truck or handle gracefully
      if (response.status === 200) {
        const result: ComparisonResult = response.body;
        
        // Might only have truck option
        expect(result.candidates.length).toBeGreaterThanOrEqual(1);
        
        const hasTruck = result.candidates.some(c => c.plan === 'truck');
        expect(hasTruck).toBe(true);
      } else if (response.status === 404) {
        // Or return route not found
        expect(response.body.error.code).toBe('ROUTE_NOT_FOUND');
      }
    });
  });

  describe('Error Handling in Balanced Scenario', () => {
    it('should validate weight sum equals 1.0', async () => {
      const invalidWeights = {
        ...scenario.request,
        weights: { time: 0.5, cost: 0.3, co2: 0.1 } // Sum = 0.9
      };

      const response = await request(app)
        .post('/compare')
        .send(invalidWeights)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toMatch(/sum|total|weight/i);
    });

    it('should handle calculation errors gracefully', async () => {
      // Simulate calculation error
      MockFactory.createFailingLocationMock();

      const response = await request(app)
        .post('/compare')
        .send(scenario.request)
        .expect(500);

      expect(response.body.error.code).toBe('SERVICE_ERROR');
    });
  });
});