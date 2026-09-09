import { expect, test, type Page } from '@playwright/test';

const password = 'BrowserSecurity123!';

async function register(page: Page, firstName: string, lastName: string, email: string) {
  await page.goto('/auth/register');
  await page.getByLabel('First Name').fill(firstName);
  await page.getByLabel('Last Name').fill(lastName);
  await page.getByLabel('Email Address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm Password').fill(password);
  await page.getByRole('button', { name: 'REGISTER ACCOUNT' }).click();
  await expect(page).toHaveURL(/\/account$/);
}

async function login(page: Page, email: string) {
  await page.goto('/auth/login');
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
  await page.goto('/account');
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
  await page.reload();
  await page.getByRole('button', { name: /Addresses/ }).click();
  await expect(page.getByText('A-only address')).toBeVisible();

  await page.getByRole('button', { name: 'Sign Out' }).click();
  await expect(page).toHaveURL(/\/$/);
  await register(page, 'OwnerB', 'Browser', emailB);
  await page.goto('/account');
  await expect(page.getByRole('heading', { name: 'Welcome, OwnerB' })).toBeVisible();
  await expect(page.getByText(emailB, { exact: false })).toBeVisible();
  await expect(page.getByText(emailA, { exact: false })).toHaveCount(0);
  await page.getByRole('button', { name: /Addresses/ }).click();
  await expect(page.getByText('No saved addresses yet')).toBeVisible();
  await expect(page.getByText('A-only address')).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Welcome, OwnerB' })).toBeVisible();

  await page.getByRole('button', { name: 'Sign Out' }).click();
  await login(page, emailA);
  await page.goto('/account');
  await page.getByRole('button', { name: /Addresses/ }).click();
  await expect(page.getByText('A-only address')).toBeVisible();
  await expect(page.getByText(emailB, { exact: false })).toHaveCount(0);
});

test('applies one persisted guest-cart contribution across parallel login tabs and reload', async ({ page, context }) => {
  const run = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const email = `browser-cart-${run}@example.invalid`;
  await register(page, 'Cart', 'Owner', email);
  await page.getByRole('button', { name: 'Sign Out' }).click();
  await expect(page).toHaveURL(/\/$/);

  const catalogResponse = await page.request.get('http://localhost:5001/api/v1/products?limit=24&inStock=true');
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
  await page.reload();
  const secondTab = await context.newPage();
  await secondTab.goto('/');

  await Promise.all([login(page, email), login(secondTab, email)]);
  await expect.poll(async () => {
    const response = await page.request.get('http://localhost:5001/api/v1/cart');
    const body = await response.json() as { data?: { items?: Array<{ variantId: string; quantity: number }> } };
    return body.data?.items?.find(item => item.variantId === variant.id)?.quantity ?? 0;
  }).toBe(1);

  await secondTab.reload();
  await secondTab.bringToFront();
  await secondTab.goto('/cart');
  await expect(secondTab.getByText(product!.name, { exact: true }).first()).toBeVisible();
  await secondTab.close();
});
