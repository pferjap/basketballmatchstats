/**
 * Safety guard: make sure E2E tests never run against the local development
 * database (`basketball`). E2E specs create and delete SUPER_ADMIN users, which
 * would otherwise pollute the dev DB and block the application setup/init flow.
 *
 * The Testcontainers-backed database uses a different database name
 * (`basketball_test`), so any run that still points at `basketball` means the
 * isolation wiring did not take effect and we must fail fast.
 */
const FORBIDDEN_DATABASE_NAMES = new Set(['basketball']);

export function assertNotDevDatabase(databaseUrl: string | undefined): void {
  if (!databaseUrl) {
    throw new Error(
      'E2E setup error: DATABASE_URL is not set. The Testcontainers global ' +
        'setup should have provided an ephemeral database URL.',
    );
  }

  let databaseName: string;
  try {
    const parsed = new URL(databaseUrl);
    databaseName = parsed.pathname.replace(/^\//, '').split('?')[0];
  } catch {
    throw new Error(
      `E2E setup error: DATABASE_URL is not a valid URL: "${databaseUrl}".`,
    );
  }

  if (FORBIDDEN_DATABASE_NAMES.has(databaseName)) {
    throw new Error(
      `E2E setup aborted: DATABASE_URL points at the development database ` +
        `"${databaseName}". E2E tests must run against an isolated ` +
        `Testcontainers database to avoid polluting local data. ` +
        `Check the Jest globalSetup/setupFiles wiring.`,
    );
  }
}
