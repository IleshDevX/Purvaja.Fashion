import { expect, test, type Page, type TestInfo } from '@playwright/test';

const widths = [320, 375, 390, 768, 1024, 1280, 1440] as const;
const customerPassword = 'Phase8Browser123!';

const slug = (path: string) => path.replace(/^\//, '').replace(/[^a-z0-9]+/gi, '-') || 'home';

async function waitForApplication(page: Page) {
  await expect(page.locator('main').first()).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(100);
}

async function verifyViewport(page: Page, route: string, width: number, testInfo: TestInfo) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(route, { waitUntil: 'domcontentloaded' });
  await waitForApplication(page);
  const layout = await page.evaluate(() => {
    const root = document.documentElement;
    const offenders = [...document.querySelectorAll<HTMLElement>('body *')]
      .filter(element => {
        const style = getComputedStyle(element);
        if (style.position === 'fixed' || style.display === 'none' || style.visibility === 'hidden') return false;
        const box = element.getBoundingClientRect();
        return box.width > 0 && (box.left < -1 || box.right > root.clientWidth + 1);
      })
      .slice(0, 8)
      .map(element => ({ tag: element.tagName, className: element.className.toString().slice(0, 120), box: element.getBoundingClientRect().toJSON() }));
    return { clientWidth: root.clientWidth, scrollWidth: root.scrollWidth, offenders };
  });
  expect(layout.scrollWidth, JSON.stringify(layout)).toBeLessThanOrEqual(layout.clientWidth + 1);
  await page.screenshot({ path: testInfo.outputPath(`${slug(route)}-${width}.png`), fullPage: true });
}

async function verifyAccessibleControls(page: Page) {
  const unnamed = await page.locator('button:visible, input:visible, select:visible, textarea:visible, img:visible').evaluateAll(elements =>
    elements.flatMap(element => {
      if (element instanceof HTMLImageElement) return element.hasAttribute('alt') ? [] : ['img without alt'];
      const labelled = element.getAttribute('aria-label') || element.getAttribute('aria-labelledby') || element.getAttribute('title');
      const labels = element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement
        ? [...element.labels].map(label => label.textContent ?? '').join(' ').trim()
        : '';
      const text = element.textContent?.trim() ?? '';
      return labelled || labels || text ? [] : [`${element.tagName.toLowerCase()}#${element.id || '(no id)'} has no accessible name`];
    }),
  );
  expect(unnamed).toEqual([]);
}

async function registerCustomer(page: Page, email: string) {
  await page.goto('/auth/register');
  await page.getByLabel('First Name').fill('Phase');
  await page.getByLabel('Last Name').fill('Eight');
  await page.getByLabel('Email Address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(customerPassword);
  await page.getByLabel('Confirm Password').fill(customerPassword);
  await page.getByRole('button', { name: 'REGISTER ACCOUNT' }).click();
  await expect(page).toHaveURL(/\/account$/);
}

test('public journeys and dialogs remain usable at every required viewport', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  const catalogResponse = await page.request.get('http://localhost:5001/api/v1/products?limit=1&inStock=true');
  expect(catalogResponse.ok()).toBe(true);
  const catalog = await catalogResponse.json() as { data: { items: Array<{ id: string }> } };
  const productId = catalog.data.items[0]?.id;
  expect(productId).toBeTruthy();

  for (const width of widths) {
    for (const route of ['/', '/shop', `/shirts/${productId}`, '/cart', '/auth/login', '/auth/register']) {
      await verifyViewport(page, route, width, testInfo);
    }
    await page.goto('/');
    const searchButton = page.getByRole('button', { name: 'Search' });
    await searchButton.focus();
    await page.keyboard.press('Enter');
    const searchDialog = page.getByRole('dialog', { name: /Search Menswear/i });
    await expect(searchDialog).toBeVisible();
    await expect(page.getByLabel('Search products')).toBeFocused();
    expect(await page.locator('body > *:not([role="presentation"])').first().getAttribute('aria-hidden')).toBe('true');
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`search-dialog-${width}.png`) });
    await page.keyboard.press('Escape');
    await expect(searchDialog).toBeHidden();
    await expect(searchButton).toBeFocused();
  }
  await verifyAccessibleControls(page);
});

