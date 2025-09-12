# Test Implementation Guidelines

## ⚠️ CRITICAL: Read This Before Writing Any Test

This document ensures **ALL tests share the same assumptions and implementation approach**.
Failure to follow these guidelines will result in inconsistent implementations.

## 🚫 Absolute Rules (DO NOT VIOLATE)

1. **NO Authentication in MVP**
   - Do NOT add any authentication mechanism
   - Do NOT add auth headers
   - Do NOT create auth middleware
   - MVP has NO authentication, period.

2. **Single Data Source**
   - Use ONLY CSV files
   - Do NOT add database connections
   - Do NOT create ORM models
   - Do NOT use Redis/cache layers

3. **Single External Service**
   - Use ONLY Amazon Location Service for routes
   - Do NOT add Google Maps API
   - Do NOT add OpenStreetMap
   - Do NOT add other geocoding services

4. **Fixed Configuration**
   - Use ONLY `TEST_CONFIG` from `./setup/test-config.ts`
   - Do NOT modify TEST_CONFIG
   - Do NOT create alternative configs
   - Do NOT override config values

5. **Consistent Mocking**
   - Create mocks ONLY through `MockFactory`
   - Do NOT create mocks directly
   - Do NOT use different mock libraries
   - Do NOT change mock responses

## ✅ Required Imports (Every Test File)

```typescript
// MANDATORY imports for ALL test files
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TEST_CONFIG } from '../setup/test-config';
import { MockFactory } from '../setup/mock-factory';
import { TEST_DATA, TEST_SCENARIOS } from '../setup/test-data';
import { 
  assertValidComparisonResult,
  assertValidErrorResponse,
  assertNoAuthentication 
} from '../setup/assertions';
```

## 📁 File Structure

```
app/backend/tests/
├── setup/                  # Shared utilities (DO NOT MODIFY)
│   ├── test-config.ts     # Single source of truth
│   ├── mock-factory.ts    # All mocks created here
│   ├── test-data.ts       # Standard test data
│   └── assertions.ts      # Common assertions
├── contract/              # API contract tests
│   ├── compare.test.ts    # T007
│   └── errors.test.ts     # T008
├── integration/           # End-to-end scenarios
│   ├── time-priority.test.ts    # T009
│   ├── co2-priority.test.ts     # T010
│   └── balanced-weights.test.ts # T011
└── services/              # Service unit tests
    ├── route-calculator.test.ts  # T012
    ├── csv-loader.test.ts        # T013
    └── score-optimizer.test.ts   # T014
```

## 🔄 Test Lifecycle Pattern

Every test MUST follow this pattern:

```typescript
describe('Test Suite Name', () => {
  // 1. Setup mocks using MockFactory
  const locationMock = MockFactory.createLocationMock();
  const s3Mock = MockFactory.createS3Mock();
  
  // 2. Reset before each test
  beforeEach(() => {
    MockFactory.resetAllMocks();
    locationMock.reset();
    s3Mock.reset();
  });
  
  // 3. Use TEST_DATA for inputs
  it('should do something', async () => {
    const request = MockFactory.createValidRequest();
    // or
    const scenario = TEST_SCENARIOS.timePriority;
    
    // 4. Use common assertions
    assertValidComparisonResult(result);
    assertNoAuthentication(headers);
  });
});
```

## 📊 Data Consistency Rules

### Input Data
- Origin: Always use 'Tokyo' as default
- Destination: Always use 'Osaka' as default
- Weight: Always use 500kg as default
- Weights: Always use { time: 0.33, cost: 0.33, co2: 0.34 } as default

### Expected Results
- Tokyo to Osaka truck distance: 520km
- Tokyo to Osaka truck time: 7.2 hours
- Tokyo to Osaka truck cost: 26,000 JPY
- Tokyo to Osaka ship route: via TokyoPort and OsakaPort

### CSV Data
- Use ONLY the data defined in `test-data.ts`
- Do NOT add new cities/ports
- Do NOT change mode coefficients
- Do NOT add new transport modes

## 🧪 Test Categories

### Contract Tests (T007-T008)
- Validate API contract from OpenAPI spec
- Check response structure
- Verify error formats
- NO business logic testing

### Integration Tests (T009-T011)
- Test complete scenarios
- Use TEST_SCENARIOS data
- Verify recommendations
- Check end-to-end flow

### Service Tests (T012-T014)
- Test individual services
- Mock external dependencies
- Use MockFactory for all mocks
- Focus on single responsibility

## ❌ Common Mistakes to Avoid

### Mistake 1: Adding Authentication
```typescript
// ❌ WRONG - No auth in MVP
headers: {
  'Authorization': 'Bearer token'
}

// ✅ CORRECT - No auth headers
headers: TEST_CONFIG.api.headers
```

### Mistake 2: Direct Mocking
```typescript
// ❌ WRONG - Direct mock creation
const mock = jest.fn().mockResolvedValue({...});

// ✅ CORRECT - Use MockFactory
const mock = MockFactory.createLocationMock();
```

### Mistake 3: Custom Test Data
```typescript
// ❌ WRONG - Creating new test data
const myRequest = {
  origin: 'Kyoto',
  destination: 'Hiroshima'
};

// ✅ CORRECT - Use TEST_DATA
const request = TEST_SCENARIOS.timePriority.request;
```

### Mistake 4: Database Usage
```typescript
// ❌ WRONG - No database in MVP
import { PrismaClient } from '@prisma/client';

// ✅ CORRECT - CSV only
import { CsvDataLoader } from '../services/CsvDataLoader';
```

## 📝 Checklist Before Committing

Before committing any test file, verify:

- [ ] Uses TEST_CONFIG for all configuration
- [ ] Uses MockFactory for all mocks
- [ ] Uses TEST_DATA for test inputs
- [ ] Uses common assertions from assertions.ts
- [ ] NO authentication code present
- [ ] NO database connections
- [ ] NO external services besides AWS Location
- [ ] Follows the standard test lifecycle pattern
- [ ] Imports from shared-types.ts for types

## 🚨 If You're Unsure

If you're unsure about any implementation detail:

1. Check existing tests in the same category
2. Refer to TEST_CONFIG for the correct approach
3. Use MockFactory methods instead of creating custom solutions
4. Stick to TEST_DATA instead of creating new scenarios

Remember: **Consistency is more important than perfection**. 
A slightly suboptimal but consistent approach is better than multiple different "optimal" approaches.

## 📚 Reference Order

When implementing tests, follow this order:

1. Read this document completely
2. Review test-config.ts
3. Review mock-factory.ts
4. Review test-data.ts
5. Review assertions.ts
6. Look at OpenAPI spec for contract details
7. Start implementing your test

---

**Last Updated**: 2025-09-12
**Version**: 1.0.0
**Maintainer**: Eco-Route Team

⚠️ **This document is the single source of truth for test implementation. Any deviation requires team approval.**