import { spawn } from 'node:child_process';

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
