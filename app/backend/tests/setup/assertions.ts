/**
 * Common Assertion Functions
 * Use these functions to validate responses consistently across all tests.
 * DO NOT write custom assertions in individual test files.
 */

import { 
  ComparisonResult, 
  TransportPlan, 
  ErrorResponse,
  PlanType,
  ErrorCode 
} from '../../src/lib/shared-types';
import { TEST_CONFIG } from './test-config';

/**
 * Assert that a response has the correct ComparisonResult structure
 */
export function assertValidComparisonResult(result: any): asserts result is ComparisonResult {
  // Check required top-level fields
  expect(result).toBeDefined();
  expect(result).toHaveProperty('candidates');
  expect(result).toHaveProperty('recommendation');
  expect(result).toHaveProperty('rationale');
  
  // Validate candidates array
  expect(Array.isArray(result.candidates)).toBe(true);
  expect(result.candidates.length).toBeGreaterThanOrEqual(1);
  expect(result.candidates.length).toBeLessThanOrEqual(2); // Only truck and truck+ship for MVP
  
  // Validate each candidate
  result.candidates.forEach((candidate: any) => {
    assertValidTransportPlan(candidate);
  });
  
  // Validate recommendation
  expect(['truck', 'truck+ship']).toContain(result.recommendation);
  
  // Validate rationale
  expect(result.rationale).toBeDefined();
  if (result.rationale.truck) {
    expect(result.rationale.truck).toHaveProperty('distanceKm');
    expect(typeof result.rationale.truck.distanceKm).toBe('number');
    expect(result.rationale.truck.distanceKm).toBeGreaterThan(0);
  }
  
  if (result.rationale['truck+ship']) {
    expect(result.rationale['truck+ship']).toHaveProperty('legs');
    expect(Array.isArray(result.rationale['truck+ship'].legs)).toBe(true);
    result.rationale['truck+ship'].legs.forEach((leg: any) => {
      assertValidTransportLeg(leg);
    });
  }
  
  // Optional metadata validation
  if (result.metadata) {
    expect(result.metadata).toHaveProperty('calculationTimeMs');
    expect(typeof result.metadata.calculationTimeMs).toBe('number');
    expect(result.metadata.calculationTimeMs).toBeGreaterThanOrEqual(0);
    expect(result.metadata.calculationTimeMs).toBeLessThanOrEqual(TEST_CONFIG.validation.maxResponseTime);
  }
}

/**
 * Assert that a TransportPlan has the correct structure
 */
export function assertValidTransportPlan(plan: any): asserts plan is TransportPlan {
  expect(plan).toBeDefined();
  expect(plan).toHaveProperty('plan');
  expect(plan).toHaveProperty('timeH');
  expect(plan).toHaveProperty('costJpy');
  expect(plan).toHaveProperty('co2Kg');
  
  // Validate plan type
  expect(['truck', 'truck+ship']).toContain(plan.plan);
  
  // Validate numeric values
  expect(typeof plan.timeH).toBe('number');
  expect(plan.timeH).toBeGreaterThan(0);
  expect(plan.timeH).toBeLessThan(100); // Reasonable upper limit
  
  expect(typeof plan.costJpy).toBe('number');
  expect(plan.costJpy).toBeGreaterThan(0);
  expect(plan.costJpy).toBeLessThan(1000000); // Reasonable upper limit
  
  expect(typeof plan.co2Kg).toBe('number');
  expect(plan.co2Kg).toBeGreaterThan(0);
  expect(plan.co2Kg).toBeLessThan(10000); // Reasonable upper limit
  
  // Validate legs for truck+ship plan
  if (plan.plan === 'truck+ship') {
    expect(plan).toHaveProperty('legs');
    expect(Array.isArray(plan.legs)).toBe(true);
    expect(plan.legs.length).toBeGreaterThan(0);
  }
}

/**
 * Assert that a TransportLeg has the correct structure
 */
export function assertValidTransportLeg(leg: any) {
  expect(leg).toBeDefined();
  expect(leg).toHaveProperty('from');
  expect(leg).toHaveProperty('to');
  expect(leg).toHaveProperty('mode');
  expect(leg).toHaveProperty('distanceKm');
  expect(leg).toHaveProperty('timeHours');
  
  // Validate string fields
  expect(typeof leg.from).toBe('string');
  expect(leg.from.length).toBeGreaterThan(0);
  expect(typeof leg.to).toBe('string');
  expect(leg.to.length).toBeGreaterThan(0);
  
  // Validate mode
  expect(['truck', 'ship']).toContain(leg.mode);
  
  // Validate numeric fields
  expect(typeof leg.distanceKm).toBe('number');
  expect(leg.distanceKm).toBeGreaterThan(0);
  expect(typeof leg.timeHours).toBe('number');
  expect(leg.timeHours).toBeGreaterThan(0);
}

