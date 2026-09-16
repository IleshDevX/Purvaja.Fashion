import { createHash } from 'node:crypto';
import { Prisma } from '../generated/prisma/client.js';
import { getPrismaClient } from '../config/database.js';
import { emailService } from './email.service.js';
import { shippingProvider, type ShipmentRequest } from './shipping-provider.service.js';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

const shipmentTransitions: Record<string, readonly string[]> = {
  MANIFESTED: ['IN_TRANSIT'],
  IN_TRANSIT: ['OUT_FOR_DELIVERY', 'RETURNED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'RETURNED'],
  DELIVERED: ['RETURNED'],
  RETURNED: [],
};

type WebhookStatus = 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'RETURNED';

interface WebhookPayload {
  trackingNumber: string;
  status: WebhookStatus;
  location?: string;
  timestamp?: string;
}

interface VerifiedEvent {
  provider: string;
  eventId: string;
  rawBody: Buffer;
}

function jsonObject(value: Prisma.JsonValue | null): Record<string, Prisma.JsonValue> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, Prisma.JsonValue>
    : {};
}

export class ShippingService {
  private get prisma() {
    return getPrismaClient();
  }

  async shipOrder(orderId: string, actorId: string, request: ShipmentRequest = {}) {
    const snapshot = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, orderNumber: true, status: true, shipment: { select: { id: true } } },
    });
    if (!snapshot) throw new NotFoundError('Order was not found.', 'ORDER_NOT_FOUND');
    if (snapshot.status !== 'PROCESSING') {
      throw new ValidationError(
        `Order must be in PROCESSING status to be shipped (current status: ${snapshot.status}).`,
        undefined,
        'INVALID_ORDER_TRANSITION',
      );
    }
    if (snapshot.shipment) {
      throw new ConflictError('A shipment already exists for this order.', 'SHIPMENT_ALREADY_EXISTS');
    }

    const awb = await shippingProvider.createShipment(snapshot.orderNumber, request);
    const result = await this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "users" WHERE id = ${actorId}::uuid FOR KEY SHARE`;
      await tx.$queryRaw`SELECT id FROM "orders" WHERE id = ${orderId}::uuid FOR UPDATE`;
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { user: true, shipment: true },
      });
      if (!order) throw new NotFoundError('Order was not found.', 'ORDER_NOT_FOUND');
      if (order.status !== 'PROCESSING') {
        throw new ValidationError('Order is no longer eligible for shipping.', undefined, 'INVALID_ORDER_TRANSITION');
      }
      if (order.shipment) {
        throw new ConflictError('A shipment already exists for this order.', 'SHIPMENT_ALREADY_EXISTS');
      }

      const shipment = await tx.orderShipment.create({
        data: {
          orderId: order.id,
          carrier: awb.carrier,
          trackingNumber: awb.trackingNumber,
          awbCode: awb.awbCode,
          status: 'MANIFESTED',
          trackingUrl: awb.trackingUrl,
          details: {
            providerMode: awb.mode,
            simulated: awb.mode === 'demo',
            manifestedBy: actorId,
            manifestedAt: new Date().toISOString(),
          },
        },
      });
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: { status: 'SHIPPED' },
        include: { shipment: true },
      });
      await tx.auditLog.create({
        data: {
          actorId,
          action: 'ORDER_SHIPPED',
          entityType: 'ORDER',
          entityId: order.id,
          metadata: {
            shipmentId: shipment.id,
            carrier: shipment.carrier,
            providerMode: awb.mode,
          },
        },
      });
      return { order: updatedOrder, shipment, email: order.user?.email, orderNumber: order.orderNumber };
    });

    if (result.email) {
      await emailService.sendOrderShipped?.(result.email, {
        id: orderId,
        orderNumber: result.orderNumber,
        trackingNumber: result.shipment.trackingNumber,
        simulated: awb.mode === 'demo',
      });
    }
    return { order: result.order, shipment: result.shipment };
  }

  async processWebhook(payload: WebhookPayload, event: VerifiedEvent) {
    const shipment = await this.prisma.orderShipment.findUnique({
      where: { trackingNumber: payload.trackingNumber },
      select: { id: true },
    });
    if (!shipment) {
      logger.warn({ provider: event.provider, eventId: event.eventId }, 'Rejected shipping webhook for unknown tracking number.');
      throw new NotFoundError('Shipment was not found.', 'SHIPMENT_NOT_FOUND');
    }

    const payloadHash = createHash('sha256').update(event.rawBody).digest('hex');
    const outcome = await this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "order_shipments" WHERE id = ${shipment.id}::uuid FOR UPDATE`;
      const duplicate = await tx.shipmentWebhookEvent.findUnique({
        where: { provider_externalEventId: { provider: event.provider, externalEventId: event.eventId } },
      });
      if (duplicate) {
        if (duplicate.payloadHash !== payloadHash) {
          return { kind: 'conflict' as const };
        }
        return { kind: 'duplicate' as const, orderId: null, shipmentStatus: payload.status };
      }

      const current = await tx.orderShipment.findUnique({
        where: { id: shipment.id },
        include: { order: { include: { user: true } } },
      });
      if (!current) throw new NotFoundError('Shipment was not found.', 'SHIPMENT_NOT_FOUND');
      const sameStatus = current.status === payload.status;
      const allowed = shipmentTransitions[current.status] ?? [];
      if (!sameStatus && !allowed.includes(payload.status)) {
        await tx.shipmentWebhookEvent.create({
          data: {
            provider: event.provider,
            externalEventId: event.eventId,
            shipmentId: current.id,
            eventType: payload.status,
            payloadHash,
            status: 'REJECTED',
            processedAt: new Date(),
          },
        });
        return { kind: 'invalid-transition' as const, from: current.status, to: payload.status };
      }

      await tx.shipmentWebhookEvent.create({
        data: {
          provider: event.provider,
          externalEventId: event.eventId,
          shipmentId: current.id,
          eventType: payload.status,
          payloadHash,
          status: 'PROCESSED',
          processedAt: new Date(),
        },
      });
      if (!sameStatus) {
        await tx.orderShipment.update({
          where: { id: current.id },
          data: {
            status: payload.status,
            details: {
              ...jsonObject(current.details),
              lastWebhookEvent: payload,
              lastUpdated: new Date().toISOString(),
            } as unknown as Prisma.InputJsonValue,
          },
        });
      }

      let deliveredEmail: string | undefined;
      if (payload.status === 'DELIVERED' && current.order.status === 'SHIPPED') {
        await tx.order.update({
          where: { id: current.orderId },
          data: { status: 'DELIVERED', deliveredAt: current.order.deliveredAt ?? new Date() },
        });
        deliveredEmail = current.order.user?.email;
      }
      await tx.auditLog.create({
        data: {
          action: 'SHIPMENT_WEBHOOK_PROCESSED',
          entityType: 'ORDER',
          entityId: current.orderId,
          metadata: {
            provider: event.provider,
            eventId: event.eventId,
            fromStatus: current.status,
            toStatus: payload.status,
          },
        },
      });
      return {
        kind: 'processed' as const,
        orderId: current.orderId,
        orderNumber: current.order.orderNumber,
        shipmentStatus: payload.status,
        deliveredEmail,
      };
    });

    if (outcome.kind === 'conflict') {
      throw new ConflictError('Webhook event ID was already used with a different payload.', 'WEBHOOK_EVENT_CONFLICT');
    }
    if (outcome.kind === 'invalid-transition') {
      throw new ConflictError(
        `Shipment cannot transition from ${outcome.from} to ${outcome.to}.`,
        'INVALID_SHIPMENT_TRANSITION',
      );
    }
    if (outcome.kind === 'processed' && outcome.deliveredEmail) {
      await emailService.sendOrderDelivered?.(outcome.deliveredEmail, {
        id: outcome.orderId,
        orderNumber: outcome.orderNumber,
      });
    }
    return outcome.kind === 'duplicate'
      ? { status: 'duplicate', shipmentStatus: outcome.shipmentStatus }
      : { status: 'processed', orderId: outcome.orderId, shipmentStatus: outcome.shipmentStatus };
  }
}

export const shippingService = new ShippingService();
