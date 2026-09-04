import { Resend } from 'resend';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export interface AuthEmailSender { sendVerification(email: string, token: string): Promise<void>; sendPasswordReset(email: string, token: string): Promise<void>; }

function link(path: string, token: string): string { return `${env.FRONTEND_URL}${path}?token=${encodeURIComponent(token)}`; }

export class ResendAuthEmailSender implements AuthEmailSender {
  private readonly client = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : undefined;

  private async send(to: string, subject: string, body: string): Promise<void> {
    if (!this.client || !env.EMAIL_FROM) {
      logger.warn({ emailDomain: to.split('@')[1] }, 'Authentication email is not configured.');
      throw new Error('AUTH_EMAIL_UNAVAILABLE');
    }
    const { error } = await this.client.emails.send({ from: env.EMAIL_FROM, to, subject, html: body });
    if (error) throw new Error('AUTH_EMAIL_DELIVERY_FAILED');
  }

  sendVerification(email: string, token: string): Promise<void> {
    const url = link('/auth/verify-email', token);
    return this.send(email, 'Verify your Purvaja Fashion email', `<p>Welcome to Purvaja Fashion.</p><p><a href="${url}">Verify your email</a></p><p>This link expires in 24 hours.</p>`);
  }

  sendPasswordReset(email: string, token: string): Promise<void> {
    const url = link('/auth/reset-password', token);
    return this.send(email, 'Reset your Purvaja Fashion password', `<p>We received a password reset request.</p><p><a href="${url}">Reset password</a></p><p>This link expires in one hour.</p>`);
  }
}
