import * as fs from 'fs';
import { assertNotDevDatabase } from './assert-not-dev-db';
import { TEST_DB_URL_FILE } from './test-db-url-file';

/**
 * Jest setupFiles hook: runs in every worker process before the spec (and thus
 * before `AppModule`) is imported. Reads the ephemeral database URL produced by
 * globalSetup, points the application at it, and guards against accidentally
 * running E2E against the development database.
 */
if (!fs.existsSync(TEST_DB_URL_FILE)) {
  throw new Error(
    `E2E setup error: expected the Testcontainers database URL at ` +
      `"${TEST_DB_URL_FILE}" but it was not found. Did Jest globalSetup run?`,
  );
}

const databaseUrl = fs.readFileSync(TEST_DB_URL_FILE, 'utf8').trim();

assertNotDevDatabase(databaseUrl);

process.env.DATABASE_URL = databaseUrl;
