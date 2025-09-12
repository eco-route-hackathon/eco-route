# Implementation Plan: Eco-Route MVP - 輸送経路比較システム

**Branch**: `001-handoff-md-mvp` | **Date**: 2025-09-12 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-handoff-md-mvp/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → Feature spec loaded successfully
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Project Type: web (frontend+backend) detected
   → Structure Decision: Option 2 (Web application)
3. Evaluate Constitution Check section below
   → Following simplified MVP approach, minimal complexity
   → Update Progress Tracking: Initial Constitution Check
4. Execute Phase 0 → research.md
   → Research AWS Location Service, CSV data handling, optimization algorithms
5. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md
6. Re-evaluate Constitution Check section
   → Design follows simplicity principles
   → Update Progress Tracking: Post-Design Constitution Check
7. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
8. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
国内向け輸送経路比較システムのMVP実装。トラック単独輸送とトラック+内航船の組み合わせ輸送を時間・コスト・CO2排出量の観点から比較し、重み付けに基づく最適案を推奨する。AWS Location Service Routes APIで距離計算、オープンデータの内航海運・貨物自動車データを活用。

## Technical Context
**Language/Version**: TypeScript 5.x / Node.js 22 LTS  
**Primary Dependencies**: 
  - Backend: Express.js, AWS SDK v3 (@aws-sdk/client-location, @aws-sdk/client-s3)
  - Frontend: React 18, Vite, Axios
**Storage**: S3 (CSV data), Amazon Location Service (route calculations)  
**Testing**: Vitest (backend/frontend), Supertest (API tests)  
**Target Platform**: AWS Lambda (backend), Amplify Hosting (frontend)
**Project Type**: web - Frontend (React) + Backend (Node.js/Lambda)  
**Performance Goals**: 
  - API response time < 2s for route comparison
  - Frontend load time < 3s
  - Support 100 concurrent users
**Constraints**: 
  - Must use AWS services (mandatory requirement)
  - Must use オープンデータ directory data (mandatory requirement)
  - MVP scope: truck and truck+ship modes only
**Scale/Scope**: 
  - MVP: 3+ test cases
  - Initial deployment: 100 users
  - Data: ~10 port pairs, ~50 city pairs

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Simplicity**:
- Projects: 3 (frontend, backend, infra)
- Using framework directly? Yes (Express, React without wrappers)
- Single data model? Yes (shared types between frontend/backend)
- Avoiding patterns? Yes (direct service calls, no Repository pattern)

**Architecture**:
- EVERY feature as library? Core calculation logic as library
- Libraries listed: 
  - route-calculator: Calculate routes and emissions
  - csv-parser: Parse open data CSV files
  - score-optimizer: Calculate weighted scores
- CLI per library: Each library has CLI for testing
- Library docs: README.md format planned

**Testing (NON-NEGOTIABLE)**:
- RED-GREEN-Refactor cycle enforced? Yes
- Git commits show tests before implementation? Yes
- Order: Contract→Integration→E2E→Unit strictly followed? Yes
- Real dependencies used? AWS services via LocalStack for testing
- Integration tests for: API contracts, CSV parsing, AWS integrations
- FORBIDDEN: Implementation before test, skipping RED phase

**Observability**:
- Structured logging included? Yes (Winston for backend)
- Frontend logs → backend? Console logs with error reporting
- Error context sufficient? Request IDs, stack traces, user context

**Versioning**:
- Version number assigned? 0.1.0 (MVP)
- BUILD increments on every change? Yes, CI/CD pipeline
- Breaking changes handled? N/A for MVP

## Project Structure

### Documentation (this feature)
```
specs/001-handoff-md-mvp/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
# Option 2: Web application (SELECTED)
backend/
├── src/
│   ├── models/
│   │   ├── TransportPlan.ts
│   │   ├── Location.ts
│   │   └── ComparisonRequest.ts
│   ├── services/
│   │   ├── RouteCalculator.ts
│   │   ├── CsvDataLoader.ts
│   │   └── ScoreOptimizer.ts
│   ├── api/
│   │   └── compareHandler.ts
│   └── lib/
│       └── shared-types.ts
└── tests/
    ├── contract/
    ├── integration/
    └── unit/

frontend/
├── src/
│   ├── components/
│   │   ├── ComparisonForm.tsx
│   │   └── ResultsTable.tsx
│   ├── pages/
│   │   └── ComparePage.tsx
│   └── services/
│       └── ApiClient.ts
└── tests/

data/
├── modes.csv
├── links.csv
└── locations.csv

infra/
├── cdk/
│   └── eco-route-stack.ts
└── openapi.yaml
```

**Structure Decision**: Option 2 (Web application) - Frontend + Backend separation

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context**:
   - Amazon Location Service Routes API best practices
   - CSV data structure from オープンデータ
   - Optimal scoring algorithm for multi-criteria optimization
   - Lambda cold start optimization
   - S3 data caching strategies

2. **Generate and dispatch research agents**:
   ```
   Task: "Research Amazon Location Service Routes API for distance/time calculation"
   Task: "Analyze オープンデータ CSV format for ports and shipping routes"
   Task: "Research weighted scoring algorithms for transport optimization"
   Task: "Find Lambda performance optimization patterns for Node.js 22"
   Task: "Research S3 caching strategies for static CSV data"
   ```

3. **Consolidate findings** in `research.md`:
   - Decision: Amazon Location Service with HERE/Esri provider
   - Rationale: Most accurate for Japan domestic routes
   - Alternatives considered: Google Maps API (cost), OSM (accuracy)

**Output**: research.md with all technical decisions documented

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - TransportPlan: mode, time_h, cost_jpy, co2_kg
   - Location: id, name, lat, lon, type (city/port)
   - TransportMode: mode, cost_per_km, co2_kg_per_ton_km, avg_speed_kmph
   - TransportLeg: from, to, mode, distance_km, time_hours
   - ComparisonRequest: origin, destination, weight_kg, weights
   - ComparisonResult: candidates[], recommendation, rationale

2. **Generate API contracts** → `/contracts/`:
   - POST /compare endpoint (OpenAPI 3.1)
   - Request/Response schemas
   - Error response formats

3. **Generate contract tests**:
   - Test POST /compare with valid data
   - Test validation errors
   - Test edge cases (missing routes, invalid weights)

4. **Extract test scenarios** from user stories:
   - Tokyo→Osaka time priority test
   - Tokyo→Osaka CO2 priority test
   - Balanced weights test

5. **Update CLAUDE.md incrementally**:
   - Add AWS Location Service setup
   - Add CSV data loading instructions
   - Add test running commands

**Output**: data-model.md, /contracts/openapi.yaml, failing tests, quickstart.md, CLAUDE.md updates

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs:
  - T001-T003: Set up project structure [P]
  - T004-T006: Create data models [P]
  - T007-T009: Implement CSV loaders [P]
  - T010-T012: AWS Location Service integration
  - T013-T015: Score calculation logic
  - T016-T018: API endpoint implementation
  - T019-T021: Frontend components [P]
  - T022-T024: Integration tests
  - T025-T027: Infrastructure setup

**Ordering Strategy**:
- TDD order: Contract tests → Implementation → Integration tests
- Dependency order: Models → Services → API → Frontend
- Mark [P] for parallel execution where possible

**Estimated Output**: 25-30 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

No violations - following simplified MVP approach.

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (none)

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*