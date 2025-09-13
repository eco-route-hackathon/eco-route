/**
 * Vitest Global Setup
 * This file runs once before all tests
 */

import { beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { TEST_CONFIG } from './test-config';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.AWS_REGION = TEST_CONFIG.aws.region;
process.env.ROUTE_CALCULATOR_NAME = TEST_CONFIG.aws.resources.routeCalculatorName;
process.env.S3_BUCKET = TEST_CONFIG.aws.resources.s3BucketName;
process.env.PORT = String(TEST_CONFIG.environment.port);
process.env.LOCAL_DATA_PATH = './data'; // Use local CSV files for testing

// Global test lifecycle hooks
beforeAll(() => {
  console.log('🧪 Starting test suite with unified configuration');
  console.log(`📋 Authentication: ${TEST_CONFIG.authentication.enabled ? 'Enabled' : 'Disabled (MVP)'}`);
  console.log(`📊 Data source: ${TEST_CONFIG.dataSource.type}`);
  console.log(`☁️ AWS: ${TEST_CONFIG.aws.useLocalStack ? 'LocalStack' : 'Real AWS'}`);
});

beforeEach(() => {
  // Clear all module caches to ensure test isolation
  vi.clearAllMocks();
});

afterAll(() => {
  console.log('✅ Test suite completed');
});