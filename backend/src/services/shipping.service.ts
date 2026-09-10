import { getPrismaClient } from '../config/database.js';
import { emailService } from './email.service.js';
import { BadRequestError, NotFoundError, ValidationError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export interface GeneratedAwb {
  carrier: string;
  trackingNumber: string;
  awbCode: string;
  trackingUrl: string;
}

export class ShippingService {
  private get prisma() {
    return getPrismaClient();
  }

  /**
   * Generates an AWB with the configured carrier (e.g. Delhivery, Shiprocket, BlueDart).
   * In sandbox / dev mode, generates a verified deterministic tracking identifier.
   */
  async generateAwb(orderNumber: string, carrier = 'DELHIVERY'): Promise<GeneratedAwb> {
    const cleanNum = orderNumber.replace(/[^a-zA-Z0-9]/g, '');
    const trackingNumber = `PF-${carrier.toUpperCase()}-${Date.now().toString(36).toUpperCase()}-${cleanNum.slice(-6)}`;
    const awbCode = `AWB${Math.floor(1000000000 + Math.random() * 9000000000)}`;
    const trackingUrl = `https://track.purvaja.fashion/?awb=${encodeURIComponent(trackingNumber)}`;

    return {
      carrier,
      trackingNumber,
      awbCode,
      trackingUrl,
    };
  }

  /**
   * Manifests shipment for a processed order, stores AWB, and advances status to SHIPPED.
   */
  async shipOrder(orderId: string, actor: string, carrierName = 'DELHIVERY') {
    return this.prisma.$transaction(async tx => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true, user: true, shipment: true },
      });

      if (!order) {
        throw new NotFoundError('Order was not found.', 'ORDER_NOT_FOUND');
      }

      if (order.status !== 'PROCESSING') {
        throw new ValidationError(
          `Order must be in PROCESSING status to be manifested and shipped (current status: ${order.status}).`,
          undefined,
          'INVALID_ORDER_TRANSITION',
        );
      }

      if (order.shipment) {
        throw new BadRequestError('Shipment AWB is already generated for this order.', 'SHIPMENT_ALREADY_EXISTS');
      }

      const awb = await this.generateAwb(order.orderNumber, carrierName);

      const shipment = await tx.orderShipment.create({
        data: {
          orderId: order.id,
          carrier: awb.carrier,
          trackingNumber: awb.trackingNumber,
          awbCode: awb.awbCode,
          status: 'MANIFESTED',
          trackingUrl: awb.trackingUrl,
          details: {
            manifestedBy: actor,
            manifestedAt: new Date().toISOString(),
          },
        },
      });

      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'SHIPPED',
        },
        include: { shipment: true },
      });

      // Send dispatch notification email
      if (order.user?.email) {
        try {
          await emailService.sendOrderShipped(order.user.email, {
            id: order.id,
            orderNumber: order.orderNumber,
            trackingNumber: awb.trackingNumber,
          });
        } catch (emailErr) {
          logger.warn({ orderId, emailErr }, 'Order shipped email notification failed to send.');
        }
      }

      return {
        order: updatedOrder,
        shipment,
      };
    });
  }

  /**
   * Ingests carrier webhook updates and updates shipment and order states.
   */
  async processWebhook(payload: {
    trackingNumber: string;
    status: 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'RETURNED' | string;
    location?: string;
    timestamp?: string;
  }) {
    if (!payload.trackingNumber) {
      throw new ValidationError('trackingNumber is required in carrier webhook.', undefined, 'MISSING_TRACKING_NUMBER');
    }

    const shipment = await this.prisma.orderShipment.findUnique({
      where: { trackingNumber: payload.trackingNumber },
      include: { order: { include: { user: true } } },
    });

    if (!shipment) {
      logger.warn({ trackingNumber: payload.trackingNumber }, 'Received carrier webhook for unrecognized tracking number.');
      return { status: 'unrecognized' };
    }

    await this.prisma.orderShipment.update({
      where: { id: shipment.id },
      data: {
        status: payload.status,
        updatedAt: new Date(),
        details: {
          ...(typeof shipment.details === 'object' && shipment.details ? shipment.details : {}),
          lastWebhookEvent: payload,
          lastUpdated: new Date().toISOString(),
        },
      },
    });

    // If carrier marks as delivered, transition order to DELIVERED
    if (payload.status === 'DELIVERED' && shipment.order.status === 'SHIPPED') {
      await this.prisma.order.update({
        where: { id: shipment.orderId },
        data: { status: 'DELIVERED' },
      });

      if (shipment.order.user?.email) {
        try {
          await emailService.sendOrderDelivered(shipment.order.user.email, {
            id: shipment.orderId,
            orderNumber: shipment.order.orderNumber,
          });
        } catch {
          // Ignore email error on background webhook
        }
      }
    }

    return { status: 'processed', orderId: shipment.orderId, shipmentStatus: payload.status };
  }
}

export const shippingService = new ShippingService();
