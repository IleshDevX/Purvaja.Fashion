import { spawn } from 'node:child_process';
import { Client } from 'pg';

export interface PostgresTarget {
  identity: string;
  database: string;
  clientEnvironment: NodeJS.ProcessEnv;
}

export function parsePostgresTarget(rawUrl: string): PostgresTarget {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error('Database target must be a valid PostgreSQL URL.');
  }
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
    throw new Error('Database target must use postgres:// or postgresql://.');
  }

  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
  if (!parsed.hostname || !database) {
    throw new Error('Database target must include a hostname and database name.');
  }

  const sslMode = parsed.searchParams.get('sslmode');
  return {
    identity: `${parsed.hostname.toLowerCase()}:${parsed.port || '5432'}/${database}`,
    database,
    clientEnvironment: {
      PGHOST: parsed.hostname,
      PGPORT: parsed.port || '5432',
      PGDATABASE: database,
      PGUSER: decodeURIComponent(parsed.username),
      PGPASSWORD: decodeURIComponent(parsed.password),
      ...(sslMode ? { PGSSLMODE: sslMode } : {}),
      ...(parsed.searchParams.get('sslrootcert') ? { PGSSLROOTCERT: parsed.searchParams.get('sslrootcert')! } : {}),
    },
  };
}

export function assertRecoveryTarget(
  sourceUrl: string,
  recoveryUrl: string,
  targetEnvironment: string | undefined,
  confirmation: string | undefined,
): PostgresTarget {
  if (targetEnvironment !== 'recovery') {
    throw new Error('RECOVERY_TARGET_ENV must equal recovery.');
  }
  if (confirmation !== 'RESTORE_DISPOSABLE_DATABASE') {
    throw new Error('RECOVERY_CONFIRM_REPLACE must equal RESTORE_DISPOSABLE_DATABASE.');
  }

  const source = parsePostgresTarget(sourceUrl);
  const recovery = parsePostgresTarget(recoveryUrl);
  if (source.identity === recovery.identity) {
    throw new Error('Recovery drill target must be different from DATABASE_URL.');
  }
  return recovery;
}

/** Fail closed on aliases or unavailable identity; never restore into populated data. */
export async function verifyRecoveryDestination(sourceUrl: string, recoveryUrl: string): Promise<void> {
  const source = new Client({ connectionString: sourceUrl, connectionTimeoutMillis: 10_000 });
  const recovery = new Client({ connectionString: recoveryUrl, connectionTimeoutMillis: 10_000 });
  try {
    await source.connect();
    await recovery.connect();
    const identitySql = `SELECT system_identifier::text AS cluster,
      (SELECT oid::text FROM pg_database WHERE datname=current_database()) AS database
      FROM pg_control_system()`;
    const a = (await source.query<{ cluster: string; database: string }>(identitySql)).rows[0];
    const b = (await recovery.query<{ cluster: string; database: string }>(identitySql)).rows[0];
    if (!a?.cluster || !b?.cluster || !a.database || !b.database) throw new Error('Database identity unavailable.');
    if (a.cluster === b.cluster && a.database === b.database) throw new Error('Recovery destination is an alias of the source database.');
    const objects = await recovery.query<{ count: number }>(`SELECT count(*)::int AS count FROM pg_class c
      JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname <> 'information_schema'
      AND c.relkind IN ('r','p','v','m','S','f')
      AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid='pg_class'::regclass AND d.objid=c.oid AND d.deptype='e')`);
    if (objects.rows[0]?.count !== 0) throw new Error('Recovery requires a new empty destination database; existing objects cannot be replaced.');
  } catch (error) {
    // Native connection errors can contain endpoint details. Preserve safe guard
    // diagnostics only; callers must never invoke restore after this rejects.
    if (error instanceof Error && /^(Recovery |Database identity)/.test(error.message)) throw error;
    throw new Error('Recovery database identity verification failed; no restore is permitted.');
  } finally {
    await Promise.allSettled([source.end(), recovery.end()]);
  }
}

export async function runPostgresTool(
  executable: string,
  args: string[],
  clientEnvironment: NodeJS.ProcessEnv,
  extraEnvironment: NodeJS.ProcessEnv = {},
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(executable, args, {
      env: { ...process.env, ...clientEnvironment, ...extraEnvironment },
      stdio: 'inherit',
      windowsHide: true,
    });
    child.once('error', reject);
    child.once('exit', code => {
      if (code === 0) resolve();
      else reject(new Error(`${executable} exited with status ${code ?? 'unknown'}.`));
    });
  });
}
