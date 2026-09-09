import { describe, expect, it } from 'vitest';
import { assertRecoveryTarget, parsePostgresTarget } from '../../src/scripts/postgres-recovery.js';

describe('PostgreSQL recovery safety contract', () => {
  it('keeps credentials out of the database identity and command arguments', () => {
    const target = parsePostgresTarget('postgresql://restore_user:secret-value@db.example:5433/recovery_db?sslmode=require');
    expect(target.identity).toBe('db.example:5433/recovery_db');
    expect(target.identity).not.toContain('secret-value');
    expect(target.clientEnvironment).toMatchObject({
      PGHOST: 'db.example',
      PGPORT: '5433',
      PGDATABASE: 'recovery_db',
      PGUSER: 'restore_user',
      PGPASSWORD: 'secret-value',
      PGSSLMODE: 'require',
    });
  });

  it('requires an explicitly disposable and separately identified restore target', () => {
    const source = 'postgresql://user:one@db.example:5432/purvaja?sslmode=require';
    const recovery = 'postgresql://user:two@db.example:5432/purvaja_recovery?sslmode=require';

    expect(() => assertRecoveryTarget(source, recovery, undefined, undefined)).toThrow('RECOVERY_TARGET_ENV');
    expect(() => assertRecoveryTarget(source, recovery, 'recovery', undefined)).toThrow('RECOVERY_CONFIRM_REPLACE');
    expect(() => assertRecoveryTarget(source, source, 'recovery', 'RESTORE_DISPOSABLE_DATABASE')).toThrow('must be different');
    expect(assertRecoveryTarget(source, recovery, 'recovery', 'RESTORE_DISPOSABLE_DATABASE').identity)
      .toBe('db.example:5432/purvaja_recovery');
  });
});
