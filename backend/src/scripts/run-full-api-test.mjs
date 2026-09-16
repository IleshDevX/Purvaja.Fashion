import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from 'redis';
import { getPrismaClient } from '../../dist/config/database.js';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5001';
const prisma = getPrismaClient();

// Reset Redis rate limit keys
async function resetRateLimits() {
  if (!process.env.RATE_LIMIT_REDIS_URL) return;
  try {
    const redis = createClient({ url: process.env.RATE_LIMIT_REDIS_URL });
    await redis.connect();
    const keys = await redis.keys('*rate-limit*');
    if (keys.length > 0) {
      await redis.del(keys);
    }
    await redis.disconnect();
  } catch (err) {
    console.log('Notice: Could not reset Redis rate limits:', err.message);
  }
}

// Cookie Jar implementation for native fetch
class CookieJar {
  constructor() {
    this.cookies = new Map();
  }

  setFromHeaders(headers) {
    const setCookies = typeof headers.getSetCookie === 'function' 
      ? headers.getSetCookie() 
      : [headers.get('set-cookie')].filter(Boolean);

    for (const sc of setCookies) {
      const parts = sc.split(';')[0].trim();
      const [name, ...val] = parts.split('=');
      if (name) {
        this.cookies.set(name, val.join('='));
      }
    }
  }

  get(name) {
    return this.cookies.get(name);
  }

  set(name, value) {
    this.cookies.set(name, value);
  }

  toHeaderString() {
    return Array.from(this.cookies.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }

  clear() {
    this.cookies.clear();
  }
}

const results = [];

async function callApi({
  name,
  method = 'GET',
  path: reqPath,
  body = null,
  jar = null,
  csrfToken = null,
  headers = {},
  expectedStatus = [200],
  notes = ''
}) {
  const url = `${BASE_URL}${reqPath}`;
  const reqHeaders = { ...headers };

  if (body && !reqHeaders['Content-Type']) {
    reqHeaders['Content-Type'] = 'application/json';
  }

  if (jar && jar.toHeaderString()) {
    reqHeaders['Cookie'] = jar.toHeaderString();
  }

  if (csrfToken) {
    reqHeaders['X-CSRF-Token'] = csrfToken;
  }

  const start = performance.now();
  let status = 0;
  let responseData = null;
  let errorMsg = null;

  try {
    const res = await fetch(url, {
      method,
      headers: reqHeaders,
      body: body ? JSON.stringify(body) : undefined
    });

    status = res.status;
    const durationMs = Math.round(performance.now() - start);

    if (jar) {
      jar.setFromHeaders(res.headers);
    }

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        responseData = await res.json();
      } catch (e) {
        responseData = await res.text();
      }
    } else {
      responseData = await res.text();
    }

    const expected = Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus];
    const passed = expected.includes(status);

    const testItem = {
      name,
      method,
      path: reqPath,
      expectedStatus: expected,
      actualStatus: status,
      durationMs,
      passed,
      notes,
      responseSummary: responseData && typeof responseData === 'object' 
        ? (responseData.success !== undefined ? { success: responseData.success, code: responseData.error?.code } : responseData)
        : String(responseData).slice(0, 100)
    };

    results.push(testItem);

    const icon = passed ? '✓' : '✗';
    console.log(`  ${icon} [${method}] ${reqPath} -> HTTP ${status} (${durationMs}ms) | ${name}`);
    if (!passed) {
      console.log(`    Expected: ${expected.join('/')}, Got: ${status}`);
      console.log(`    Response:`, JSON.stringify(responseData).slice(0, 300));
    }

    return { status, data: responseData, passed, headers: res.headers };
  } catch (err) {
    const durationMs = Math.round(performance.now() - start);
    errorMsg = err.message;
    results.push({
      name,
      method,
      path: reqPath,
      expectedStatus,
      actualStatus: 0,
      durationMs,
      passed: false,
      error: errorMsg,
      notes
    });
    console.log(`  ✗ [${method}] ${reqPath} -> NETWORK/FETCH ERROR (${durationMs}ms): ${errorMsg}`);
    return { status: 0, data: null, passed: false, error: err };
  }
}

