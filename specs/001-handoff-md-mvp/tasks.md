# Tasks: Eco-Route MVP - 輸送経路比較システム

**Input**: Design documents from `/specs/001-handoff-md-mvp/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → Tech stack: TypeScript 5.x, Node.js 22, React 18, AWS SDK v3
   → Structure: Web app (app/frontend/, app/backend/, app/infra/)
2. Load optional design documents:
   → data-model.md: 8 entities identified
   → contracts/openapi.yaml: POST /compare endpoint
   → research.md: AWS Location Service, CSV parsing strategies
3. Generate tasks by category:
   → Setup: project init, dependencies, linting
   → Tests: contract tests, integration tests
   → Core: models, services, CLI commands
   → Integration: AWS services, middleware, logging
   → Polish: unit tests, performance, docs
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Same file = sequential (no [P])
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001-T035)
6. Generate dependency graph
7. Create parallel execution examples
8. Validate task completeness:
   → All contracts have tests? ✓
   → All entities have models? ✓
   → All endpoints implemented? ✓
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Backend**: `app/backend/src/`, `app/backend/tests/`
- **Frontend**: `app/frontend/src/`, `app/frontend/tests/`
- **Data**: `app/data/` at repository root
- **Infrastructure**: `app/infra/cdk/`

## Phase 3.1: Setup
- [ ] T001 Create project structure with app/frontend/, app/backend/, app/data/, app/infra/ directories
- [ ] T002 [P] Initialize backend with TypeScript, Express, AWS SDK v3 in app/backend/
- [ ] T003 [P] Initialize frontend with React 18, Vite, Axios in app/frontend/
- [ ] T004 [P] Set up TypeScript config with strict mode in app/backend/tsconfig.json and frontend/tsconfig.json
- [ ] T005 [P] Configure ESLint and Prettier for both frontend and backend
- [ ] T006 Create shared types file at app/backend/src/lib/shared-types.ts with all interfaces from data-model.md

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

### Contract Tests
- [ ] T007 [P] Create contract test for POST /compare endpoint in app/backend/tests/contract/compare.test.ts - must fail initially
- [ ] T008 [P] Create contract test for error responses (400, 404, 500) in app/backend/tests/contract/errors.test.ts

### Integration Tests
- [ ] T009 [P] Create integration test for Tokyo→Osaka time priority scenario in app/backend/tests/integration/time-priority.test.ts
- [ ] T010 [P] Create integration test for Tokyo→Osaka CO2 priority scenario in app/backend/tests/integration/co2-priority.test.ts
- [ ] T011 [P] Create integration test for balanced weights scenario in app/backend/tests/integration/balanced-weights.test.ts

### Service Tests
- [ ] T012 [P] Create test for RouteCalculator service with AWS Location mock in app/backend/tests/services/route-calculator.test.ts
- [ ] T013 [P] Create test for CsvDataLoader service with S3 mock in app/backend/tests/services/csv-loader.test.ts
- [ ] T014 [P] Create test for ScoreOptimizer service in app/backend/tests/services/score-optimizer.test.ts

## Phase 3.3: Core Implementation

### Data Models
- [ ] T015 [P] Implement Location, LocationType models in app/backend/src/models/Location.ts
- [ ] T016 [P] Implement TransportMode, ModeType models in app/backend/src/models/TransportMode.ts
- [ ] T017 [P] Implement TransportLeg model in app/backend/src/models/TransportLeg.ts
- [ ] T018 [P] Implement TransportPlan, PlanType models in app/backend/src/models/TransportPlan.ts
- [ ] T019 [P] Implement ComparisonRequest, WeightFactors models in app/backend/src/models/ComparisonRequest.ts
- [ ] T020 [P] Implement ComparisonResult, RouteRationale models in app/backend/src/models/ComparisonResult.ts

### Services
- [ ] T021 Implement CsvDataLoader service to load CSV from S3/local in app/backend/src/services/CsvDataLoader.ts
- [ ] T022 Implement RouteCalculator service with Amazon Location integration in app/backend/src/services/RouteCalculator.ts
- [ ] T023 Implement ScoreOptimizer service with weighted scoring in app/backend/src/services/ScoreOptimizer.ts

### API Implementation
- [ ] T024 Implement POST /compare handler in app/backend/src/api/compareHandler.ts
- [ ] T025 Set up Express server with middleware in app/backend/src/server.ts
- [ ] T026 Implement Lambda handler wrapper in app/backend/src/handler.ts

### Frontend Components
- [ ] T027 [P] Create ComparisonForm component with validation in app/frontend/src/components/ComparisonForm.tsx
- [ ] T028 [P] Create ResultsTable component for displaying results in app/frontend/src/components/ResultsTable.tsx
- [ ] T029 Create ComparePage container component in app/frontend/src/pages/ComparePage.tsx
- [ ] T030 [P] Implement ApiClient service for backend communication in app/frontend/src/services/ApiClient.ts

## Phase 3.4: Integration & Data

### CSV Data Setup
- [ ] T031 Create initial CSV files (modes.csv, locations.csv, links.csv) in app/data/ directory with sample data
- [ ] T032 Parse and integrate オープンデータ from 内航海運業データ into links.csv

### AWS Integration
- [ ] T033 Create CDK stack for API Gateway + Lambda in app/infra/cdk/eco-route-stack.ts
- [ ] T034 Configure S3 bucket and upload CSV data scripts in app/infra/scripts/

## Phase 3.5: Polish & Documentation
- [ ] T035 Run all tests and ensure 80%+ coverage for critical paths

## Dependency Order
```
Setup (T001-T006) → Tests (T007-T014) → Models (T015-T020) → Services (T021-T023) → 
API (T024-T026) + Frontend (T027-T030) → Integration (T031-T034) → Polish (T035)
```

## Parallel Execution Examples

### Batch 1: Initial Setup (can run in parallel)
```bash
# Terminal 1
Task T002: cd backend && npm init -y && npm install express @aws-sdk/client-location @aws-sdk/client-s3 typescript @types/node @types/express

# Terminal 2  
Task T003: cd frontend && npm create vite@latest . -- --template react-ts && npm install axios

# Terminal 3
Task T004-T005: Setup TypeScript and linting configs
```

### Batch 2: All Tests (can run in parallel after T006)
```bash
# Can execute T007-T014 in parallel as they're independent test files
Task T007-T014: Write all test files simultaneously
```

### Batch 3: All Models (can run in parallel after tests)
```bash
# Can execute T015-T020 in parallel as they're independent model files
Task T015-T020: Implement all model files simultaneously
```

### Batch 4: Frontend Components (can run in parallel)
```bash
# Can execute T027, T028, T030 in parallel
Task T027: ComparisonForm component
Task T028: ResultsTable component  
Task T030: ApiClient service
```

## Task Validation Checklist
- [x] All entities from data-model.md have corresponding model tasks (T015-T020)
- [x] API endpoint from contracts/openapi.yaml has implementation task (T024)
- [x] All test scenarios from quickstart.md have integration tests (T009-T011)
- [x] TDD enforced: Tests (T007-T014) before implementation (T015-T030)
- [x] Parallel execution marked where applicable with [P]
- [x] Dependencies clearly defined in execution order

## Notes
- Each task should create a git commit following conventional commits format
- Run tests after each implementation to ensure RED→GREEN→REFACTOR cycle
- Use environment variables from quickstart.md for configuration
- Reference research.md for technical decisions during implementation