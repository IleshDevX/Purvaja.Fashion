import fs from 'node:fs';
import path from 'node:path';

const collection = {
  info: {
    _postman_id: 'purvaja-fashion-ecommerce-master-api',
    name: 'Purvaja Fashion E-Commerce API',
    description: 'Master Postman Collection covering all endpoints of Purvaja Fashion E-Commerce platform: System Health, Authentication, Product Catalog, Bag/Cart, Addresses, Checkout, Payments, Orders, Wishlist, Newsletter, and Admin Operations.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
  },
  variable: [
    { key: 'baseUrl', value: 'http://localhost:5001', type: 'string' },
    { key: 'csrfToken', value: '', type: 'string' },
    { key: 'productId', value: '', type: 'string' },
    { key: 'productSlug', value: 'egyptian-cotton-formal-shirt-white', type: 'string' },
    { key: 'variantId', value: '', type: 'string' },
    { key: 'cartItemId', value: '', type: 'string' },
    { key: 'addressId', value: '', type: 'string' },
    { key: 'orderId', value: '', type: 'string' },
    { key: 'paymentId', value: '', type: 'string' },
    { key: 'adminProductId', value: '', type: 'string' },
    { key: 'categoryId', value: '', type: 'string' },
    { key: 'couponId', value: '', type: 'string' },
    { key: 'customerId', value: '', type: 'string' }
  ],
  item: []
};

function cleanPathSegments(p) {
  const clean = p.startsWith('/') ? p.slice(1) : p;
  const withoutQuery = clean.split('?')[0];
  return withoutQuery.split('/');
}

function createRequest(name, method, requestPath, body = null, headers = [], tests = null) {
  const allHeaders = [...headers];
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    if (!allHeaders.some(h => h.key.toLowerCase() === 'x-csrf-token')) {
      allHeaders.push({ key: 'X-CSRF-Token', value: '{{csrfToken}}', type: 'text' });
    }
  }
  if (body && !allHeaders.some(h => h.key.toLowerCase() === 'content-type')) {
    allHeaders.push({ key: 'Content-Type', value: 'application/json', type: 'text' });
  }

  const queryParams = [];
  if (requestPath.includes('?')) {
    const qs = requestPath.split('?')[1];
    for (const part of qs.split('&')) {
      const [k, v] = part.split('=');
      queryParams.push({ key: decodeURIComponent(k), value: decodeURIComponent(v || '') });
    }
  }

  const item = {
    name,
    request: {
      method,
      header: allHeaders,
      url: {
        raw: '{{baseUrl}}' + requestPath,
        host: ['{{baseUrl}}'],
        path: cleanPathSegments(requestPath),
        ...(queryParams.length > 0 ? { query: queryParams } : {})
      }
    }
  };

  if (body) {
    item.request.body = {
      mode: 'raw',
      raw: typeof body === 'string' ? body : JSON.stringify(body, null, 2),
      options: { raw: { language: 'json' } }
    };
  }

  if (tests) {
    item.event = [{
      listen: 'test',
      script: {
        type: 'text/javascript',
        exec: Array.isArray(tests) ? tests : [tests]
      }
    }];
  }

  return item;
}

// 01. System & Health
collection.item.push({
  name: '01. System & Health',
  item: [
    createRequest('1. Liveness Probe (/healthz)', 'GET', '/healthz'),
    createRequest('2. Readiness Probe (/readyz)', 'GET', '/readyz'),
    createRequest('3. Health Base (/health)', 'GET', '/health'),
    createRequest('4. Health Readiness (/health/ready)', 'GET', '/health/ready')
  ]
});

