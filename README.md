# BasketBallStats App

Backend API for the HoopAnalytics Basketball SaaS platform.

## Goals
- Capture basketball match actions in real time.
- Store data in a model optimized for statistics and analytics.
- Broadcast relevant updates/events to connected clients.

For project-wide architecture context, read `agents/Agent.md`.

## Local development
1. Copy environment template:
   - `cp .env.example .env`
2. Install dependencies:
   - `npm install`
3. Generate the Prisma client and apply migrations:
   - `npm run prisma:migrate`
4. Run in dev mode:
   - `npm run start:dev`

## Database (Prisma + PostgreSQL)
- Schema: `prisma/schema.prisma` (base models: `Club` -> `Team` -> `Player`).
- Generate client: `npm run prisma:generate`
- Create/apply a migration: `npm run prisma:migrate`
- Apply migrations in CI/prod: `npm run prisma:deploy`
- Explore data: `npm run prisma:studio`

The `DATABASE_URL` in `.env` points to `localhost:5432` for local development.

## Quality checks
- Build: `npm run build`
- Unit tests: `npm run test`
- E2E tests: `npm run test:e2e`
- Lint: `npm run lint`

## Docker
- Start API + Postgres:
  - `docker compose up --build`
- The Postgres container is published on host port `5433` (override with `POSTGRES_HOST_PORT`)
  to avoid clashing with a local PostgreSQL instance on `5432`. Inside the Compose network the
  API reaches the database at `postgres:5432`.