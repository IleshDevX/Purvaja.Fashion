import { verifyTestDatabase } from '../src/config/test-database.js';

process.env.NODE_ENV = 'test';
process.env.PORT = '5001';
// Explicit runner opt-in only: unit tests must not inherit application credentials.
const testUrl = process.env.TEST_DATABASE_URL;
process.env.TEST_DATABASE_URL = testUrl ?? '';
if (testUrl) await verifyTestDatabase(testUrl);
process.env.DATABASE_URL = testUrl ?? 'postgresql://unavailable:unavailable@127.0.0.1:1/unconfigured_test';
process.env.DIRECT_URL = process.env.DATABASE_URL;