// 02. Authentication & Account
collection.item.push({
  name: '02. Authentication & Account',
  item: [
    createRequest('1. Get CSRF Token', 'GET', '/api/v1/auth/csrf', null, [], [
      'const res = pm.response.json();',
      'if (res.data && res.data.csrfToken) {',
      '  pm.collectionVariables.set("csrfToken", res.data.csrfToken);',
      '  pm.test("CSRF Token captured", () => pm.expect(res.data.csrfToken).to.be.a("string"));',
      '}'
    ]),
    createRequest('2. Register Patron', 'POST', '/api/v1/auth/register', {
      firstName: 'Aarav',
      lastName: 'Patel',
      email: 'patron_{{$timestamp}}@example.invalid',
      password: 'SecurePassword123!',
      confirmPassword: 'SecurePassword123!',
      phone: '+919876543210'
    }),
    createRequest('3. Verify Email (OTP)', 'POST', '/api/v1/auth/verify-email', {
      email: 'patron@example.invalid',
      otp: '123456'
    }, [], [
      'const res = pm.response.json();',
      'if (res.data && res.data.csrfToken) {',
      '  pm.collectionVariables.set("csrfToken", res.data.csrfToken);',
      '}'
    ]),
    createRequest('4. Resend Verification Code', 'POST', '/api/v1/auth/resend-verification', {
      email: 'patron@example.invalid'
    }),
    createRequest('5. Login', 'POST', '/api/v1/auth/login', {
      email: 'admin@purvaja.fashion',
      password: 'SecurePassword123!'
    }, [], [
      'const res = pm.response.json();',
      'if (res.data && res.data.csrfToken) {',
      '  pm.collectionVariables.set("csrfToken", res.data.csrfToken);',
      '}'
    ]),
    createRequest('6. Get Current Profile (/me)', 'GET', '/api/v1/auth/me'),
    createRequest('7. Update Profile Preferences', 'PATCH', '/api/v1/auth/me', {
      firstName: 'Aarav',
      preferredFit: 'Slim',
      preferredCollar: 'Spread Collar'
    }),
    createRequest('8. Forgot Password', 'POST', '/api/v1/auth/forgot-password', {
      email: 'patron@example.invalid'
    }),
    createRequest('9. Reset Password', 'POST', '/api/v1/auth/reset-password', {
      token: 'sample-reset-token-with-minimum-32-characters-length',
      password: 'NewSecurePassword123!',
      confirmPassword: 'NewSecurePassword123!'
    }),
    createRequest('10. Logout', 'POST', '/api/v1/auth/logout')
  ]
});

// 03. Catalog & Products
collection.item.push({
  name: '03. Catalog & Products',
  item: [
    createRequest('1. List Products (Filtered)', 'GET', '/api/v1/products?limit=10&page=1&inStock=true&category=shirts&sort=featured', null, [], [
      'const res = pm.response.json();',
      'if (res.data && res.data.items && res.data.items.length > 0) {',
      '  const first = res.data.items[0];',
      '  pm.collectionVariables.set("productId", first.id);',
      '  pm.collectionVariables.set("productSlug", first.slug);',
      '  if (first.variants && first.variants.length > 0) {',
      '    pm.collectionVariables.set("variantId", first.variants[0].id);',
      '  }',
      '}'
    ]),
    createRequest('2. Get Product Details', 'GET', '/api/v1/products/{{productSlug}}'),
    createRequest('3. List Product Reviews', 'GET', '/api/v1/products/{{productId}}/reviews?limit=10&sort=newest'),
    createRequest('4. Submit Product Review', 'POST', '/api/v1/products/{{productId}}/reviews', {
      rating: 5,
      title: 'Superb Fabric & Cut',
      comment: 'The collar architecture and drape of the Oxford weave are truly exemplary.'
    })
  ]
});

// 04. Shopping Cart
collection.item.push({
  name: '04. Shopping Cart',
  item: [
    createRequest('1. Get Active Cart', 'GET', '/api/v1/cart'),
    createRequest('2. Add Item to Cart', 'POST', '/api/v1/cart/items', {
      variantId: '{{variantId}}',
      quantity: 1
    }, [], [
      'const res = pm.response.json();',
      'if (res.data && res.data.items && res.data.items.length > 0) {',
      '  pm.collectionVariables.set("cartItemId", res.data.items[0].id);',
      '}'
    ]),
    createRequest('3. Update Item Quantity', 'PATCH', '/api/v1/cart/items/{{cartItemId}}', {
      quantity: 2
    }),
    createRequest('4. Merge Guest Cart', 'POST', '/api/v1/cart/merge', {
      mergeId: '{{$guid}}',
      items: [{ variantId: '{{variantId}}', quantity: 1 }]
    }),
    createRequest('5. Remove Item from Cart', 'DELETE', '/api/v1/cart/items/{{cartItemId}}'),
    createRequest('6. Clear Entire Cart', 'DELETE', '/api/v1/cart')
  ]
});

// 05. Address Book
collection.item.push({
  name: '05. Address Book',
  item: [
    createRequest('1. List Addresses', 'GET', '/api/v1/addresses'),
    createRequest('2. Create Address', 'POST', '/api/v1/addresses', {
      recipientName: 'Aarav Patel',
      phone: '+919876543210',
      line1: 'Flat 402, Royal Palms',
      line2: '100 Feet Road, Indiranagar',
      city: 'Bengaluru',
      state: 'Karnataka',
      postalCode: '560038',
      country: 'IN',
      isDefault: true
    }, [], [
      'const res = pm.response.json();',
      'if (res.data && res.data.id) {',
      '  pm.collectionVariables.set("addressId", res.data.id);',
      '}'
    ]),
    createRequest('3. Update Address', 'PATCH', '/api/v1/addresses/{{addressId}}', {
      recipientName: 'Aarav Patel (Home)',
      isDefault: true
    }),
    createRequest('4. Delete Address', 'DELETE', '/api/v1/addresses/{{addressId}}')
  ]
});

