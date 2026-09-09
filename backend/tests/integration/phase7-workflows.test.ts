import { randomUUID } from 'node:crypto';
import argon2 from 'argon2';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app } from '../../src/app.js';
import { getPrismaClient } from '../../src/config/database.js';
import { CSRF_COOKIE } from '../../src/utils/auth.js';

const prisma=getPrismaClient();
const password='Phase7Secure123!';
const suffix=randomUUID();
const adminEmail=`phase7-admin-${suffix}@example.invalid`;
const customerEmail=`phase7-customer-${suffix}@example.invalid`;
const newsletterEmail=`Phase7-News-${suffix}@Example.Invalid`;
let adminId=''; let customerId=''; let categoryId=''; let productId=''; let variantId='';
let adminAgent:ReturnType<typeof request.agent>; let customerAgent:ReturnType<typeof request.agent>; let adminCsrf=''; let customerCsrf='';

const csrfFrom=(response:request.Response)=>(response.headers['set-cookie'] as unknown as string[])
  .find(cookie=>cookie.startsWith(`${CSRF_COOKIE}=`))!.split(';')[0]!.split('=')[1]!;

beforeAll(async()=>{
  const hash=await argon2.hash(password);
  const [admin,customer,category]=await Promise.all([
    prisma.user.create({data:{email:adminEmail,passwordHash:hash,role:'ADMIN',emailVerifiedAt:new Date()}}),
    prisma.user.create({data:{email:customerEmail,passwordHash:hash,emailVerifiedAt:new Date()}}),
    prisma.category.create({data:{name:`Phase 7 ${suffix}`,slug:`phase-7-${suffix}`}}),
  ]);
  adminId=admin.id; customerId=customer.id; categoryId=category.id;
  adminAgent=request.agent(app); customerAgent=request.agent(app);
  adminCsrf=csrfFrom(await adminAgent.post('/api/v1/auth/login').send({email:adminEmail,password}));
  customerCsrf=csrfFrom(await customerAgent.post('/api/v1/auth/login').send({email:customerEmail,password}));
});

afterAll(async()=>{
  await prisma.newsletterSubscription.deleteMany({where:{email:newsletterEmail.toLowerCase()}});
  if(variantId){await prisma.inventoryMovement.deleteMany({where:{variantId}});await prisma.productVariant.deleteMany({where:{id:variantId}});}
  if(productId){await prisma.productCategory.deleteMany({where:{productId}});await prisma.productImage.deleteMany({where:{productId}});await prisma.auditLog.deleteMany({where:{entityId:productId}});await prisma.product.deleteMany({where:{id:productId}});}
  await prisma.category.deleteMany({where:{id:categoryId}});
  await prisma.auditLog.deleteMany({where:{actorId:{in:[adminId,customerId]}}});
  await prisma.session.deleteMany({where:{userId:{in:[adminId,customerId]}}});
  await prisma.user.deleteMany({where:{id:{in:[adminId,customerId]}}});
});

describe('Phase 7 product and customer workflows',()=>{
  it('persists profile preferences across a fresh authenticated session',async()=>{
    const updated=await customerAgent.patch('/api/v1/auth/me').set('X-CSRF-Token',customerCsrf).send({
      phone:'+91 9876543210',preferredFit:'Regular',preferredCollar:'Cutaway Collar',
    });
    expect(updated.status).toBe(200);
    const fresh=request.agent(app);
    expect((await fresh.post('/api/v1/auth/login').send({email:customerEmail,password})).status).toBe(200);
    const me=await fresh.get('/api/v1/auth/me');
    expect(me.body.data.user).toMatchObject({phone:'+91 9876543210',preferredFit:'Regular',preferredCollar:'Cutaway Collar'});
  });

  it('records newsletter consent idempotently without claiming delivery',async()=>{
    const first=await request(app).post('/api/v1/newsletter/subscriptions').send({email:newsletterEmail,consentSource:'storefront_footer'});
    const second=await request(app).post('/api/v1/newsletter/subscriptions').send({email:newsletterEmail.toLowerCase(),consentSource:'storefront_footer'});
    expect(first.status).toBe(201); expect(first.body.data).toMatchObject({status:'PENDING_PROVIDER',deliveryEnabled:false}); expect(second.status).toBe(201);
    expect(await prisma.newsletterSubscription.count({where:{email:newsletterEmail.toLowerCase()}})).toBe(1);
  });

  it('enforces publication readiness and preserves explicit empty category/image updates',async()=>{
    const created=await adminAgent.post('/api/v1/admin/products').set('X-CSRF-Token',adminCsrf).send({
      name:`Phase 7 Product ${suffix}`,slug:`phase-7-product-${suffix}`,description:'A complete Phase 7 workflow product.',brand:'Purvaja',basePricePaise:249900,status:'DRAFT',categoryIds:[],images:[],
    });
    expect(created.status).toBe(201); productId=created.body.data.id;
    const rejected=await adminAgent.patch(`/api/v1/admin/products/${productId}`).set('X-CSRF-Token',adminCsrf).send({status:'ACTIVE'});
    expect(rejected.status).toBe(400); expect(rejected.body.error.code).toBe('PRODUCT_NOT_PUBLISHABLE');
    const variant=await adminAgent.post('/api/v1/admin/variants').set('X-CSRF-Token',adminCsrf).send({
      productId,sku:`P7-${suffix}`,size:'42 (L)',colorName:'Midnight',colorHex:'#112233',stockQuantity:7,lowStockThreshold:2,status:'ACTIVE',
    });
    expect(variant.status).toBe(201); variantId=variant.body.data.id;
    const published=await adminAgent.patch(`/api/v1/admin/products/${productId}`).set('X-CSRF-Token',adminCsrf).send({
      fit:'Regular',fabric:'Oxford Cotton',collar:'Cutaway Collar',sleeve:'Full Sleeve',pattern:'Solid',
      categoryIds:[categoryId],images:[{url:'/images/phase7-product.jpg',isPrimary:true}],status:'ACTIVE',
    });
    expect(published.status).toBe(200);
    const publicProduct=await request(app).get(`/api/v1/products/phase-7-product-${suffix}`);
    expect(publicProduct.status).toBe(200); expect(publicProduct.body.data.product.id).toBe(productId);
    const discontinue=await adminAgent.patch(`/api/v1/admin/variants/${variantId}`).set('X-CSRF-Token',adminCsrf).send({status:'DISCONTINUED'});
    expect(discontinue.status).toBe(400); expect(discontinue.body.error.code).toBe('PRODUCT_NOT_PUBLISHABLE');
    const deactivateCategory=await adminAgent.patch(`/api/v1/admin/categories/${categoryId}`).set('X-CSRF-Token',adminCsrf).send({isActive:false});
    expect(deactivateCategory.status).toBe(400); expect(deactivateCategory.body.error.code).toBe('PRODUCT_NOT_PUBLISHABLE');
    const cleared=await adminAgent.patch(`/api/v1/admin/products/${productId}`).set('X-CSRF-Token',adminCsrf).send({status:'DRAFT',categoryIds:[],images:[]});
    expect(cleared.status).toBe(200);
    expect(await prisma.productCategory.count({where:{productId}})).toBe(0);
    expect(await prisma.productImage.count({where:{productId}})).toBe(0);
  });
});
