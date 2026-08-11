import * as fs from 'fs';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { TEST_DB_URL_FILE } from './test-db-url-file';

/**
 * Jest globalTeardown: stop the ephemeral PostgreSQL container started in
 * globalSetup and clean up the temporary database-URL file.
 */
export default async function globalTeardown(): Promise<void> {
  const container = (
    globalThis as { __PG_CONTAINER__?: StartedPostgreSqlContainer }
  ).__PG_CONTAINER__;

  if (container) {
    await container.stop();
  }

  if (fs.existsSync(TEST_DB_URL_FILE)) {
    fs.rmSync(TEST_DB_URL_FILE, { force: true });
  }
}