// 06. Checkout & Orders
collection.item.push({
  name: '06. Checkout & Orders',
  item: [
    createRequest('1. Validate Coupon Code', 'POST', '/api/v1/coupons/validate', {
      code: 'WELCOME10',
      subtotalPaise: 499900
    }),
    createRequest('2. Checkout / Place Order', 'POST', '/api/v1/checkout', {
      addressId: '{{addressId}}',
      deliveryOptionId: 'standard',
      couponCode: 'WELCOME10'
    }, [
      { key: 'Idempotency-Key', value: 'idem-{{$guid}}', type: 'text' }
    ], [
      'const res = pm.response.json();',
      'if (res.data && res.data.order) {',
      '  pm.collectionVariables.set("orderId", res.data.order.id);',
      '  if (res.data.payment) {',
      '    pm.collectionVariables.set("paymentId", res.data.payment.id);',
      '  }',
      '}'
    ]),
    createRequest('3. Initiate Gateway Payment', 'POST', '/api/v1/payments/{{paymentId}}/initiate'),
    createRequest('4. Get Payment Status', 'GET', '/api/v1/payments/{{paymentId}}/status'),
    createRequest('5. Demo Payment Simulation', 'POST', '/api/v1/payments/{{paymentId}}/demo-result', {
      result: 'SUCCESS'
    }),
    createRequest('6. List Customer Orders', 'GET', '/api/v1/orders?page=1&limit=10&sort=newest'),
    createRequest('7. Get Order Details', 'GET', '/api/v1/orders/{{orderId}}'),
    createRequest('8. Cancel Order', 'POST', '/api/v1/orders/{{orderId}}/cancel', {
      reason: 'Preferences changed'
    }),
    createRequest('9. Request Order Return', 'POST', '/api/v1/orders/{{orderId}}/returns', {
      reason: 'Sizing adjustment required'
    })
  ]
});

// 07. Wishlist
collection.item.push({
  name: '07. Wishlist',
  item: [
    createRequest('1. Get Wishlist', 'GET', '/api/v1/wishlist'),
    createRequest('2. Add to Wishlist', 'POST', '/api/v1/wishlist', {
      productId: '{{productId}}'
    }),
    createRequest('3. Remove from Wishlist', 'DELETE', '/api/v1/wishlist/{{productId}}'),
    createRequest('4. Sync Wishlist', 'POST', '/api/v1/wishlist/sync', {
      productIds: ['{{productId}}']
    })
  ]
});

// 08. Newsletter
collection.item.push({
  name: '08. Newsletter',
  item: [
    createRequest('1. Subscribe to Newsletter', 'POST', '/api/v1/newsletter/subscriptions', {
      email: 'patron_{{$timestamp}}@example.invalid'
    })
  ]
});

