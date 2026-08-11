import * as os from 'os';
import * as path from 'path';

/**
 * Location of the file used to hand the ephemeral Testcontainers database URL
 * from Jest's `globalSetup` (which runs in the parent process) to the worker
 * processes that actually execute the specs (via `setupFiles`).
 */
export const TEST_DB_URL_FILE = path.join(
  os.tmpdir(),
  'basketball-e2e-database-url',
);
