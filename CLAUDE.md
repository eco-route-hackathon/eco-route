# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- **Frontend development**: `cd frontend && npm install && npm run dev` - Run Vite dev server for React frontend
- **Backend development**: `cd backend && npm install && npm run dev` - Run ts-node/local server for Node.js backend
- **Build**: `npm run build` in each package directory - Output to `dist/`
- **Test**: `npm test` in each package - Uses Vitest/Jest
- **Lint**: `npm run lint` - ESLint with @typescript-eslint
- **Format**: `npm run format` - Prettier formatting

### Custom Feature Commands
- **Create new feature**: `scripts/create-new-feature.sh --json "feature description"` - Creates spec and feature branch
- **Plan feature**: `scripts/setup-plan.sh --json` - Set up implementation plan
- **Check prerequisites**: `scripts/check-task-prerequisites.sh --json` - Verify task prerequisites

## Architecture

This is an eco-route MVP project comparing truck vs truck+ship transportation with time/cost/CO2 metrics.

### Core Structure
- **frontend/**: React + Vite application that provides form input and displays comparison results
- **backend/**: Node.js 22 + TypeScript API implementing `/compare` endpoint (Express locally, Lambda in production)
- **data/**: CSV datasets (modes.csv, links.csv, locations.csv) for transportation calculations
- **infra/**: Minimal IaC setup for API Gateway, Lambda, S3 read permissions

### API Contract
**POST /compare**
- Input: origin, destination, weight_kg, weights (time/cost/co2 priorities)
- Output: candidates array with time_h, cost_jpy, co2_kg for each plan, plus recommendation

### Calculation Logic
- **Score formula**: `score = α*time_h + β*cost_jpy + γ*co2_kg` (minimum is recommended)
- **Truck route**: Uses Amazon Location Routes API for distance/time
- **Truck+ship route**: Combines truck legs to ports with ship links from links.csv

### AWS Integration
- Amazon Location Service Routes API for distance/time calculations
- Lambda runtime: nodejs22.x
- S3 for CSV data storage
- API Gateway + Lambda for backend
- Amplify Hosting for frontend deployment

## Development Guidelines

### Code Standards
- TypeScript strict mode
- 2 space indentation, semicolons, single quotes
- File naming: kebab-case (e.g., `calc-routes.ts`), React components in PascalCase
- Variables/functions: camelCase, Types/interfaces: PascalCase

### Testing Requirements
- Test files: `*.test.ts[x]` alongside code or in `src/__tests__/`
- Priority: calculation and CSV parsing unit tests
- AWS SDK calls should be mocked
- Frontend: Testing Library + Vitest
- Backend: Vitest/Jest + supertest
- Target: 80%+ coverage for critical paths, at least 1 E2E test for `/compare`

### Environment Variables
Required for backend:
- `AWS_REGION`: AWS region for services
- `ROUTE_CALCULATOR_NAME`: Amazon Location route calculator name
- `S3_BUCKET`: S3 bucket name for CSV data

### Commit Convention
Use Conventional Commits:
- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation
- `chore:` maintenance
- `test:` test additions/changes
- `refactor:` code refactoring

Example: `feat(backend): add compare handler`