// 09. Admin Operations
collection.item.push({
  name: '09. Admin Operations',
  item: [
    createRequest('1. Dashboard Metrics', 'GET', '/api/v1/admin/dashboard'),
    createRequest('2. List Products (Admin)', 'GET', '/api/v1/admin/products?page=1&limit=25', null, [], [
      'const res = pm.response.json();',
      'if (res.data && res.data.items && res.data.items.length > 0) {',
      '  pm.collectionVariables.set("adminProductId", res.data.items[0].id);',
      '}'
    ]),
    createRequest('3. Create Garment Product', 'POST', '/api/v1/admin/products', {
      name: 'Atelier Royal Silk Shirt',
      slug: 'atelier-royal-silk-shirt-{{$timestamp}}',
      description: 'Handcrafted ceremonial silk shirt with hand-stitched detailing.',
      basePricePaise: 549900,
      fit: 'Regular',
      fabric: 'Mulberry Silk',
      collar: 'Spread Collar',
      sleeve: 'Full Sleeve',
      pattern: 'Solid',
      images: [{ url: '/images/products/silk-shirt.jpg', isPrimary: true }]
    }),
    createRequest('4. Get Admin Product Detail', 'GET', '/api/v1/admin/products/{{adminProductId}}'),
    createRequest('5. Update Product Details', 'PATCH', '/api/v1/admin/products/{{adminProductId}}', {
      description: 'Updated bespoke garment specifications and thread count verification.'
    }),
    createRequest('6. List Categories', 'GET', '/api/v1/admin/categories', null, [], [
      'const res = pm.response.json();',
      'if (res.data && res.data.length > 0) {',
      '  pm.collectionVariables.set("categoryId", res.data[0].id);',
      '}'
    ]),
    createRequest('7. Create Category', 'POST', '/api/v1/admin/categories', {
      name: 'Evening Black Tie',
      slug: 'evening-black-tie-{{$timestamp}}',
      description: 'Refined garments curated for formal evening galas.'
    }),
    createRequest('8. Update Category', 'PATCH', '/api/v1/admin/categories/{{categoryId}}', {
      description: 'Updated luxury evening collection description.'
    }),
    createRequest('9. List Variants', 'GET', '/api/v1/admin/variants?limit=25'),
    createRequest('10. Create Variant', 'POST', '/api/v1/admin/variants', {
      productId: '{{adminProductId}}',
      sku: 'ATELIER-42-WHT-{{$timestamp}}',
      size: '42 (L)',
      colorName: 'Pure Ivory',
      colorHex: '#FFFFF0',
      stockQuantity: 20,
      lowStockThreshold: 5
    }),
    createRequest('11. Update Variant', 'PATCH', '/api/v1/admin/variants/{{variantId}}', {
      stockQuantity: 25
    }),
    createRequest('12. Inventory Overview', 'GET', '/api/v1/admin/inventory?filter=all'),
    createRequest('13. Inventory Movement Logs', 'GET', '/api/v1/admin/inventory/movements?limit=25'),
    createRequest('14. Active Stock Reservations', 'GET', '/api/v1/admin/inventory/reservations'),
    createRequest('15. Adjust Stock Quantity', 'POST', '/api/v1/admin/inventory/adjustments', {
      variantId: '{{variantId}}',
      quantity: 10,
      type: 'RESTOCK',
      reason: 'Atelier seasonal production batch arrival'
    }),
    createRequest('16. Set Variant Stock Direct', 'PATCH', '/api/v1/admin/inventory/{{variantId}}', {
      stock: 50
    }),
    createRequest('17. List Orders (Admin)', 'GET', '/api/v1/admin/orders?page=1&limit=25'),
    createRequest('18. Get Order Detail (Admin)', 'GET', '/api/v1/admin/orders/{{orderId}}'),
    createRequest('19. Update Order Status', 'PATCH', '/api/v1/admin/orders/{{orderId}}/status', {
      status: 'PROCESSING'
    }),
    createRequest('20. Ship Order (Fulfillment)', 'POST', '/api/v1/admin/orders/{{orderId}}/ship', {
      carrier: 'BlueDart Express',
      trackingNumber: 'BD{{$timestamp}}',
      trackingUrl: 'https://bluedart.com/track/BD{{$timestamp}}'
    }),
    createRequest('21. Reconcile Payment Gateway', 'POST', '/api/v1/admin/payments/{{paymentId}}/reconcile'),
    createRequest('22. List Customers (Admin)', 'GET', '/api/v1/admin/customers?page=1&limit=25', null, [], [
      'const res = pm.response.json();',
      'if (res.data && res.data.items && res.data.items.length > 0) {',
      '  pm.collectionVariables.set("customerId", res.data.items[0].id);',
      '}'
    ]),
    createRequest('23. Customer Profile Detail', 'GET', '/api/v1/admin/customers/{{customerId}}'),
    createRequest('24. List Promotional Coupons', 'GET', '/api/v1/admin/coupons', null, [], [
      'const res = pm.response.json();',
      'if (res.data && res.data.length > 0) {',
      '  pm.collectionVariables.set("couponId", res.data[0].id);',
      '}'
    ]),
    createRequest('25. Create Promotional Coupon', 'POST', '/api/v1/admin/coupons', {
      code: 'ATELIER{{$timestamp}}',
      discountType: 'PERCENTAGE',
      discountValue: 15,
      minimumOrderPaise: 300000,
      usageLimit: 50
    }),
    createRequest('26. Update Promotional Coupon', 'PATCH', '/api/v1/admin/coupons/{{couponId}}', {
      isActive: true
    }),
    createRequest('27. Audit Logs', 'GET', '/api/v1/admin/audit-logs?limit=50'),
    createRequest('28. Operational Metrics', 'GET', '/api/v1/admin/metrics')
  ]
});

// 10. Webhooks & Callbacks
collection.item.push({
  name: '10. Webhooks & Callbacks',
  item: [
    createRequest('1. Shipping Logistics Webhook', 'POST', '/api/v1/webhooks/shipping', {
      trackingNumber: 'BD12345678',
      status: 'DELIVERED',
      location: 'Bengaluru Fulfillment Center',
      timestamp: new Date().toISOString()
    }),
    createRequest('2. PhonePe Payment Callback', 'POST', '/api/v1/payments/phonepe/callback', {
      response: 'eyJyZXN1bHQiOiJTVUNDRVNTIn0='
    })
  ]
});

const outputPath = path.resolve('Purvaja_Fashion_Postman_Collection.json');
fs.writeFileSync(outputPath, JSON.stringify(collection, null, 2), 'utf-8');

let total = 0;
for (const folder of collection.item) {
  total += folder.item.length;
}
console.log(`Successfully generated Postman Collection: ${outputPath}`);
console.log(`Total folders: ${collection.item.length}, Total requests: ${total}`);
