/**
 * Unified Test Configuration
 * This file ensures all tests share the same assumptions and configurations.
 * DO NOT modify this file without updating all tests.
 */

export const TEST_CONFIG = {
  // Authentication Configuration
  // IMPORTANT: MVP has NO authentication. Keep it this way for consistency.
  authentication: {
    enabled: false,
    method: null as null | 'api-key' | 'jwt' | 'oauth', // Future: only ONE method
    headers: {} // No auth headers in MVP
  },

  // API Configuration
  // Based on OpenAPI specification
  api: {
    baseUrl: 'http://localhost:3000',
    version: 'v1',
    endpoints: {
      compare: '/compare' // Single endpoint for MVP
    },
    headers: {
      'Content-Type': 'application/json'
    },
    timeout: 5000 // 5 seconds timeout for tests
  },

  // AWS Configuration
  // Using LocalStack for all tests
  aws: {
    region: 'ap-northeast-1',
    useLocalStack: true,
    localStackHost: 'localhost',
    localStackPort: 4566,
    endpoints: {
      location: 'http://localhost:4566',
      s3: 'http://localhost:4566'
    },
    credentials: {
      accessKeyId: 'test',
      secretAccessKey: 'test'
    },
    // Fixed resource names
    resources: {
      routeCalculatorName: 'eco-route-test-calculator',
      s3BucketName: 'eco-route-test-data',
      s3DataPrefix: 'latest/'
    }
  },

  // Data Source Configuration
  // IMPORTANT: Only CSV files, no database
  dataSource: {
    type: 'csv' as const, // Never change to 'database'
    location: 'local' as 'local' | 's3',
    csvFiles: {
      modes: 'modes.csv',
      locations: 'locations.csv',
      links: 'links.csv'
    }
  },

  // Test Environment
  environment: {
    nodeEnv: 'test',
    port: 3001, // Different from dev port
    logLevel: 'error', // Minimal logging in tests
    useMocks: true
  },

  // Response Validation
  validation: {
    maxResponseTime: 2000, // 2 seconds max
    requiredResponseFields: ['candidates', 'recommendation', 'rationale'],
    requiredCandidateFields: ['plan', 'timeH', 'costJpy', 'co2Kg'],
    errorCodes: ['VALIDATION_ERROR', 'ROUTE_NOT_FOUND', 'DATA_ERROR', 'SERVICE_ERROR']
  },

  // Test Isolation
  isolation: {
    resetMocksBeforeEach: true,
    clearCacheBeforeEach: true,
    useTransactions: false // No database transactions
  }
} as const;

// Type exports for type safety
export type TestConfig = typeof TEST_CONFIG;
export type AuthMethod = NonNullable<typeof TEST_CONFIG.authentication.method>;
export type DataSourceType = typeof TEST_CONFIG.dataSource.type;