import { getPrismaClient } from '../config/database.js';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors.js';
import type { Prisma } from '../generated/prisma/client.js';
import type { z } from 'zod';
import type { adjustment, category, coupon, inventoryQuery, product, variant } from '../validators/admin.validator.js';
type ProductInput = z.output<typeof product>; type CategoryInput = z.output<typeof category>; type VariantInput = z.output<typeof variant>; type AdjustmentInput = z.output<typeof adjustment>; type CouponInput = z.output<typeof coupon>; type InventoryQuery = z.output<typeof inventoryQuery>;
const page = <T>(items: T[], total: number, current: number, limit: number) => ({ items, page: current, limit, total, totalPages: Math.ceil(total / limit) });

export class AdminService {
  private get prisma() { return getPrismaClient(); }
  private async audit(actorId: string, action: string, entityType: string, entityId: string, metadata?: object) { await this.prisma.auditLog.create({ data: { actorId, action, entityType, entityId, metadata } }); }
  async dashboard() { const [totalProducts, totalCustomers, totalOrders, pendingPayments, confirmedOrders, processingOrders, lowStockVariants, outOfStockVariants, recentOrders, revenue, units] = await this.prisma.$transaction([this.prisma.product.count(), this.prisma.user.count({ where: { role: 'CUSTOMER' } }), this.prisma.order.count(), this.prisma.order.count({ where: { paymentStatus: { in: ['PENDING', 'INITIATED'] } } }), this.prisma.order.count({ where: { status: 'CONFIRMED' } }), this.prisma.order.count({ where: { status: 'PROCESSING' } }), this.prisma.productVariant.count({ where: { stockQuantity: { gt: 0, lte: 10 } } }), this.prisma.productVariant.count({ where: { stockQuantity: 0 } }), this.prisma.order.findMany({ take: 10, orderBy: { createdAt: 'desc' }, include: { user: { select: { id: true, email: true, firstName: true, lastName: true } }, items: true, payments: { select: { provider: true }, take: 1 } } }), this.prisma.order.aggregate({ where: { paymentStatus: { in: ['SUCCESS', 'PAID'] } }, _sum: { totalPaise: true } }), this.prisma.orderItem.aggregate({ _sum: { quantity: true } })]); return { totalProducts, totalCustomers, totalOrders, pendingPayments, confirmedOrders, processingOrders, lowStockVariants, outOfStockVariants, recentOrders, totalRevenue: (revenue._sum.totalPaise ?? 0) / 100, shirtsSold: units._sum.quantity ?? 0, activeCustomers: totalCustomers, pendingOrders: pendingPayments, lowStockCount: lowStockVariants }; }
  async products(q: { page: number; limit: number; search?: string }) { const where = q.search ? { OR: [{ name: { contains: q.search, mode: 'insensitive' as const } }, { slug: { contains: q.search, mode: 'insensitive' as const } }] } : {}; const [items,total] = await Promise.all([this.prisma.product.findMany({ where, select: { id: true, name: true, slug: true, basePricePaise: true, status: true, categories: { select: { category: { select: { id: true, name: true, slug: true } } } }, variants: { select: { stockQuantity: true } } }, orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }], skip: (q.page - 1) * q.limit, take: q.limit }), this.prisma.product.count({ where })]); return page(items,total,q.page,q.limit); }
  async product(id:string) { const item=await this.prisma.product.findUnique({where:{id},include:{categories:{include:{category:true}},variants:true,images:true}}); if(!item) throw new NotFoundError('Product was not found.','PRODUCT_NOT_FOUND'); return item; }
  async createProduct(actor: string, value: ProductInput) { const { categoryIds, ...data } = value; try { const result = await this.prisma.product.create({ data: { ...data, categories: categoryIds ? { create: categoryIds.map(categoryId => ({ categoryId })) } : undefined }, include: { categories: { include: { category: true } }, variants: true, images: true } }); await this.audit(actor,'PRODUCT_CREATED','product',result.id,{ slug: result.slug }); return result; } catch { throw new ConflictError('Product slug already exists.','DUPLICATE_SLUG'); } }
  async updateProduct(actor: string, id: string, value: Partial<ProductInput>) { const exists=await this.prisma.product.findUnique({where:{id}}); if(!exists) throw new NotFoundError('Product was not found.','PRODUCT_NOT_FOUND'); const { categoryIds, ...data } = value; try { const result=await this.prisma.product.update({where:{id},data:{...data,categories:categoryIds?{deleteMany:{},create:categoryIds.map(categoryId=>({categoryId}))}:undefined},include:{categories:{include:{category:true}},variants:true,images:true}}); await this.audit(actor,'PRODUCT_UPDATED','product',id); return result; } catch { throw new ConflictError('Product slug already exists.','DUPLICATE_SLUG'); } }
  async categories() { return this.prisma.category.findMany({ orderBy: { name: 'asc' } }); }
  async createCategory(actor:string,value:CategoryInput) { try { const result=await this.prisma.category.create({data:value}); await this.audit(actor,'CATEGORY_CREATED','category',result.id); return result; } catch { throw new ConflictError('Category slug already exists.','DUPLICATE_SLUG'); } }
  async updateCategory(actor:string,id:string,value:Partial<CategoryInput>) { try { const result=await this.prisma.category.update({where:{id},data:value}); await this.audit(actor,'CATEGORY_UPDATED','category',id); return result; } catch { throw new ConflictError('Category was not found or slug already exists.','CATEGORY_CONFLICT'); } }
  async variants(q:{page:number;limit:number;search?:string}) { const where=q.search?{OR:[{sku:{contains:q.search,mode:'insensitive' as const}},{size:{contains:q.search,mode:'insensitive' as const}},{colorName:{contains:q.search,mode:'insensitive' as const}},{product:{name:{contains:q.search,mode:'insensitive' as const}}}]}:{}; const [items,total]=await Promise.all([this.prisma.productVariant.findMany({where,include:{product:{select:{id:true,name:true,slug:true}}},orderBy:{updatedAt:'desc'},skip:(q.page-1)*q.limit,take:q.limit}),this.prisma.productVariant.count({where})]); return page(items,total,q.page,q.limit); }
  async createVariant(actor:string,value:VariantInput) { if(!value.productId) throw new ValidationError('productId is required.'); try { const result=await this.prisma.productVariant.create({data:{...value,productId:value.productId,priceOverridePaise:value.priceOverridePaise ?? undefined}}); await this.audit(actor,'VARIANT_CREATED','variant',result.id,{sku:result.sku}); return result; } catch { throw new ConflictError('Variant SKU or size/color combination already exists.','DUPLICATE_VARIANT'); } }
  async updateVariant(actor:string,id:string,value:Partial<VariantInput>) { try { const result=await this.prisma.productVariant.update({where:{id},data:{...value,productId:undefined}}); await this.audit(actor,'VARIANT_UPDATED','variant',id); return result; } catch { throw new ConflictError('Variant was not found or SKU already exists.','VARIANT_CONFLICT'); } }
  async inventory(q: InventoryQuery) {
    const searchWhere: Prisma.ProductVariantWhereInput = q.search
      ? {
          OR: [
            { sku: { contains: q.search, mode: 'insensitive' as const } },
            { colorName: { contains: q.search, mode: 'insensitive' as const } },
            { size: { contains: q.search, mode: 'insensitive' as const } },
            { product: { name: { contains: q.search, mode: 'insensitive' as const } } },
            { product: { slug: { contains: q.search, mode: 'insensitive' as const } } },
          ],
        }
      : {};

    const stockWhere: Prisma.ProductVariantWhereInput =
      q.filter === 'out_of_stock'
        ? { stockQuantity: 0 }
        : q.filter === 'low_stock'
          ? { stockQuantity: { gt: 0, lte: 10 } }
          : q.filter === 'in_stock'
            ? { stockQuantity: { gt: 10 } }
            : {};

    const where: Prisma.ProductVariantWhereInput = {
      ...searchWhere,
      ...stockWhere,
    };

    const [variants, total] = await Promise.all([
      this.prisma.productVariant.findMany({
        where,
        select: {
          id: true,
          productId: true,
          sku: true,
          colorName: true,
          size: true,
          stockQuantity: true,
          lowStockThreshold: true,
          updatedAt: true,
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          inventoryReservations: {
            where: { status: 'ACTIVE' },
            select: { quantity: true },
          },
        },
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      this.prisma.productVariant.count({ where }),
    ]);

    const items = variants.map(v => {
      const reserved = v.inventoryReservations.reduce((s, r) => s + r.quantity, 0);
      const available = Math.max(0, v.stockQuantity - reserved);
      const status: 'out_of_stock' | 'low_stock' | 'in_stock' =
        available <= 0
          ? 'out_of_stock'
          : available <= v.lowStockThreshold
            ? 'low_stock'
            : 'in_stock';
      return {
        id: v.id,
        shirtId: v.productId,
        shirtName: v.product.name,
        slug: v.product.slug,
        sku: v.sku,
        color: v.colorName,
        size: v.size,
        stock: v.stockQuantity,
        reservedStock: reserved,
        availableStock: available,
        lowStockThreshold: v.lowStockThreshold,
        status,
        lastUpdated: v.updatedAt.toISOString(),
      };
    });

    return page(items, total, q.page, q.limit);
  }
  async movements(q:{page:number;limit:number}) { const [items,total]=await Promise.all([this.prisma.inventoryMovement.findMany({include:{variant:{include:{product:{select:{name:true}}}}},orderBy:{createdAt:'desc'},skip:(q.page-1)*q.limit,take:q.limit}),this.prisma.inventoryMovement.count()]);return page(items,total,q.page,q.limit); }
  async reservations(q:{page:number;limit:number}) { const [items,total]=await Promise.all([this.prisma.inventoryReservation.findMany({include:{order:{select:{id:true,orderNumber:true}},variant:{include:{product:{select:{name:true}}}}},orderBy:{createdAt:'desc'},skip:(q.page-1)*q.limit,take:q.limit}),this.prisma.inventoryReservation.count()]);return page(items,total,q.page,q.limit); }
  async adjust(actor:string,value:AdjustmentInput) { return this.prisma.$transaction(async tx=>{const variant=await tx.productVariant.findUnique({where:{id:value.variantId}}); if(!variant) throw new NotFoundError('Variant was not found.','VARIANT_NOT_FOUND'); const next=variant.stockQuantity+value.quantity; if(next<0) throw new ValidationError('Stock cannot become negative.',undefined,'INSUFFICIENT_STOCK'); const updated=await tx.productVariant.update({where:{id:variant.id},data:{stockQuantity:next}}); await tx.inventoryMovement.create({data:{variantId:variant.id,type:value.type,quantity:value.quantity,previousQuantity:variant.stockQuantity,resultingQuantity:next,reason:value.reason,referenceType:'ADMIN_ADJUSTMENT'}}); await tx.auditLog.create({data:{actorId:actor,action:'INVENTORY_ADJUSTED',entityType:'variant',entityId:variant.id,metadata:{quantity:value.quantity,previous:variant.stockQuantity,resulting:next,type:value.type}}}); return updated; }); }
  async setStock(actor:string,variantId:string,stock:number) { const current=await this.prisma.productVariant.findUnique({where:{id:variantId},select:{stockQuantity:true}}); if(!current) throw new NotFoundError('Variant was not found.','VARIANT_NOT_FOUND'); return this.adjust(actor,{variantId,quantity:stock-current.stockQuantity,type:'CORRECTION',reason:'Admin stock correction'}); }
  async orders(q:{page:number;limit:number;search?:string}) { const where=q.search?{OR:[{orderNumber:{contains:q.search,mode:'insensitive' as const}},{user:{email:{contains:q.search,mode:'insensitive' as const}}}]}:{}; const [items,total]=await Promise.all([this.prisma.order.findMany({where,select:{id:true,orderNumber:true,status:true,paymentStatus:true,totalPaise:true,createdAt:true,user:{select:{id:true,email:true,firstName:true,lastName:true}},items:{select:{quantity:true}},payments:{select:{provider:true}}},orderBy:[{createdAt:'desc'},{id:'asc'}],skip:(q.page-1)*q.limit,take:q.limit}),this.prisma.order.count({where})]); return page(items,total,q.page,q.limit); }
  async order(id:string) { const item=await this.prisma.order.findUnique({where:{id},include:{user:{select:{id:true,email:true,firstName:true,lastName:true,status:true}},items:true,payments:true}});if(!item) throw new NotFoundError('Order was not found.','ORDER_NOT_FOUND');return item; }
  async updateOrderStatus(actor:string,id:string,status:'PROCESSING'|'SHIPPED'|'DELIVERED'|'CANCELLED') { const order=await this.prisma.order.findUnique({where:{id}}); if(!order) throw new NotFoundError('Order was not found.','ORDER_NOT_FOUND'); const allowed:Record<string,string[]>={CONFIRMED:['PROCESSING','CANCELLED'],PROCESSING:['SHIPPED'],SHIPPED:['DELIVERED']}; if(!allowed[order.status]?.includes(status)) throw new ValidationError('Invalid order status transition.',undefined,'INVALID_ORDER_TRANSITION'); const updated=await this.prisma.order.update({where:{id},data:{status},include:{user:{select:{id:true,email:true,firstName:true,lastName:true,status:true}},items:true,payments:true}}); await this.audit(actor,'ORDER_STATUS_UPDATED','order',id,{from:order.status,to:status}); return updated; }
  async customers(q:{page:number;limit:number;search?:string}) { const where={role:'CUSTOMER' as const,...(q.search?{OR:[{email:{contains:q.search,mode:'insensitive' as const}},{firstName:{contains:q.search,mode:'insensitive' as const}},{lastName:{contains:q.search,mode:'insensitive' as const}}]}:{})}; const [items,total]=await Promise.all([this.prisma.user.findMany({where,select:{id:true,email:true,firstName:true,lastName:true,phone:true,status:true,emailVerifiedAt:true,createdAt:true,_count:{select:{orders:true}}},orderBy:{createdAt:'desc'},skip:(q.page-1)*q.limit,take:q.limit}),this.prisma.user.count({where})]); return page(items,total,q.page,q.limit); }
  async customer(id:string) { const item=await this.prisma.user.findFirst({where:{id,role:'CUSTOMER'},select:{id:true,email:true,firstName:true,lastName:true,phone:true,status:true,emailVerifiedAt:true,createdAt:true,orders:{select:{id:true,orderNumber:true,totalPaise:true,status:true,paymentStatus:true,createdAt:true},orderBy:[{createdAt:'desc'},{id:'asc'}],take:50},_count:{select:{orders:true}}}});if(!item) throw new NotFoundError('Customer was not found.','CUSTOMER_NOT_FOUND');return item; }
  async coupons() { return this.prisma.coupon.findMany({orderBy:{createdAt:'desc'}}); }
  async createCoupon(actor:string,value:CouponInput) { try { const result=await this.prisma.coupon.create({data:{...value,startsAt:value.startsAt?new Date(value.startsAt):undefined,endsAt:value.endsAt?new Date(value.endsAt):undefined}}); await this.audit(actor,'COUPON_CREATED','coupon',result.id); return result; } catch { throw new ConflictError('Coupon code already exists.','DUPLICATE_COUPON'); } }
  async updateCoupon(actor:string,id:string,value:Partial<CouponInput>) { const result=await this.prisma.coupon.update({where:{id},data:{...value,startsAt:value.startsAt?new Date(value.startsAt):undefined,endsAt:value.endsAt?new Date(value.endsAt):undefined}}).catch(()=>{throw new NotFoundError('Coupon was not found.','COUPON_NOT_FOUND');}); await this.audit(actor,'COUPON_UPDATED','coupon',id); return result; }
  async auditLogs(q:{page:number;limit:number}) { const [items,total]=await Promise.all([this.prisma.auditLog.findMany({include:{actor:{select:{id:true,email:true,firstName:true,lastName:true}}},orderBy:{createdAt:'desc'},skip:(q.page-1)*q.limit,take:q.limit}),this.prisma.auditLog.count()]); return page(items,total,q.page,q.limit); }
}
