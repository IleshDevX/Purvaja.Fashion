import { expect, test } from '@playwright/test';
import { reloadDocument } from './browser-navigation.js';

test('admin creates a publishable product, verifies storefront visibility, and archives it',async({page})=>{
  const password=process.env.INITIAL_ADMIN_PASSWORD;
  if(!password) throw new Error('INITIAL_ADMIN_PASSWORD is required by the isolated browser harness.');
  const suffix=`${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  const name=`Phase 7 Browser Shirt ${suffix}`;
  const slug=`phase-7-browser-shirt-${suffix}`;
  await page.goto('/auth/login?redirect=/admin/products');
  await page.getByLabel('Email Address').fill(process.env.INITIAL_ADMIN_EMAIL??'phase1-admin@example.invalid');
  await page.getByLabel('Password',{exact:true}).fill(password);
  await page.getByRole('button',{name:'SIGN IN'}).click();
  await expect(page).toHaveURL(/\/admin\/products$/);

  await page.getByRole('link',{name:/Add Product/i}).click();
  await page.getByLabel('Name').fill(name);
  await page.getByLabel('Description').fill('A browser-verified Phase 7 publication workflow product.');
  await page.getByLabel('Base price (INR)').fill('2499');
  await page.getByRole('button',{name:/Save product/i}).click();
  await expect(page).toHaveURL(/\/admin\/products\/[0-9a-f-]+$/);
  const productId=page.url().split('/').pop()!;

  await page.getByRole('link',{name:/Manage Variants/i}).click();
  await expect(page).toHaveURL(new RegExp(`/admin/variants\\?productId=${productId}`));
  await page.getByLabel('SKU', { exact: true }).fill(`P7B-${suffix}`);
  await page.getByLabel('Size').fill('42 (L)');
  await page.getByLabel('Colour name').fill('Midnight');
  await page.getByLabel('Stock',{exact:true}).fill('8');
  await page.getByRole('button',{name:'Save',exact:true}).click();
  await expect(page.getByText(`P7B-${suffix}`,{exact:true})).toBeVisible();

  await page.goto(`/admin/products/${productId}/edit`);
  await page.getByLabel('Fit').selectOption('Regular');
  await page.getByLabel('Fabric').fill('Oxford Cotton');
  await page.getByLabel('Collar').fill('Cutaway Collar');
  await page.getByLabel('Sleeve').fill('Full Sleeve');
  await page.getByLabel('Pattern').fill('Solid');
  await page.locator('section').filter({has:page.getByRole('heading',{name:'Categories'})}).getByRole('checkbox').first().check();
  await page.getByRole('button',{name:/Add image/i}).click();
  await page.getByLabel('Image 1 URL').fill('/images/phase7-browser.jpg');
  await page.getByLabel('Publication status').selectOption('ACTIVE');
  await page.getByRole('button',{name:/Save product/i}).click();
  await expect(page.getByText('ACTIVE',{exact:true}).first()).toBeVisible();

  await page.goto(`/shirts/${slug}`);
  await expect(page.getByRole('heading',{name})).toBeVisible();
  await page.goto(`/admin/products/${productId}`);
  await page.getByRole('button',{name:'ARCHIVED'}).click();
  await expect(page.getByText('ARCHIVED',{exact:true}).first()).toBeVisible();
});

test('catalog filters survive reload and browser history',async({page})=>{
  await page.goto('/shop');
  await page.getByRole('button',{name:/Regular Fit/i}).first().click();
  await expect(page).toHaveURL(/fit=Regular/);
  await page.getByRole('button',{name:/In Stock Only/i}).first().click();
  await expect(page).toHaveURL(/inStock=1/);
  const historyLength = await page.evaluate(() => history.length);
  // Exercise the browser's reload operation. Firefox's automation protocol
  // reload appends a history entry even on a bare HTML page (Playwright #22640).
  await reloadDocument(page);
  expect(await page.evaluate(() => history.length)).toBe(historyLength);
  await expect(page).toHaveURL(/fit=Regular/);
  await page.goBack();
  await expect(page).not.toHaveURL(/inStock=1/);
  await page.goForward();
  await expect(page).toHaveURL(/inStock=1/);
});