test('customer routes deny admin access and survive refresh, history, and responsive layouts', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  const email = `phase8-${Date.now()}-${Math.random().toString(36).slice(2)}@example.invalid`;
  await registerCustomer(page, email);
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/account$/);

  for (const width of widths) {
    for (const route of ['/account', '/account/orders', '/wishlist', '/checkout']) {
      await verifyViewport(page, route, width, testInfo);
    }
  }
  await page.reload();
  await expect(page.locator('main').first()).toBeVisible();
  await page.goBack();
  await page.goForward();
  await expect(page.locator('main').first()).toBeVisible();
  await verifyAccessibleControls(page);
});

test('admin tables and forms remain contained at every required viewport', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  const password = process.env.INITIAL_ADMIN_PASSWORD;
  if (!password) throw new Error('INITIAL_ADMIN_PASSWORD is required by the isolated browser harness.');
  await page.goto('/auth/login?redirect=/admin');
  await page.getByLabel('Email Address').fill(process.env.INITIAL_ADMIN_EMAIL ?? 'phase1-admin@example.invalid');
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'SIGN IN' }).click();
  await expect.poll(() => new URL(page.url()).pathname).toBe('/admin');

  const routes = [
    '/admin', '/admin/products', '/admin/products/new', '/admin/orders', '/admin/customers',
    '/admin/categories', '/admin/variants', '/admin/inventory', '/admin/inventory/movements',
    '/admin/inventory/reservations', '/admin/coupons', '/admin/audit-logs',
  ];
  for (const width of widths) {
    for (const route of routes) await verifyViewport(page, route, width, testInfo);
  }
  await verifyAccessibleControls(page);
});

test('keyboard focus, reduced motion, and slow, failed, and offline requests have observable states', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const searchButton = page.getByRole('button', { name: 'Search' });
  await searchButton.focus();
  const focusStyle = await searchButton.evaluate(element => {
    const style = getComputedStyle(element);
    return { outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth, boxShadow: style.boxShadow };
  });
  expect(focusStyle.outlineStyle !== 'none' || focusStyle.outlineWidth !== '0px' || focusStyle.boxShadow !== 'none').toBe(true);
  const reduced = await page.evaluate(() => {
    const marquee = document.querySelector<HTMLElement>('.animate-marquee');
    const transition = document.querySelector<HTMLElement>('button');
    return {
      animationName: marquee ? getComputedStyle(marquee).animationName : 'none',
      transitionDuration: transition ? getComputedStyle(transition).transitionDuration : '0s',
    };
  });
  expect(reduced.animationName).toBe('none');
  expect(reduced.transitionDuration.split(',').every(value => parseFloat(value) <= 0.001)).toBe(true);

  let mode: 'slow-failure' | 'offline' | 'healthy' = 'slow-failure';
  await page.route('**/api/v1/products**', async route => {
    if (mode === 'slow-failure') {
      await new Promise(resolve => setTimeout(resolve, 750));
      await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: { message: 'Temporary catalog failure' } }) });
    } else if (mode === 'offline') {
      await route.abort('internetdisconnected');
    } else {
      await route.continue();
    }
  });
  await page.goto(`/shop?search=slow-${Date.now()}`);
  await expect(page.getByText('Loading collection…')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('slow-request-loading.png') });
  await expect(page.getByRole('alert')).toContainText(/Temporary catalog failure|could not be loaded/i, { timeout: 10_000 });
  await page.screenshot({ path: testInfo.outputPath('failed-request-alert.png') });
  mode = 'healthy';
  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(page.getByRole('alert')).toBeHidden({ timeout: 10_000 });

  mode = 'offline';
  await page.goto(`/shop?search=offline-${Date.now()}`);
  await expect(page.getByRole('alert')).toBeVisible({ timeout: 10_000 });
  await page.screenshot({ path: testInfo.outputPath('offline-request-alert.png') });
  mode = 'healthy';
  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(page.getByRole('alert')).toBeHidden({ timeout: 10_000 });
});
