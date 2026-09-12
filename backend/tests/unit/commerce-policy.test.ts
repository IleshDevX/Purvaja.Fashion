import { describe, expect, it } from 'vitest';
import { commercePolicy, isWithinReturnWindow } from '@purvaja/commerce-policy';

describe('shared return policy', () => {
  it('accepts only a known, nonfuture delivery within the configured interval', () => {
    const now = Date.now();
    expect(isWithinReturnWindow(null, now)).toBe(false);
    expect(isWithinReturnWindow('invalid', now)).toBe(false);
    expect(isWithinReturnWindow(new Date(now + 1), now)).toBe(false);
    expect(isWithinReturnWindow(new Date(now - commercePolicy.returnWindowDays * 86400000), now)).toBe(true);
    expect(isWithinReturnWindow(new Date(now - commercePolicy.returnWindowDays * 86400000 - 1), now)).toBe(false);
  });
});