/**
 * Assert that an error response has the correct structure
 */
export function assertValidErrorResponse(response: any): asserts response is ErrorResponse {
  expect(response).toBeDefined();
  expect(response).toHaveProperty('error');
  expect(response).toHaveProperty('requestId');
  expect(response).toHaveProperty('timestamp');
  
  // Validate error object
  expect(response.error).toHaveProperty('code');
  expect(response.error).toHaveProperty('message');
  expect(TEST_CONFIG.validation.errorCodes).toContain(response.error.code);
  expect(typeof response.error.message).toBe('string');
  expect(response.error.message.length).toBeGreaterThan(0);
  
  // Validate requestId
  expect(typeof response.requestId).toBe('string');
  expect(response.requestId.length).toBeGreaterThan(0);
  
  // Validate timestamp
  expect(typeof response.timestamp).toBe('string');
  const timestamp = new Date(response.timestamp);
  expect(timestamp.toString()).not.toBe('Invalid Date');
}

/**
 * Assert that the recommendation matches the expected value
 */
export function assertRecommendation(
  result: ComparisonResult,
  expected: PlanType,
  reason?: string
) {
  expect(result.recommendation).toBe(expected);
  if (reason) {
    console.log(`✓ Recommendation is ${expected}: ${reason}`);
  }
}

/**
 * Assert that a value is approximately equal (for floating point comparisons)
 */
export function assertApproximatelyEqual(
  actual: number,
  expected: number,
  tolerance: number = 0.01
) {
  const difference = Math.abs(actual - expected);
  expect(difference).toBeLessThanOrEqual(tolerance);
}

/**
 * Assert that response time is within acceptable limits
 */
export function assertResponseTime(startTime: number, endTime: number) {
  const responseTime = endTime - startTime;
  expect(responseTime).toBeLessThanOrEqual(TEST_CONFIG.validation.maxResponseTime);
  
  if (responseTime > TEST_CONFIG.validation.maxResponseTime * 0.8) {
    console.warn(`⚠️ Response time ${responseTime}ms is approaching limit`);
  }
}

/**
 * Assert that weights are properly normalized
 */
export function assertNormalizedWeights(weights: { time: number; cost: number; co2: number }) {
  const sum = weights.time + weights.cost + weights.co2;
  assertApproximatelyEqual(sum, 1.0, 0.001);
  
  expect(weights.time).toBeGreaterThanOrEqual(0);
  expect(weights.time).toBeLessThanOrEqual(1);
  expect(weights.cost).toBeGreaterThanOrEqual(0);
  expect(weights.cost).toBeLessThanOrEqual(1);
  expect(weights.co2).toBeGreaterThanOrEqual(0);
  expect(weights.co2).toBeLessThanOrEqual(1);
}

/**
 * Assert that a plan is more optimal than another for given criteria
 */
export function assertPlanOptimality(
  betterPlan: TransportPlan,
  worsePlan: TransportPlan,
  criteria: 'time' | 'cost' | 'co2'
) {
  switch (criteria) {
    case 'time':
      expect(betterPlan.timeH).toBeLessThan(worsePlan.timeH);
      break;
    case 'cost':
      expect(betterPlan.costJpy).toBeLessThan(worsePlan.costJpy);
      break;
    case 'co2':
      expect(betterPlan.co2Kg).toBeLessThan(worsePlan.co2Kg);
      break;
  }
}

/**
 * Assert that CSV data can be parsed correctly
 */
export function assertValidCsvData(csvString: string, expectedHeaders: string[]) {
  const lines = csvString.trim().split('\n');
  expect(lines.length).toBeGreaterThan(1); // At least headers and one data row
  
  const headers = lines[0].split(',');
  expect(headers).toEqual(expectedHeaders);
  
  // Check that all rows have the same number of columns
  for (let i = 1; i < lines.length; i++) {
    const columns = lines[i].split(',');
    expect(columns.length).toBe(headers.length);
  }
}

/**
 * Assert that authentication is NOT present (MVP requirement)
 */
export function assertNoAuthentication(headers: any) {
  // MVP has no authentication - ensure no auth headers are present
  expect(headers).not.toHaveProperty('authorization');
  expect(headers).not.toHaveProperty('x-api-key');
  expect(headers).not.toHaveProperty('auth-token');
  
  // This is critical for consistency - we decided NO auth for MVP
  if (TEST_CONFIG.authentication.enabled) {
    throw new Error('TEST_CONFIG.authentication.enabled must be false for MVP');
  }
}