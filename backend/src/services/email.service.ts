import { Resend } from 'resend';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export interface OrderEmailDetails {
  id: string;
  orderNumber?: string;
  totalAmountPaise?: number;
  trackingNumber?: string;
  reason?: string;
}

export interface AuthEmailSender {
  sendVerification(email: string, token: string, idempotencyKey?: string): Promise<void>;
  sendPasswordReset(email: string, token: string, idempotencyKey?: string): Promise<void>;
  sendOrderConfirmation?(email: string, details: OrderEmailDetails): Promise<void>;
  sendOrderShipped?(email: string, details: OrderEmailDetails): Promise<void>;
  sendOrderDelivered?(email: string, details: OrderEmailDetails): Promise<void>;
  sendOrderCancelled?(email: string, details: OrderEmailDetails): Promise<void>;
}

function link(path: string, token: string): string { return `${env.FRONTEND_URL}${path}?token=${encodeURIComponent(token)}`; }

export class ResendAuthEmailSender implements AuthEmailSender {
  private readonly client = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : undefined;

  private async send(to: string, subject: string, body: string, idempotencyKey?: string): Promise<void> {
    if (!this.client || !env.EMAIL_FROM) {
      logger.warn({ emailDomain: to.split('@')[1] }, 'Authentication email is not configured.');
      throw new Error('AUTH_EMAIL_UNAVAILABLE');
    }
    const { error } = await this.client.emails.send(
      { from: env.EMAIL_FROM, to, subject, html: body },
      idempotencyKey ? { idempotencyKey } : undefined,
    );
    if (error) throw new Error('AUTH_EMAIL_DELIVERY_FAILED');
  }

  sendVerification(email: string, token: string, idempotencyKey?: string): Promise<void> {
    const url = link('/auth/verify-email', token);
    return this.send(email, 'Verify your Purvaja Fashion email', `<p>Welcome to Purvaja Fashion.</p><p><a href="${url}">Verify your email</a></p><p>This link expires in 24 hours.</p>`, idempotencyKey);
  }

  sendPasswordReset(email: string, token: string, idempotencyKey?: string): Promise<void> {
    const url = link('/auth/reset-password', token);
    return this.send(email, 'Reset your Purvaja Fashion password', `<p>We received a password reset request.</p><p><a href="${url}">Reset password</a></p><p>This link expires in one hour.</p>`, idempotencyKey);
  }

  async sendOrderConfirmation(email: string, details: OrderEmailDetails): Promise<void> {
    const formattedAmount = details.totalAmountPaise ? `₹${(details.totalAmountPaise / 100).toFixed(2)}` : '';
    const orderRef = details.orderNumber ?? details.id.slice(0, 8).toUpperCase();
    try {
      await this.send(
        email,
        `Order Confirmed #${orderRef} - Purvaja Fashion`,
        `<div style="font-family: sans-serif; color: #1a1a1a;">` +
        `<h2>Order Confirmed</h2>` +
        `<p>Thank you for your order with Purvaja Fashion.</p>` +
        `<p><strong>Order ID:</strong> ${orderRef}</p>` +
        (formattedAmount ? `<p><strong>Total Amount:</strong> ${formattedAmount}</p>` : '') +
        `<p>We will notify you once your bespoke pieces are prepared and dispatched.</p>` +
        `</div>`,
      );
    } catch (err) {
      logger.warn({ orderId: details.id, error: err instanceof Error ? err.message : 'Unknown' }, 'Order confirmation email could not be sent.');
    }
  }

  async sendOrderShipped(email: string, details: OrderEmailDetails): Promise<void> {
    const orderRef = details.orderNumber ?? details.id.slice(0, 8).toUpperCase();
    try {
      await this.send(
        email,
        `Order Dispatched #${orderRef} - Purvaja Fashion`,
        `<div style="font-family: sans-serif; color: #1a1a1a;">` +
        `<h2>Your Order is on the Way</h2>` +
        `<p>Your order #${orderRef} has been dispatched.</p>` +
        (details.trackingNumber ? `<p><strong>Tracking Number:</strong> ${details.trackingNumber}</p>` : '') +
        `<p>Track your delivery at <a href="${env.FRONTEND_URL}/orders/${details.id}">your orders page</a>.</p>` +
        `</div>`,
      );
    } catch (err) {
      logger.warn({ orderId: details.id, error: err instanceof Error ? err.message : 'Unknown' }, 'Order shipped email could not be sent.');
    }
  }

  async sendOrderDelivered(email: string, details: OrderEmailDetails): Promise<void> {
    const orderRef = details.orderNumber ?? details.id.slice(0, 8).toUpperCase();
    try {
      await this.send(
        email,
        `Order Delivered #${orderRef} - Purvaja Fashion`,
        `<div style="font-family: sans-serif; color: #1a1a1a;">` +
        `<h2>Your Order Has Arrived</h2>` +
        `<p>Your bespoke Purvaja Fashion package for order #${orderRef} has been delivered.</p>` +
        `<p>We hope you cherish your garments. You can share your feedback on <a href="${env.FRONTEND_URL}/orders/${details.id}">your orders page</a>.</p>` +
        `</div>`,
      );
    } catch (err) {
      logger.warn({ orderId: details.id, error: err instanceof Error ? err.message : 'Unknown' }, 'Order delivered email could not be sent.');
    }
  }

  async sendOrderCancelled(email: string, details: OrderEmailDetails): Promise<void> {
    const orderRef = details.orderNumber ?? details.id.slice(0, 8).toUpperCase();
    try {
      await this.send(
        email,
        `Order Cancelled #${orderRef} - Purvaja Fashion`,
        `<div style="font-family: sans-serif; color: #1a1a1a;">` +
        `<h2>Order Cancelled</h2>` +
        `<p>Your order #${orderRef} has been cancelled.</p>` +
        (details.reason ? `<p><strong>Reason:</strong> ${details.reason}</p>` : '') +
        `<p>If you have already paid, a refund will be processed to your original payment method.</p>` +
        `</div>`,
      );
    } catch (err) {
      logger.warn({ orderId: details.id, error: err instanceof Error ? err.message : 'Unknown' }, 'Order cancelled email could not be sent.');
    }
  }
}

export const emailService = new ResendAuthEmailSender();