async function runTestSuite() {
  console.log('\n=============================================================');
  console.log('      PURVAJA FASHION — COMPREHENSIVE API TEST HARNESS      ');
  console.log(`      Target: ${BASE_URL} | Time: ${new Date().toISOString()}`);
  console.log('=============================================================\n');

  // Reset Redis rate limits before starting
  await resetRateLimits();

  // Find guaranteed in-stock variant and product
  const guaranteedVar = await prisma.productVariant.findFirst({
    where: { stockQuantity: { gt: 10 }, status: 'ACTIVE' },
    include: { product: true }
  });

  const patronJar = new CookieJar();
  const adminJar = new CookieJar();
  let patronCsrf = '';
  let adminCsrf = '';
  let testUserId = '';
  let testPatronEmail = `patron_test_${Date.now()}@purvaja.fashion`;
  const patronPassword = 'SecurePassword123!';
  let createdAddressId = '';
  let sampleProductId = guaranteedVar ? guaranteedVar.productId : '';
  let sampleProductSlug = guaranteedVar ? guaranteedVar.product.slug : '';
  let sampleVariantId = guaranteedVar ? guaranteedVar.id : '';
  let cartItemId = '';
  let testOrderId = '';
  let testPaymentId = '';
  let adminProductId = '';
  let adminCategoryId = '';
  let adminVariantId = '';
  let adminCouponId = '';
  let adminCustomerId = '';

  // -------------------------------------------------------------
  // MODULE 1: System & Health Probes
  // -------------------------------------------------------------
  console.log('\n--- MODULE 1: System & Health Probes ---');
  await callApi({
    name: '1. Fast Liveness Probe',
    method: 'GET',
    path: '/healthz',
    expectedStatus: 200
  });

  await callApi({
    name: '2. Deep Readiness Probe (DB & Redis)',
    method: 'GET',
    path: '/readyz',
    expectedStatus: 200
  });

  await callApi({
    name: '3. Router Base Health Check',
    method: 'GET',
    path: '/health',
    expectedStatus: 200
  });

  await callApi({
    name: '4. Router Health Readiness Check',
    method: 'GET',
    path: '/health/ready',
    expectedStatus: 200
  });

  // -------------------------------------------------------------
  // MODULE 2: Authentication & Account Management
  // -------------------------------------------------------------
  console.log('\n--- MODULE 2: Authentication & Account Management ---');
  
  // 2.1 Get CSRF
  const csrfRes = await callApi({
    name: '1. Acquire CSRF Token and Set pf_csrf Cookie',
    method: 'GET',
    path: '/api/v1/auth/csrf',
    jar: patronJar,
    expectedStatus: 200
  });
  patronCsrf = csrfRes.data?.data?.csrfToken || patronJar.get('pf_csrf');

  // 2.2 Security check: Call /me unauthenticated -> 401
  await callApi({
    name: '2. Access /me without session (Security 401 check)',
    method: 'GET',
    path: '/api/v1/auth/me',
    expectedStatus: 401
  });

  // 2.3 Register new patron
  const regRes = await callApi({
    name: '3. Register New Customer Account',
    method: 'POST',
    path: '/api/v1/auth/register',
    jar: patronJar,
    csrfToken: patronCsrf,
    body: {
      firstName: 'Aarav',
      lastName: 'Patel',
      email: testPatronEmail,
      password: patronPassword,
      confirmPassword: patronPassword,
      phone: '+919876543210'
    },
    expectedStatus: 201
  });
  testUserId = regRes.data?.data?.user?.id;

  // 2.4 Resend verification code
  await callApi({
    name: '4. Resend Verification Code',
    method: 'POST',
    path: '/api/v1/auth/resend-verification',
    jar: patronJar,
    body: { email: testPatronEmail },
    expectedStatus: 200
  });

  // 2.5 Verify email via OTP
  let verificationOtp = '123456';
  try {
    const testOtp = '839201';
    const otpHash = crypto.createHash('sha256').update(`${testUserId}:${testOtp}`).digest('hex');
    await prisma.emailVerificationToken.create({
      data: {
        userId: testUserId,
        tokenHash: otpHash,
        purpose: 'REGISTRATION',
        targetEmail: testPatronEmail,
        expiresAt: new Date(Date.now() + 600000)
      }
    });
    verificationOtp = testOtp;
  } catch (err) {
    console.log('    Notice setting verification token:', err.message);
  }

  const verifyRes = await callApi({
    name: '5. Verify Email with 6-digit OTP',
    method: 'POST',
    path: '/api/v1/auth/verify-email',
    jar: patronJar,
    body: { email: testPatronEmail, otp: verificationOtp },
    expectedStatus: 200
  });
  if (verifyRes.data?.data?.csrfToken) {
    patronCsrf = verifyRes.data.data.csrfToken;
  }

  // 2.6 Login Patron
  const loginRes = await callApi({
    name: '6. Patron Login (Issues pf_session cookie)',
    method: 'POST',
    path: '/api/v1/auth/login',
    jar: patronJar,
    body: { email: testPatronEmail, password: patronPassword },
    expectedStatus: 200
  });
  if (loginRes.data?.data?.csrfToken) {
    patronCsrf = loginRes.data.data.csrfToken;
  }

  // 2.7 Get Authenticated Me Profile
  await callApi({
    name: '7. Get Current Patron Profile (/me)',
    method: 'GET',
    path: '/api/v1/auth/me',
    jar: patronJar,
    expectedStatus: 200
  });

  // 2.8 Security check: Mutate without CSRF -> 403
  await callApi({
    name: '8. Update Profile without CSRF (Security 403 check)',
    method: 'PATCH',
    path: '/api/v1/auth/me',
    jar: patronJar,
    csrfToken: '',
    body: { firstName: 'Hacker' },
    expectedStatus: 403
  });

  // 2.9 Update Patron Preferences
  await callApi({
    name: '9. Update Patron Profile & Tailoring Preferences',
    method: 'PATCH',
    path: '/api/v1/auth/me',
    jar: patronJar,
    csrfToken: patronCsrf,
    body: {
      firstName: 'Aarav',
      preferredFit: 'Slim',
      preferredCollar: 'Spread Collar'
    },
    expectedStatus: 200
  });

  // 2.10 Forgot Password
  await callApi({
    name: '10. Forgot Password Request',
    method: 'POST',
    path: '/api/v1/auth/forgot-password',
    jar: patronJar,
    body: { email: testPatronEmail },
    expectedStatus: 200
  });

  // 2.11 Reset Password
  const resetSecret = crypto.randomBytes(24).toString('hex');
  const resetHash = crypto.createHash('sha256').update(resetSecret).digest('hex');
  await prisma.passwordResetToken.create({
    data: {
      userId: testUserId,
      tokenHash: resetHash,
      expiresAt: new Date(Date.now() + 3600000)
    }
  });

  await callApi({
    name: '11. Reset Password with Secret Token',
    method: 'POST',
    path: '/api/v1/auth/reset-password',
    jar: patronJar,
    body: {
      token: resetSecret,
      password: 'UpdatedPassword123!',
      confirmPassword: 'UpdatedPassword123!'
    },
    expectedStatus: 200
  });

  // Re-login with updated password to keep patronJar session valid
  const reLogin = await callApi({
    name: '12. Re-login Patron after Password Reset',
    method: 'POST',
    path: '/api/v1/auth/login',
    jar: patronJar,
    body: { email: testPatronEmail, password: 'UpdatedPassword123!' },
    expectedStatus: 200
  });
  if (reLogin.data?.data?.csrfToken) {
    patronCsrf = reLogin.data.data.csrfToken;
  }

  // -------------------------------------------------------------
  // MODULE 3: Catalog, Products & Reviews
  // -------------------------------------------------------------
  console.log('\n--- MODULE 3: Catalog, Products & Reviews ---');

  await callApi({
    name: '1. List Products with Multi-Facet Filters',
    method: 'GET',
    path: '/api/v1/products?limit=10&page=1&inStock=true&category=shirts&sort=featured',
    expectedStatus: 200
  });

  await callApi({
    name: '2. Get Product Detail by Slug',
    method: 'GET',
    path: `/api/v1/products/${sampleProductSlug}`,
    expectedStatus: 200
  });

  await callApi({
    name: '3. Get Product Detail by UUID',
    method: 'GET',
    path: `/api/v1/products/${sampleProductId}`,
    expectedStatus: 200
  });

  await callApi({
    name: '4. List Reviews for Product',
    method: 'GET',
    path: `/api/v1/products/${sampleProductId}/reviews?limit=5`,
    expectedStatus: 200
  });

  // 3.5 Submit review before purchase -> Enforces Verified Purchase Policy (403)
  await callApi({
    name: '5. Submit Review Unverified Check (Verified Purchase Policy 403)',
    method: 'POST',
    path: `/api/v1/products/${sampleProductId}/reviews`,
    jar: patronJar,
    csrfToken: patronCsrf,
    body: {
      rating: 5,
      title: 'Premature Review Attempt',
      comment: 'Attempting to review without confirmed delivery.'
    },
    expectedStatus: 403,
    notes: 'Correctly blocked by VERIFIED_PURCHASE_REQUIRED guard'
  });

  // -------------------------------------------------------------
  // MODULE 4: Shopping Bag / Cart Management
  // -------------------------------------------------------------
  console.log('\n--- MODULE 4: Shopping Bag / Cart Management ---');

  await callApi({
    name: '1. Get Current Patron Cart',
    method: 'GET',
    path: '/api/v1/cart',
    jar: patronJar,
    expectedStatus: 200
  });

  const addItemRes = await callApi({
    name: '2. Add Garment Variant to Cart',
    method: 'POST',
    path: '/api/v1/cart/items',
    jar: patronJar,
    csrfToken: patronCsrf,
    body: {
      variantId: sampleVariantId,
      quantity: 1
    },
    expectedStatus: 200
  });

  const cartItems = addItemRes.data?.data?.items || [];
  if (cartItems.length > 0) {
    cartItemId = cartItems[0].id;
  }

  if (cartItemId) {
    await callApi({
      name: '3. Update Line Item Quantity in Cart',
      method: 'PATCH',
      path: `/api/v1/cart/items/${cartItemId}`,
      jar: patronJar,
      csrfToken: patronCsrf,
      body: { quantity: 2 },
      expectedStatus: 200
    });
  }

  // Merge guest cart
  await callApi({
    name: '4. Merge Guest Bag into Customer Account',
    method: 'POST',
    path: '/api/v1/cart/merge',
    jar: patronJar,
    csrfToken: patronCsrf,
    body: {
      mergeId: crypto.randomUUID(),
      items: [{ variantId: sampleVariantId, quantity: 1 }]
    },
    expectedStatus: 200
  });

  if (cartItemId) {
    await callApi({
      name: '5. Remove Line Item from Cart',
      method: 'DELETE',
      path: `/api/v1/cart/items/${cartItemId}`,
      jar: patronJar,
      csrfToken: patronCsrf,
      expectedStatus: 200
    });
  }

  await callApi({
    name: '6. Clear Shopping Cart',
    method: 'DELETE',
    path: '/api/v1/cart',
    jar: patronJar,
    csrfToken: patronCsrf,
    expectedStatus: 200
  });

  // Re-add 1 item for checkout testing
  await callApi({
    name: '7. Re-add Item to Bag for Order Placement',
    method: 'POST',
    path: '/api/v1/cart/items',
    jar: patronJar,
    csrfToken: patronCsrf,
    body: { variantId: sampleVariantId, quantity: 1 },
    expectedStatus: 200
  });

  // -------------------------------------------------------------
  // MODULE 5: Address Book Management
  // -------------------------------------------------------------
  console.log('\n--- MODULE 5: Address Book Management ---');

  await callApi({
    name: '1. List Patron Addresses',
    method: 'GET',
    path: '/api/v1/addresses',
    jar: patronJar,
    expectedStatus: 200
  });

  const addrRes = await callApi({
    name: '2. Create Shipping Address',
    method: 'POST',
    path: '/api/v1/addresses',
    jar: patronJar,
    csrfToken: patronCsrf,
    body: {
      recipientName: 'Aarav Patel',
      phone: '+919876543210',
      line1: 'Penthouse 14, Royal Residency',
      line2: '100 Feet Road, Indiranagar',
      city: 'Bengaluru',
      state: 'Karnataka',
      postalCode: '560038',
      country: 'IN',
      isDefault: true
    },
    expectedStatus: 201
  });
  createdAddressId = addrRes.data?.data?.id;

  if (createdAddressId) {
    await callApi({
      name: '3. Update Address Details',
      method: 'PATCH',
      path: `/api/v1/addresses/${createdAddressId}`,
      jar: patronJar,
      csrfToken: patronCsrf,
      body: {
        recipientName: 'Aarav Patel (Primary Residence)',
        isDefault: true
      },
      expectedStatus: 200
    });
  }

  const tempAddrRes = await callApi({
    name: '4. Create Secondary Address for Deletion Test',
    method: 'POST',
    path: '/api/v1/addresses',
    jar: patronJar,
    csrfToken: patronCsrf,
    body: {
      recipientName: 'Aarav Patel Office',
      phone: '+919876543210',
      line1: 'Level 5, WeWork Prestige',
      city: 'Bengaluru',
      state: 'Karnataka',
      postalCode: '560001',
      country: 'IN',
      isDefault: false
    },
    expectedStatus: 201
  });
  const tempAddrId = tempAddrRes.data?.data?.id;

  if (tempAddrId) {
    await callApi({
      name: '5. Delete Address',
      method: 'DELETE',
      path: `/api/v1/addresses/${tempAddrId}`,
      jar: patronJar,
      csrfToken: patronCsrf,
      expectedStatus: 200
    });
  }

  // -------------------------------------------------------------
  // MODULE 6: Checkout, Coupons, Payments & Orders
  // -------------------------------------------------------------
  console.log('\n--- MODULE 6: Checkout, Coupons, Payments & Orders ---');

  let validCouponCode = 'WELCOME10';
  const dbCoupon = await prisma.coupon.findFirst({ where: { isActive: true } });
  if (dbCoupon) {
    validCouponCode = dbCoupon.code;
  }

  await callApi({
    name: '1. Validate Promotional Coupon Code',
    method: 'POST',
    path: '/api/v1/coupons/validate',
    jar: patronJar,
    csrfToken: patronCsrf,
    body: {
      code: validCouponCode,
      subtotalPaise: 499900
    },
    expectedStatus: [200, 404, 400]
  });

  const idemKey = `idem-test-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const checkoutRes = await callApi({
    name: '2. Execute Checkout / Place Order (Atomic Inventory Lock)',
    method: 'POST',
    path: '/api/v1/checkout',
    jar: patronJar,
    csrfToken: patronCsrf,
    headers: { 'Idempotency-Key': idemKey },
    body: {
      addressId: createdAddressId,
      deliveryOptionId: 'standard'
    },
    expectedStatus: 200
  });

  testOrderId = checkoutRes.data?.data?.order?.id;
  testPaymentId = checkoutRes.data?.data?.payment?.id;

  if (testPaymentId) {
    await callApi({
      name: '3. Initiate Payment with Gateway (PhonePe/Mock)',
      method: 'POST',
      path: `/api/v1/payments/${testPaymentId}/initiate`,
      jar: patronJar,
      csrfToken: patronCsrf,
      expectedStatus: [200, 400, 502]
    });

    await callApi({
      name: '4. Poll Authoritative Payment Status',
      method: 'GET',
      path: `/api/v1/payments/${testPaymentId}/status`,
      jar: patronJar,
      expectedStatus: 200
    });

    await callApi({
      name: '5. Demo Result Simulation (Gateway Policy Check)',
      method: 'POST',
      path: `/api/v1/payments/${testPaymentId}/demo-result`,
      jar: patronJar,
      csrfToken: patronCsrf,
      body: { result: 'SUCCESS' },
      expectedStatus: [200, 403, 404]
    });
  }

  await callApi({
    name: '6. List Customer Orders',
    method: 'GET',
    path: '/api/v1/orders?limit=10&page=1',
    jar: patronJar,
    expectedStatus: 200
  });

  if (testOrderId) {
    await callApi({
      name: '7. Get Order Details by UUID',
      method: 'GET',
      path: `/api/v1/orders/${testOrderId}`,
      jar: patronJar,
      expectedStatus: 200
    });

    await callApi({
      name: '8. Cancel Order & Release Stock Hold',
      method: 'POST',
      path: `/api/v1/orders/${testOrderId}/cancel`,
      jar: patronJar,
      csrfToken: patronCsrf,
      body: { reason: 'Decided to customize fabric weave' },
      expectedStatus: [200, 409]
    });

    await callApi({
      name: '9. Request Return on Non-Delivered Order (Policy 409 enforcement)',
      method: 'POST',
      path: `/api/v1/orders/${testOrderId}/returns`,
      jar: patronJar,
      csrfToken: patronCsrf,
      body: { reason: 'Sizing discrepancy' },
      expectedStatus: 409
    });
  }

  // -------------------------------------------------------------
  // MODULE 7: Wishlist
  // -------------------------------------------------------------
  console.log('\n--- MODULE 7: Wishlist ---');

  await callApi({
    name: '1. Get Customer Wishlist',
    method: 'GET',
    path: '/api/v1/wishlist',
    jar: patronJar,
    expectedStatus: 200
  });

  if (sampleProductId) {
    await callApi({
      name: '2. Add Garment to Wishlist',
      method: 'POST',
      path: '/api/v1/wishlist',
      jar: patronJar,
      csrfToken: patronCsrf,
      body: { productId: sampleProductId },
      expectedStatus: 200
    });

    await callApi({
      name: '3. Remove Garment from Wishlist',
      method: 'DELETE',
      path: `/api/v1/wishlist/${sampleProductId}`,
      jar: patronJar,
      csrfToken: patronCsrf,
      expectedStatus: 200
    });

    await callApi({
      name: '4. Sync Guest Wishlist on Authentication',
      method: 'POST',
      path: '/api/v1/wishlist/sync',
      jar: patronJar,
      csrfToken: patronCsrf,
      body: { productIds: [sampleProductId] },
      expectedStatus: 200
    });
  }

  // -------------------------------------------------------------
  // MODULE 8: Newsletter
  // -------------------------------------------------------------
  console.log('\n--- MODULE 8: Newsletter Subscriptions ---');

  await callApi({
    name: '1. Public Newsletter Subscription',
    method: 'POST',
    path: '/api/v1/newsletter/subscriptions',
    body: {
      email: `newsletter_${Date.now()}@example.invalid`,
      consentSource: 'storefront_footer'
    },
    expectedStatus: [201, 200]
  });

  // -------------------------------------------------------------
  // MODULE 9: Admin Operations & RBAC
  // -------------------------------------------------------------
  console.log('\n--- MODULE 9: Admin Operations & RBAC ---');

  // Reset rate limit before admin suite
  await resetRateLimits();

  await callApi({
    name: '1. Customer Role Access to Admin Dashboard (Security 403 check)',
    method: 'GET',
    path: '/api/v1/admin/dashboard',
    jar: patronJar,
    expectedStatus: 403
  });

  await callApi({
    name: '2. Unauthenticated Access to Admin Dashboard (Security 401 check)',
    method: 'GET',
    path: '/api/v1/admin/dashboard',
    expectedStatus: 401
  });

  const adminUser = await prisma.user.findFirst({
    where: { role: 'ADMIN', status: 'ACTIVE' }
  });

  if (!adminUser) {
    throw new Error('No active ADMIN user found in database for testing admin endpoints.');
  }

  const adminSessionToken = crypto.randomUUID();
  const adminTokenHash = crypto.createHash('sha256').update(adminSessionToken).digest('hex');
  await prisma.session.create({
    data: {
      userId: adminUser.id,
      tokenHash: adminTokenHash,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    }
  });

  adminJar.set('pf_session', adminSessionToken);
  adminCsrf = crypto.randomBytes(24).toString('hex');
  adminJar.set('pf_csrf', adminCsrf);

  await callApi({
    name: '3. Admin Dashboard Business KPI Metrics',
    method: 'GET',
    path: '/api/v1/admin/dashboard',
    jar: adminJar,
    expectedStatus: 200
  });

  const adminProdRes = await callApi({
    name: '4. Admin Catalog List',
    method: 'GET',
    path: '/api/v1/admin/products?page=1&limit=25',
    jar: adminJar,
    expectedStatus: 200
  });
  if (adminProdRes.data?.data?.items?.length > 0) {
    adminProductId = adminProdRes.data.data.items[0].id;
  }

  const newProdSlug = `bespoke-linen-shirt-${Date.now()}`;
  const createProdRes = await callApi({
    name: '5. Admin Create Garment Product',
    method: 'POST',
    path: '/api/v1/admin/products',
    jar: adminJar,
    csrfToken: adminCsrf,
    body: {
      name: 'Bespoke Belgian Linen Shirt',
      slug: newProdSlug,
      description: 'Hand-tailored Belgian linen shirt with Mother-of-Pearl buttons and French seams.',
      basePricePaise: 429900,
      fit: 'Regular',
      fabric: 'Belgian Linen',
      collar: 'Button-Down Collar',
      sleeve: 'Full Sleeve',
      pattern: 'Solid',
      images: [{ url: '/images/products/linen-shirt.jpg', isPrimary: true }]
    },
    expectedStatus: 201
  });
  const createdAdminProdId = createProdRes.data?.data?.id;

  const targetProdId = createdAdminProdId || adminProductId || sampleProductId;

  await callApi({
    name: '6. Admin Product Detail View',
    method: 'GET',
    path: `/api/v1/admin/products/${targetProdId}`,
    jar: adminJar,
    expectedStatus: 200
  });

  await callApi({
    name: '7. Admin Update Product Specifications',
    method: 'PATCH',
    path: `/api/v1/admin/products/${targetProdId}`,
    jar: adminJar,
    csrfToken: adminCsrf,
    body: {
      description: 'Updated bespoke tailoring specifications with 120 GSM Belgian weave.'
    },
    expectedStatus: 200
  });

  const catRes = await callApi({
    name: '8. Admin List Categories',
    method: 'GET',
    path: '/api/v1/admin/categories',
    jar: adminJar,
    expectedStatus: 200
  });
  const cats = catRes.data?.data || [];
  if (cats.length > 0) {
    adminCategoryId = cats[0].id;
  }

  const newCatSlug = `black-tie-${Date.now()}`;
  const createCatRes = await callApi({
    name: '9. Admin Create Category',
    method: 'POST',
    path: '/api/v1/admin/categories',
    jar: adminJar,
    csrfToken: adminCsrf,
    body: {
      name: 'Black Tie Gala',
      slug: newCatSlug,
      description: 'Haute couture garments for formal galas and awards ceremonies.'
    },
    expectedStatus: 201
  });
  const createdCatId = createCatRes.data?.data?.id;
  const targetCatId = createdCatId || adminCategoryId;

  if (targetCatId) {
    await callApi({
      name: '10. Admin Update Category',
      method: 'PATCH',
      path: `/api/v1/admin/categories/${targetCatId}`,
      jar: adminJar,
      csrfToken: adminCsrf,
      body: {
        description: 'Updated bespoke category curation notes.'
      },
      expectedStatus: 200
    });
  }

  const varRes = await callApi({
    name: '11. Admin List SKU Variants',
    method: 'GET',
    path: '/api/v1/admin/variants?limit=25',
    jar: adminJar,
    expectedStatus: 200
  });
  const variants = varRes.data?.data?.items || varRes.data?.data || [];
  if (variants.length > 0) {
    adminVariantId = variants[0].id;
  }

  const newVariantSku = `LINEN-42-NAT-${Date.now()}`;
  const createVarRes = await callApi({
    name: '12. Admin Create SKU Variant',
    method: 'POST',
    path: '/api/v1/admin/variants',
    jar: adminJar,
    csrfToken: adminCsrf,
    body: {
      productId: targetProdId,
      sku: newVariantSku,
      size: '42 (L)',
      colorName: 'Natural Flax',
      colorHex: '#EED9C4',
      stockQuantity: 15,
      lowStockThreshold: 3
    },
    expectedStatus: 201
  });
  const createdVariantId = createVarRes.data?.data?.id;
  const targetVarId = createdVariantId || adminVariantId || sampleVariantId;

  if (targetVarId) {
    await callApi({
      name: '13. Admin Update SKU Variant',
      method: 'PATCH',
      path: `/api/v1/admin/variants/${targetVarId}`,
      jar: adminJar,
      csrfToken: adminCsrf,
      body: {
        stockQuantity: 20
      },
      expectedStatus: 200
    });
  }

  await callApi({
    name: '14. Admin Inventory Stock Overview',
    method: 'GET',
    path: '/api/v1/admin/inventory?filter=all',
    jar: adminJar,
    expectedStatus: 200
  });

  await callApi({
    name: '15. Admin Inventory Movement Audit Log',
    method: 'GET',
    path: '/api/v1/admin/inventory/movements?limit=25',
    jar: adminJar,
    expectedStatus: 200
  });

  await callApi({
    name: '16. Admin Inspect Active Stock Holds / Reservations',
    method: 'GET',
    path: '/api/v1/admin/inventory/reservations',
    jar: adminJar,
    expectedStatus: 200
  });

  if (targetVarId) {
    await callApi({
      name: '17. Admin Adjust Inventory Stock (RESTOCK)',
      method: 'POST',
      path: '/api/v1/admin/inventory/adjustments',
      jar: adminJar,
      csrfToken: adminCsrf,
      body: {
        variantId: targetVarId,
        quantity: 5,
        type: 'RESTOCK',
        reason: 'Atelier master craftsman batch inspection completed'
      },
      expectedStatus: 200
    });

    await callApi({
      name: '18. Admin Direct Stock Quantity Calibration',
      method: 'PATCH',
      path: `/api/v1/admin/inventory/${targetVarId}`,
      jar: adminJar,
      csrfToken: adminCsrf,
      body: { stock: 35 },
      expectedStatus: 200
    });
  }

  const adminOrdersRes = await callApi({
    name: '19. Admin List Store Orders',
    method: 'GET',
    path: '/api/v1/admin/orders?page=1&limit=25',
    jar: adminJar,
    expectedStatus: 200
  });
  const storeOrders = adminOrdersRes.data?.data?.items || adminOrdersRes.data?.data || [];
  const targetOrderId = testOrderId || (storeOrders.length > 0 ? storeOrders[0].id : null);

  if (targetOrderId) {
    await callApi({
      name: '20. Admin Get Order Detail',
      method: 'GET',
      path: `/api/v1/admin/orders/${targetOrderId}`,
      jar: adminJar,
      expectedStatus: 200
    });

    // Prepare order for state machine transition to PROCESSING by updating to CONFIRMED
    await prisma.order.update({
      where: { id: targetOrderId },
      data: { status: 'CONFIRMED' }
    });

    await callApi({
      name: '21. Admin Update Order State Machine (CONFIRMED -> PROCESSING)',
      method: 'PATCH',
      path: `/api/v1/admin/orders/${targetOrderId}/status`,
      jar: adminJar,
      csrfToken: adminCsrf,
      body: { status: 'PROCESSING' },
      expectedStatus: 200
    });

    await callApi({
      name: '22. Admin Manifest Order Shipment (PROCESSING -> SHIPPED)',
      method: 'POST',
      path: `/api/v1/admin/orders/${targetOrderId}/ship`,
      jar: adminJar,
      csrfToken: adminCsrf,
      body: {
        carrier: 'BlueDart Express',
        trackingNumber: `BD${Date.now()}`,
        trackingUrl: `https://bluedart.com/track/BD${Date.now()}`
      },
      expectedStatus: 200
    });
  }

  if (testPaymentId) {
    await callApi({
      name: '23. Admin Reconcile Payment with Gateway',
      method: 'POST',
      path: `/api/v1/admin/payments/${testPaymentId}/reconcile`,
      jar: adminJar,
      csrfToken: adminCsrf,
      expectedStatus: [200, 400, 502]
    });
  }

  const custRes = await callApi({
    name: '24. Admin List Customer Accounts',
    method: 'GET',
    path: '/api/v1/admin/customers?page=1&limit=25',
    jar: adminJar,
    expectedStatus: 200
  });
  const customers = custRes.data?.data?.items || custRes.data?.data || [];
  if (customers.length > 0) {
    adminCustomerId = customers[0].id;
  }

  const targetCustId = testUserId || adminCustomerId;
  if (targetCustId) {
    await callApi({
      name: '25. Admin Customer Profile Detail',
      method: 'GET',
      path: `/api/v1/admin/customers/${targetCustId}`,
      jar: adminJar,
      expectedStatus: 200
    });
  }

  const coupRes = await callApi({
    name: '26. Admin List Promotional Coupons',
    method: 'GET',
    path: '/api/v1/admin/coupons',
    jar: adminJar,
    expectedStatus: 200
  });
  const coupons = coupRes.data?.data || [];
  if (coupons.length > 0) {
    adminCouponId = coupons[0].id;
  }

  const newCouponCode = `ATELIER_${Date.now().toString(36).toUpperCase()}`;
  const createCoupRes = await callApi({
    name: '27. Admin Create Promotional Coupon',
    method: 'POST',
    path: '/api/v1/admin/coupons',
    jar: adminJar,
    csrfToken: adminCsrf,
    body: {
      code: newCouponCode,
      discountType: 'PERCENTAGE',
      discountValue: 15,
      minimumOrderPaise: 350000,
      usageLimit: 100
    },
    expectedStatus: 201
  });
  const createdCouponId = createCoupRes.data?.data?.id;
  const targetCoupId = createdCouponId || adminCouponId;

  if (targetCoupId) {
    await callApi({
      name: '28. Admin Update Promotional Coupon',
      method: 'PATCH',
      path: `/api/v1/admin/coupons/${targetCoupId}`,
      jar: adminJar,
      csrfToken: adminCsrf,
      body: { isActive: true },
      expectedStatus: 200
    });
  }

  await callApi({
    name: '29. Admin Audit Logs Immutable Trail',
    method: 'GET',
    path: '/api/v1/admin/audit-logs?limit=50',
    jar: adminJar,
    expectedStatus: 200
  });

  await callApi({
    name: '30. Admin System Telemetry & Worker Status',
    method: 'GET',
    path: '/api/v1/admin/metrics',
    jar: adminJar,
    expectedStatus: 200
  });

  // Presigned upload mode check (local mode returns 400 with PRESIGNED_UPLOAD_UNAVAILABLE)
  await callApi({
    name: '31. Admin Presigned Upload Mode Check',
    method: 'POST',
    path: '/api/v1/admin/uploads/presigned',
    jar: adminJar,
    csrfToken: adminCsrf,
    body: {
      filename: 'silk-texture.jpg',
      contentType: 'image/jpeg',
      sizeBytes: 102400
    },
    expectedStatus: [200, 400]
  });

  // Direct upload: valid 1x1 PNG image
  const minimalPngBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  await callApi({
    name: '32. Admin Direct Image Upload & Processing',
    method: 'POST',
    path: '/api/v1/admin/uploads/direct',
    jar: adminJar,
    csrfToken: adminCsrf,
    body: {
      filename: 'test-swatch.png',
      contentType: 'image/png',
      base64Data: minimalPngBase64
    },
    expectedStatus: [201, 200]
  });

  // -------------------------------------------------------------
  // MODULE 10: Webhooks & Callbacks
  // -------------------------------------------------------------
  console.log('\n--- MODULE 10: Webhooks & Callbacks ---');

  await callApi({
    name: '1. Shipping Logistics Webhook (Unconfigured/Unsigned Safeguard)',
    method: 'POST',
    path: '/api/v1/webhooks/shipping',
    body: {
      trackingNumber: 'BD12345678',
      status: 'DELIVERED',
      location: 'Bengaluru Fulfillment Center'
    },
    expectedStatus: [200, 401, 403, 503]
  });

  await callApi({
    name: '2. PhonePe Payment Gateway Callback',
    method: 'POST',
    path: '/api/v1/payments/phonepe/callback',
    body: {
      response: 'eyJyZXN1bHQiOiJTVUNDRVNTIn0='
    },
    expectedStatus: [200, 400, 401]
  });

  // Final logout & verification
  console.log('\n--- Finalizing Authentication & Cleanup ---');
  await callApi({
    name: 'Patron Logout & Session Invalidation',
    method: 'POST',
    path: '/api/v1/auth/logout',
    jar: patronJar,
    csrfToken: patronCsrf,
    expectedStatus: 200
  });

  await callApi({
    name: 'Verify Patron Session Revoked after Logout (Security 401 check)',
    method: 'GET',
    path: '/api/v1/auth/me',
    jar: patronJar,
    expectedStatus: 401
  });

  // Cleanup test user and admin temp session
  try {
    await prisma.session.deleteMany({ where: { tokenHash: adminTokenHash } });
    if (testUserId) {
      await prisma.session.deleteMany({ where: { userId: testUserId } });
      await prisma.emailVerificationToken.deleteMany({ where: { userId: testUserId } });
      await prisma.passwordResetToken.deleteMany({ where: { userId: testUserId } });
      await prisma.cartItem.deleteMany({ where: { cart: { userId: testUserId } } });
      await prisma.cart.deleteMany({ where: { userId: testUserId } });
      await prisma.address.deleteMany({ where: { userId: testUserId } });
      await prisma.review.deleteMany({ where: { userId: testUserId } });
      await prisma.wishlistItem.deleteMany({ where: { userId: testUserId } });
    }
    console.log('\n✓ Test harness data cleaned up successfully.');
  } catch (err) {
    console.log('Cleanup notice:', err.message);
  }

  // -------------------------------------------------------------
  // Summary & Report Generation
  // -------------------------------------------------------------
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = total - passed;
  const avgLatency = Math.round(results.reduce((acc, r) => acc + r.durationMs, 0) / (total || 1));

  console.log('\n=============================================================');
  console.log(` TOTAL ENDPOINTS TESTED: ${total}`);
  console.log(` PASSED: ${passed} | FAILED: ${failed} | SUCCESS RATE: ${((passed / total) * 100).toFixed(1)}%`);
  console.log(` AVERAGE LATENCY: ${avgLatency}ms`);
  console.log('=============================================================\n');

  const summaryData = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    totalTests: total,
    passedTests: passed,
    failedTests: failed,
    passRate: `${((passed / total) * 100).toFixed(1)}%`,
    averageLatencyMs: avgLatency,
    results
  };

  const reportPath = path.resolve('test_results_summary.json');
  fs.writeFileSync(reportPath, JSON.stringify(summaryData, null, 2), 'utf-8');
  console.log(`Saved detailed test telemetry to: ${reportPath}`);
}

runTestSuite()
  .catch(err => {
    console.error('Fatal test runner failure:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
