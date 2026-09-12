import type { Page } from '@playwright/test';

// Functional scenarios wait for the document and then their semantic locators,
// rather than making authentication depend on external fonts/images finishing.
export async function reloadDocument(page: Page): Promise<void> {
  await Promise.all([
    page.waitForEvent('domcontentloaded'),
    page.evaluate(() => window.location.reload()),
  ]);
}
