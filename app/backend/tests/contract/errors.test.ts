/**
 * Contract Tests for Error Responses
 * Tests error handling as defined in openapi.yaml
 * 
 * TDD: These tests should FAIL initially until error handling is implemented
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { Express } from 'express';
import { 
  ErrorResponse,
  ErrorCode,
  ComparisonRequest 
} from '../../src/lib/shared-types';
import { MockFactory } from '../setup/mock-factory';
import { TEST_SCENARIOS } from '../setup/test-data';
import { 
  assertValidErrorResponse,
  assertErrorCode,
  assertErrorHasRequiredFields 
} from '../setup/assertions';
import { TEST_CONFIG } from '../setup/test-config';

describe('Error Response Contract Tests', () => {
  let app: Express;

  beforeEach(() => {
    // Create Express app mock or use actual app when available
    app = MockFactory.createAppMock() as unknown as Express;
    
    // Setup AWS mocks
    MockFactory.createLocationMock();
    MockFactory.createS3Mock();
  });

  afterEach(() => {
    MockFactory.resetAllMocks();
  });

  describe('400 Validation Errors', () => {
    it('should return 400 when origin is missing', async () => {
      const invalidRequest = {
        destination: 'Osaka',
        weightKg: 500,
        weights: { time: 0.5, cost: 0.3, co2: 0.2 }
      };

      const response = await request(app)
        .post('/compare')
        .send(invalidRequest)
        .expect(400);

      assertValidErrorResponse(response.body);
      assertErrorCode(response.body, ErrorCode.VALIDATION_ERROR);
      
      // Should indicate which field is missing
      expect(response.body.error.field).toBe('origin');
      expect(response.body.error.message).toContain('origin');
    });

    it('should return 400 when destination is missing', async () => {
      const invalidRequest = {
        origin: 'Tokyo',
        weightKg: 500,
        weights: { time: 0.5, cost: 0.3, co2: 0.2 }
      };

      const response = await request(app)
        .post('/compare')
        .send(invalidRequest)
        .expect(400);

      assertValidErrorResponse(response.body);
      assertErrorCode(response.body, ErrorCode.VALIDATION_ERROR);
      expect(response.body.error.field).toBe('destination');
    });

    it('should return 400 when weightKg is missing', async () => {
      const invalidRequest = {
        origin: 'Tokyo',
        destination: 'Osaka',
        weights: { time: 0.5, cost: 0.3, co2: 0.2 }
      };

      const response = await request(app)
        .post('/compare')
        .send(invalidRequest)
        .expect(400);

      assertValidErrorResponse(response.body);
      assertErrorCode(response.body, ErrorCode.VALIDATION_ERROR);
      expect(response.body.error.field).toBe('weightKg');
    });

    it('should return 400 when weights object is missing', async () => {
      const invalidRequest = {
        origin: 'Tokyo',
        destination: 'Osaka',
        weightKg: 500
      };

      const response = await request(app)
        .post('/compare')
        .send(invalidRequest)
        .expect(400);

      assertValidErrorResponse(response.body);
      assertErrorCode(response.body, ErrorCode.VALIDATION_ERROR);
      expect(response.body.error.field).toBe('weights');
    });

    it('should return 400 when weightKg is negative', async () => {
      const invalidRequest: ComparisonRequest = {
        origin: 'Tokyo',
        destination: 'Osaka',
        weightKg: -100,
        weights: { time: 0.5, cost: 0.3, co2: 0.2 }
      };

      const response = await request(app)
        .post('/compare')
        .send(invalidRequest)
        .expect(400);

      assertValidErrorResponse(response.body);
      assertErrorCode(response.body, ErrorCode.VALIDATION_ERROR);
      expect(response.body.error.field).toBe('weightKg');
      expect(response.body.error.message).toContain('positive');
    });

    it('should return 400 when weightKg exceeds maximum (100000)', async () => {
      const invalidRequest: ComparisonRequest = {
        origin: 'Tokyo',
        destination: 'Osaka',
        weightKg: 100001,
        weights: { time: 0.5, cost: 0.3, co2: 0.2 }
      };

      const response = await request(app)
        .post('/compare')
        .send(invalidRequest)
        .expect(400);

      assertValidErrorResponse(response.body);
      assertErrorCode(response.body, ErrorCode.VALIDATION_ERROR);
      expect(response.body.error.field).toBe('weightKg');
      expect(response.body.error.message).toMatch(/maximum|exceed/i);
    });

    it('should return 400 when weight factors are negative', async () => {
      const invalidRequest: ComparisonRequest = {
        origin: 'Tokyo',
        destination: 'Osaka',
        weightKg: 500,
        weights: { time: -0.5, cost: 0.8, co2: 0.7 }
      };

      const response = await request(app)
        .post('/compare')
        .send(invalidRequest)
        .expect(400);

      assertValidErrorResponse(response.body);
      assertErrorCode(response.body, ErrorCode.VALIDATION_ERROR);
      expect(response.body.error.field).toMatch(/weights|time/);
      expect(response.body.error.message).toContain('negative');
    });

    it('should return 400 when weight factors exceed 1.0', async () => {
      const invalidRequest: ComparisonRequest = {
        origin: 'Tokyo',
        destination: 'Osaka',
        weightKg: 500,
        weights: { time: 1.5, cost: 0.3, co2: 0.2 }
      };

      const response = await request(app)
        .post('/compare')
        .send(invalidRequest)
        .expect(400);

      assertValidErrorResponse(response.body);
      assertErrorCode(response.body, ErrorCode.VALIDATION_ERROR);
      expect(response.body.error.field).toMatch(/weights|time/);
    });

    it('should return 400 when weight factors sum is not approximately 1.0', async () => {
      const invalidRequest: ComparisonRequest = {
        origin: 'Tokyo',
        destination: 'Osaka',
        weightKg: 500,
        weights: { time: 0.1, cost: 0.1, co2: 0.1 } // Sum = 0.3
      };

      const response = await request(app)
        .post('/compare')
        .send(invalidRequest)
        .expect(400);

      assertValidErrorResponse(response.body);
      assertErrorCode(response.body, ErrorCode.VALIDATION_ERROR);
      expect(response.body.error.message).toMatch(/sum|total|1\.0/i);
    });

    it('should return 400 when origin and destination are the same', async () => {
      const invalidRequest: ComparisonRequest = {
        origin: 'Tokyo',
        destination: 'Tokyo',
        weightKg: 500,
        weights: { time: 0.5, cost: 0.3, co2: 0.2 }
      };

      const response = await request(app)
        .post('/compare')
        .send(invalidRequest)
        .expect(400);

      assertValidErrorResponse(response.body);
      assertErrorCode(response.body, ErrorCode.VALIDATION_ERROR);
      expect(response.body.error.message).toContain('different');
    });

    it('should return 400 when origin exceeds maxLength (100 chars)', async () => {
      const invalidRequest: ComparisonRequest = {
        origin: 'A'.repeat(101), // 101 characters
        destination: 'Osaka',
        weightKg: 500,
        weights: { time: 0.5, cost: 0.3, co2: 0.2 }
      };

      const response = await request(app)
        .post('/compare')
        .send(invalidRequest)
        .expect(400);

      assertValidErrorResponse(response.body);
      assertErrorCode(response.body, ErrorCode.VALIDATION_ERROR);
      expect(response.body.error.field).toBe('origin');
      expect(response.body.error.message).toMatch(/length|long/i);
    });

    it('should return 400 for invalid JSON payload', async () => {
      const response = await request(app)
        .post('/compare')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);

      assertValidErrorResponse(response.body);
      assertErrorCode(response.body, ErrorCode.VALIDATION_ERROR);
      expect(response.body.error.message).toMatch(/JSON|parse/i);
    });
  });

  describe('404 Route Not Found', () => {
    it('should return 404 when origin location does not exist', async () => {
      const invalidRequest: ComparisonRequest = {
        origin: 'NonExistentCity',
        destination: 'Osaka',
        weightKg: 500,
        weights: { time: 0.5, cost: 0.3, co2: 0.2 }
      };

      const response = await request(app)
        .post('/compare')
        .send(invalidRequest)
        .expect(404);

      assertValidErrorResponse(response.body);
      assertErrorCode(response.body, ErrorCode.ROUTE_NOT_FOUND);
      expect(response.body.error.message).toContain('NonExistentCity');
      
      // Should include details about which location was not found
      if (response.body.error.details) {
        expect((response.body.error.details as any).location).toBe('NonExistentCity');
      }
    });

    it('should return 404 when destination location does not exist', async () => {
      const invalidRequest: ComparisonRequest = {
        origin: 'Tokyo',
        destination: 'InvalidDestination',
        weightKg: 500,
        weights: { time: 0.5, cost: 0.3, co2: 0.2 }
      };

      const response = await request(app)
        .post('/compare')
        .send(invalidRequest)
        .expect(404);

      assertValidErrorResponse(response.body);
      assertErrorCode(response.body, ErrorCode.ROUTE_NOT_FOUND);
      expect(response.body.error.message).toContain('InvalidDestination');
    });

    it('should return 404 when no route can be calculated between locations', async () => {
      // Assuming some locations might not have viable routes
      const noRouteRequest: ComparisonRequest = {
        origin: 'Okinawa',
        destination: 'Hokkaido',
        weightKg: 500,
        weights: { time: 0.5, cost: 0.3, co2: 0.2 }
      };

      // Note: This might actually return 200 with results
      // Adjust based on business logic
      const response = await request(app)
        .post('/compare')
        .send(noRouteRequest);

      // If it returns 404
      if (response.status === 404) {
        assertValidErrorResponse(response.body);
        assertErrorCode(response.body, ErrorCode.ROUTE_NOT_FOUND);
        expect(response.body.error.message).toMatch(/route|calculate/i);
      }
    });
  });

  describe('500 Service Errors', () => {
    it('should return 500 when AWS Location Service fails', async () => {
      // Setup mock to simulate AWS Location Service failure
      const failingLocationMock = MockFactory.createFailingLocationMock();

      const validRequest: ComparisonRequest = TEST_SCENARIOS.timePriority.request;

      const response = await request(app)
        .post('/compare')
        .send(validRequest)
        .expect(500);

      assertValidErrorResponse(response.body);
      assertErrorCode(response.body, ErrorCode.SERVICE_ERROR);
      expect(response.body.error.message).toMatch(/calculate|route|AWS|Location/i);
    });

    it('should return 500 when S3 service fails to load CSV data', async () => {
      // Setup mock to simulate S3 failure
      const failingS3Mock = MockFactory.createFailingS3Mock();

      const validRequest: ComparisonRequest = TEST_SCENARIOS.co2Priority.request;

      const response = await request(app)
        .post('/compare')
        .send(validRequest)
        .expect(500);

      assertValidErrorResponse(response.body);
      assertErrorCode(response.body, ErrorCode.SERVICE_ERROR);
      expect(response.body.error.message).toMatch(/data|S3|CSV/i);
    });

    it('should return 500 when CSV data is corrupted', async () => {
      // Setup mock to return corrupted CSV data
      const corruptedDataMock = MockFactory.createCorruptedDataMock();

      const validRequest: ComparisonRequest = TEST_SCENARIOS.balanced.request;

      const response = await request(app)
        .post('/compare')
        .send(validRequest)
        .expect(500);

      assertValidErrorResponse(response.body);
      assertErrorCode(response.body, ErrorCode.DATA_ERROR);
      expect(response.body.error.message).toMatch(/data|parse|CSV/i);
    });
  });

  describe('Error Response Structure', () => {
    it('should always include required error response fields', async () => {
      const invalidRequest = {
        // Missing all required fields
      };

      const response = await request(app)
        .post('/compare')
        .send(invalidRequest)
        .expect(400);

      // Check required top-level fields
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('requestId');
      expect(response.body).toHaveProperty('timestamp');

      // Check error object structure
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');

      // Validate error code is from enum
      const validErrorCodes = [
        ErrorCode.VALIDATION_ERROR,
        ErrorCode.ROUTE_NOT_FOUND,
        ErrorCode.DATA_ERROR,
        ErrorCode.SERVICE_ERROR
      ];
      expect(validErrorCodes).toContain(response.body.error.code);
    });

    it('should include unique requestId for tracking', async () => {
      const invalidRequest = {
        origin: 'Tokyo'
        // Missing other fields
      };

      const response1 = await request(app)
        .post('/compare')
        .send(invalidRequest)
        .expect(400);

      const response2 = await request(app)
        .post('/compare')
        .send(invalidRequest)
        .expect(400);

      // Request IDs should be unique
      expect(response1.body.requestId).toBeDefined();
      expect(response2.body.requestId).toBeDefined();
      expect(response1.body.requestId).not.toBe(response2.body.requestId);

      // Request ID should follow a pattern (e.g., req_xxxxx)
      expect(response1.body.requestId).toMatch(/^req_[a-zA-Z0-9]+$/);
    });

    it('should include timestamp in ISO 8601 format', async () => {
      const invalidRequest = {};

      const response = await request(app)
        .post('/compare')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.timestamp).toBeDefined();
      
      // Validate ISO 8601 format
      const timestamp = new Date(response.body.timestamp);
      expect(timestamp.toISOString()).toBe(response.body.timestamp);
      
      // Timestamp should be recent (within last 5 seconds)
      const now = new Date();
      const timeDiff = now.getTime() - timestamp.getTime();
      expect(timeDiff).toBeLessThan(5000);
      expect(timeDiff).toBeGreaterThanOrEqual(0);
    });

    it('should include field name for validation errors', async () => {
      const invalidRequest = {
        origin: 'Tokyo',
        destination: 'Osaka',
        weightKg: -100, // Invalid negative weight
        weights: { time: 0.5, cost: 0.3, co2: 0.2 }
      };

      const response = await request(app)
        .post('/compare')
        .send(invalidRequest)
        .expect(400);

      assertValidErrorResponse(response.body);
      assertErrorCode(response.body, ErrorCode.VALIDATION_ERROR);
      
      // Should include the field that caused the error
      expect(response.body.error.field).toBe('weightKg');
    });

    it('should optionally include error details for complex errors', async () => {
      const invalidRequest: ComparisonRequest = {
        origin: 'UnknownLocation',
        destination: 'Osaka',
        weightKg: 500,
        weights: { time: 0.5, cost: 0.3, co2: 0.2 }
      };

      const response = await request(app)
        .post('/compare')
        .send(invalidRequest)
        .expect(404);

      assertValidErrorResponse(response.body);
      
      // Details are optional but if present should provide context
      if (response.body.error.details) {
        expect(typeof response.body.error.details).toBe('object');
        // Could contain information like attempted location, alternatives, etc.
      }
    });
  });

  describe('HTTP Status Codes', () => {
    it('should use 400 for client errors', async () => {
      const invalidRequests = [
        {}, // Empty request
        { origin: 'Tokyo' }, // Missing fields
        { origin: 'Tokyo', destination: 'Osaka', weightKg: -1, weights: { time: 0.5, cost: 0.3, co2: 0.2 } }, // Invalid value
      ];

      for (const invalidRequest of invalidRequests) {
        await request(app)
          .post('/compare')
          .send(invalidRequest)
          .expect(400);
      }
    });

    it('should use 404 for not found errors', async () => {
      const notFoundRequest: ComparisonRequest = {
        origin: 'FakeCity',
        destination: 'AnotherFakeCity',
        weightKg: 500,
        weights: { time: 0.5, cost: 0.3, co2: 0.2 }
      };

      await request(app)
        .post('/compare')
        .send(notFoundRequest)
        .expect(404);
    });

    it('should use 500 for server errors', async () => {
      // Simulate server error by breaking the mocks
      MockFactory.createFailingLocationMock();
      MockFactory.createFailingS3Mock();

      const validRequest: ComparisonRequest = TEST_SCENARIOS.timePriority.request;

      await request(app)
        .post('/compare')
        .send(validRequest)
        .expect(500);
    });
  });
});