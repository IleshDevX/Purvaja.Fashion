import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import { ValidationError } from '../utils/errors.js';

export interface ShipmentRequest {
  carrier?: string;
  trackingNumber?: string;
  awbCode?: string;
  trackingUrl?: string;
}

export interface GeneratedAwb {
  carrier: string;
  trackingNumber: string;
  awbCode?: string;
  trackingUrl?: string;
  mode: 'demo' | 'manual';
}

export interface ShippingProvider {
  createShipment(orderNumber: string, request: ShipmentRequest): Promise<GeneratedAwb>;
}

class DemoShippingProvider implements ShippingProvider {
  async createShipment(orderNumber: string, request: ShipmentRequest): Promise<GeneratedAwb> {
    if (env.NODE_ENV === 'production') {
      throw new ValidationError('Demo shipping is unavailable in production.', undefined, 'DEMO_SHIPPING_DISABLED');
    }
    const orderRef = orderNumber.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase();
    const suffix = randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase();
    return {
      carrier: request.carrier?.trim() || 'PURVAJA_DEMO',
      trackingNumber: `DEMO-${orderRef}-${suffix}`,
      awbCode: `DEMO-AWB-${suffix}`,
      mode: 'demo',
    };
  }
}

class ManualShippingProvider implements ShippingProvider {
  async createShipment(_orderNumber: string, request: ShipmentRequest): Promise<GeneratedAwb> {
    const carrier = request.carrier?.trim();
    const trackingNumber = request.trackingNumber?.trim();
    if (!carrier || !trackingNumber) {
      throw new ValidationError(
        'Carrier and tracking number are required when manual shipping is enabled.',
        undefined,
        'MANUAL_SHIPMENT_DETAILS_REQUIRED',
      );
    }
    return {
      carrier,
      trackingNumber,
      awbCode: request.awbCode?.trim() || undefined,
      trackingUrl: request.trackingUrl?.trim() || undefined,
      mode: 'manual',
    };
  }
}

export const shippingProvider: ShippingProvider = env.SHIPPING_PROVIDER === 'manual'
  ? new ManualShippingProvider()
  : new DemoShippingProvider();
