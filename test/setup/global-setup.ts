import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { TEST_DB_URL_FILE } from './test-db-url-file';

/**
 * Jest globalSetup: start an ephemeral PostgreSQL container, apply Prisma
 * migrations against it, and persist its connection URL so worker processes can
 * point the application at it. This keeps E2E runs fully isolated from the local
 * development database.
 */
export default async function globalSetup(): Promise<void> {
  const container: StartedPostgreSqlContainer = await new PostgreSqlContainer(
    'postgres:16-alpine',
  )
    .withDatabase('basketball_test')
    .withUsername('postgres')
    .withPassword('postgres')
    .start();

  const databaseUrl = `${container.getConnectionUri()}?schema=public`;

  // Invoke the Prisma CLI through Node's executable (rather than the .cmd/.bin
  // shim) so migrations run identically on Windows, macOS and Linux. The CLI's
  // `exports` map blocks `require.resolve('prisma')`, so resolve its package
  // directory instead and point at its build entrypoint.
  const prismaEntry = path.join(
    path.dirname(require.resolve('prisma/package.json')),
    'build',
    'index.js',
  );

  execFileSync(process.execPath, [prismaEntry, 'migrate', 'deploy'], {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });

  fs.writeFileSync(TEST_DB_URL_FILE, databaseUrl, 'utf8');

  // Stash the container so globalTeardown (same parent process) can stop it.
  (
    globalThis as { __PG_CONTAINER__?: StartedPostgreSqlContainer }
  ).__PG_CONTAINER__ = container;
}
