import { expect, test } from '@playwright/test';
import { Client } from 'pg';

const password = 'BrowserPurchase123!';

async function withDatabase<T>(work: (client: Client) => Promise<T>): Promise<T> {
  const connectionString = process.env.TEST_DATABASE_URL;
  if (!connectionString) throw new Error('TEST_DATABASE_URL is required for the isolated browser fixture.');
  const client = new Client({ connectionString });
  try {
    await client.connect();
    return await work(client);
  } finally {
    await client.end();
  }
}

test('completes a demo purchase through the UI and persists one authoritative settlement', async ({ page }) => {
  const run = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const email = `browser-purchase-${run}@example.invalid`;
  const catalogResponse = await page.request.get('/api/v1/products?limit=24&inStock=true', {
    headers: { 'X-Test-Rate-Limit-Max': '50000', 'X-Test-Client-Id': `purchase-${run}` },
  });
  expect(catalogResponse.ok()).toBe(true);
  const catalog = await catalogResponse.json() as {
    data: { items: Array<{ id: string; slug: string; variants: Array<{ id: string; color: { name: string }; size: string; stockCount: number; inStock: boolean }> }> };
  };
  const product = catalog.data.items.find(item => item.variants.some(variant => variant.inStock && variant.stockCount >= 1));
  expect(product).toBeDefined();
  const variant = product!.variants.find(item => item.inStock && item.stockCount >= 1)!;
  const stockBefore = await withDatabase(async client =>
    Number((await client.query('SELECT stock_quantity FROM product_variants WHERE id = $1', [variant.id])).rows[0].stock_quantity),
  );

  await page.goto('/auth/register');
  await page.getByLabel('First Name').fill('Demo');
  await page.getByLabel('Last Name').fill('Buyer');
  await page.getByLabel('Email Address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm Password').fill(password);
  await page.getByRole('button', { name: 'REGISTER ACCOUNT' }).click();
  await expect(page).toHaveURL(/\/auth\/verify-email/);
  await withDatabase(async client => {
    const result = await client.query('UPDATE users SET email_verified_at = NOW() WHERE email = $1', [email]);
    expect(result.rowCount).toBe(1);
  });

  await page.goto('/auth/login');
  await page.getByLabel('Email Address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'SIGN IN' }).click();
  await expect(page).toHaveURL(/\/account$/);

  await page.goto(`/shirts/${product!.slug}`);
  await page.getByTitle(variant.color.name, { exact: true }).click();
  await page.getByTitle(`Size ${variant.size}`, { exact: true }).click();
  const cartWrite = page.waitForResponse(response =>
    response.url().endsWith('/api/v1/cart/items') && response.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'ADD TO SHOPPING BAG' }).click();
  expect((await cartWrite).ok()).toBe(true);
  await page.goto('/cart');
  await page.getByRole('button', { name: 'PROCEED TO CHECKOUT' }).click();

  await page.getByLabel('First Name *').fill('Demo');
  await page.getByLabel('Last Name *').fill('Buyer');
  await page.getByLabel('Mobile Phone (For delivery updates) *').fill('9876543210');
  await page.getByLabel('Street Address / Flat / Floor *').fill('1 Browser Test Road');
  await page.getByLabel('City *').fill('Pune');
  await page.getByLabel('State *').fill('Maharashtra');
  await page.getByLabel('PIN Code *').fill('411001');
  await page.getByRole('button', { name: /CONTINUE TO DELIVERY & REVIEW/ }).click();
  await page.getByRole('button', { name: /PROCEED TO PAYMENT/ }).click();
  await page.getByRole('button', { name: /CONFIRM & PAY/ }).click();

  await expect(page).toHaveURL(/\/checkout\/payment\?paymentId=/);
  await expect(page.getByText('DEMO GATEWAY · NO REAL MONEY WILL BE CHARGED')).toBeVisible();
  await page.getByRole('button', { name: 'SIMULATE SUCCESS' }).click();
  await expect(page).toHaveURL(/\/checkout\/success\?orderId=/);
  await expect(page.getByRole('heading', { name: 'Thank You for Your Order' })).toBeVisible();
  const orderId = new URL(page.url()).searchParams.get('orderId');
  expect(orderId).toBeTruthy();

  await page.goto('/account/orders');
  await expect(page.getByText(/confirmed/i).first()).toBeVisible();

  await withDatabase(async client => {
    const result = await client.query(`
      SELECT o.status, o.payment_status, p.status AS payment_status_record,
        (SELECT count(*) FROM payments WHERE order_id = o.id) AS payment_count,
        (SELECT count(*) FROM inventory_reservations WHERE order_id = o.id AND status = 'CONSUMED') AS consumed_count,
        (SELECT count(*) FROM cart_items ci JOIN carts c ON c.id = ci.cart_id WHERE c.user_id = o.user_id) AS cart_count
      FROM orders o JOIN payments p ON p.order_id = o.id WHERE o.id = $1
    `, [orderId]);
    expect(result.rowCount).toBe(1);
    expect(result.rows[0]).toMatchObject({
      status: 'CONFIRMED',
      payment_status: 'SUCCESS',
      payment_status_record: 'SUCCESS',
      payment_count: '1',
      consumed_count: '1',
      cart_count: '0',
    });
    const stockAfter = Number((await client.query('SELECT stock_quantity FROM product_variants WHERE id = $1', [variant.id])).rows[0].stock_quantity);
    expect(stockAfter).toBe(stockBefore - 1);
  });
});
