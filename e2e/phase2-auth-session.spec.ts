import { expect, test, type Page } from '@playwright/test';
import { Client } from 'pg';
import { reloadDocument } from './browser-navigation.js';

const password = 'BrowserSecurity123!';

async function verifyIsolatedFixture(email: string) {
  const connectionString = process.env.TEST_DATABASE_URL;
  if (!connectionString) throw new Error('TEST_DATABASE_URL is required for the isolated browser fixture.');
  const client = new Client({ connectionString });
  try {
    await client.connect();
    const result = await client.query(
      'UPDATE users SET email_verified_at = NOW() WHERE email = $1 AND email_verified_at IS NULL',
      [email],
    );
    if (result.rowCount !== 1) throw new Error('Expected one newly registered isolated fixture account.');
  } finally {
    await client.end();
  }
}

async function register(page: Page, firstName: string, lastName: string, email: string) {
  await page.goto('/auth/register', { waitUntil: 'domcontentloaded' });
  await page.getByLabel('First Name').fill(firstName);
  await page.getByLabel('Last Name').fill(lastName);
  await page.getByLabel('Email Address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm Password').fill(password);
  await page.getByRole('button', { name: 'REGISTER ACCOUNT' }).click();
  await expect(page).toHaveURL(/\/auth\/verify-email/);

  // This suite tests session and private-state ownership rather than external
  // email delivery. Promote only its isolated fixture account, then exercise
  // the real login and session boundary through the browser.
  await verifyIsolatedFixture(email);
  await login(page, email);
  await expect(page).toHaveURL(/\/account$/);
}

async function login(page: Page, email: string) {
  await page.goto('/auth/login', { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Email Address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'SIGN IN' }).click();
  await expect(page).toHaveURL(/\/account$/);
}

test('keeps persisted private state with its owner across logout, account switch, and reload', async ({ page }) => {
  const run = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const emailA = `browser-a-${run}@example.invalid`;
  const emailB = `browser-b-${run}@example.invalid`;

  await register(page, 'OwnerA', 'Browser', emailA);
  await expect(page.getByRole('heading', { name: 'Welcome, OwnerA' })).toBeVisible();

  await page.getByRole('button', { name: /Addresses/ }).click();
  await page.getByRole('button', { name: 'Add Address' }).click();
  await page.getByLabel('Recipient Name *').fill('Owner A Private');
  await page.getByLabel('Phone *').fill('9876543210');
  await page.getByLabel('Address Line 1 *').fill('A-only address');
  await page.getByLabel('City *').fill('Surat');
  await page.getByLabel('State *').fill('Gujarat');
  await page.getByLabel('Postal Code *').fill('395006');
  await page.getByRole('button', { name: 'Save Address' }).click();
  await expect(page.getByText('A-only address')).toBeVisible();
  await reloadDocument(page);
  await page.getByRole('button', { name: /Addresses/ }).click();
  await expect(page.getByText('A-only address')).toBeVisible();

  await page.getByRole('button', { name: 'Sign Out' }).click();
  await expect(page).toHaveURL(/\/$/);
  await register(page, 'OwnerB', 'Browser', emailB);
  await expect(page.getByRole('heading', { name: 'Welcome, OwnerB' })).toBeVisible();
  await expect(page.getByText(emailB, { exact: false })).toBeVisible();
  await expect(page.getByText(emailA, { exact: false })).toHaveCount(0);
  await page.getByRole('button', { name: /Addresses/ }).click();
  await expect(page.getByText('No saved addresses yet')).toBeVisible();
  await expect(page.getByText('A-only address')).toHaveCount(0);
  await reloadDocument(page);
  await expect(page.getByRole('heading', { name: 'Welcome, OwnerB' })).toBeVisible();

  await page.getByRole('button', { name: 'Sign Out' }).click();
  await expect(page).toHaveURL(/\/$/);
  await login(page, emailA);
  await page.getByRole('button', { name: /Addresses/ }).click();
  await expect(page.getByText('A-only address')).toBeVisible();
  await expect(page.getByText(emailB, { exact: false })).toHaveCount(0);
});

test('applies one persisted guest-cart contribution when login synchronizes parallel tabs and after reload', async ({ page, context }) => {
  const run = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const email = `browser-cart-${run}@example.invalid`;
  await register(page, 'Cart', 'Owner', email);
  await page.getByRole('button', { name: 'Sign Out' }).click();
  await expect(page).toHaveURL(/\/$/);

  const catalogResponse = await page.request.get('/api/v1/products?limit=24&inStock=true', {
    headers: { 'X-Test-Rate-Limit-Max': '50000', 'X-Test-Client-Id': `phase2-${run}` },
  });
  expect(catalogResponse.ok()).toBe(true);
  const catalog = await catalogResponse.json() as {
    data: { items: Array<{
      id: string;
      name: string;
      slug: string;
      price: number;
      images: string[];
      variants: Array<{
        id: string;
        color: { name: string; hex: string };
        size: string;
        price: number;
        pricePaise: number;
        stockCount: number;
        inStock: boolean;
      }>;
    }> };
  };
  const product = catalog.data.items.find(item => item.variants.some(variant => variant.inStock && variant.stockCount >= 1));
  expect(product).toBeDefined();
  const variant = product!.variants.find(item => item.inStock && item.stockCount >= 1)!;
  const mergeId = crypto.randomUUID();
  const guestItem = {
    id: `guest-${variant.id}`,
    shirtId: product!.id,
    variantId: variant.id,
    name: product!.name,
    slug: product!.slug,
    image: product!.images[0] ?? '',
    price: variant.price,
    pricePaise: variant.pricePaise,
    color: variant.color,
    size: variant.size,
    quantity: 1,
    stockQuantity: variant.stockCount,
  };

  await page.evaluate(({ item, id }) => {
    localStorage.setItem('purvaja-cart-v2', JSON.stringify({
      state: { items: [item], ownerId: null, guestMergeId: id },
      version: 3,
    }));
  }, { item: guestItem, id: mergeId });
  await reloadDocument(page);
  const secondTab = await context.newPage();
  await secondTab.goto('/', { waitUntil: 'domcontentloaded' });

  // Tabs in one browser context share the session cookie. One login is the
  // session boundary; the other tab must observe it and revalidate rather than
  // racing a second login form that may correctly disappear mid-submission.
  const secondTabSynchronized = secondTab.waitForResponse(response =>
    response.url().endsWith('/api/v1/auth/me') && response.status() === 200,
  );
  await login(page, email);
  await secondTabSynchronized;
  await expect.poll(async () => {
    const response = await page.request.get('/api/v1/cart');
    const body = await response.json() as { data?: { items?: Array<{ variantId: string; quantity: number }> } };
    return body.data?.items?.find(item => item.variantId === variant.id)?.quantity ?? 0;
  }).toBe(1);

  await secondTab.bringToFront();
  await secondTab.goto('/cart', { waitUntil: 'domcontentloaded' });
  await expect(secondTab.getByText(product!.name, { exact: true }).first()).toBeVisible();
  await reloadDocument(secondTab);
  await expect(secondTab.getByText(product!.name, { exact: true }).first()).toBeVisible();
  await secondTab.close();
});
