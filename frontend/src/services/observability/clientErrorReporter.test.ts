import { expect, it } from 'vitest';
import { scrubTelemetryText } from './clientErrorReporter.js';

it('removes query and fragment secrets embedded in error messages and stacks', () => {
  const value = 'Failed https://shop.invalid/reset?token=secret\n at https://shop.invalid/auth#access_token=secret:1:2';
  expect(scrubTelemetryText(value)).not.toContain('secret');
  expect(scrubTelemetryText(value)).toContain('https://shop.invalid/reset');
});
