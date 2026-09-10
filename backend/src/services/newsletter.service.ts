import { Resend } from 'resend';
import { getPrismaClient } from '../config/database.js';
import { env } from '../config/env.js';
import { normalizeEmail } from '../utils/auth.js';
import { logger } from '../utils/logger.js';

export class NewsletterService {
  private readonly resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : undefined;

  async subscribe(emailInput: string, consentSource: string) {
    const email = normalizeEmail(emailInput);
    let status = 'PENDING_PROVIDER';
    let deliveryEnabled = false;

    const audienceId = process.env.RESEND_AUDIENCE_ID;
    if (this.resend && audienceId) {
      try {
        await this.resend.contacts.create({
          email,
          unsubscribed: false,
          audienceId,
        });
        status = 'ACTIVE';
        deliveryEnabled = true;
      } catch (error) {
        logger.warn(
          { email, error: error instanceof Error ? error.message : 'Unknown' },
          'Resend Audiences contact creation failed; preserving durable consent as PENDING_PROVIDER.',
        );
      }
    }

    const subscription = await getPrismaClient().newsletterSubscription.upsert({
      where: { email },
      create: { email, consentSource, status },
      update: {
        consentSource,
        consentedAt: new Date(),
        status,
        unsubscribedAt: null,
      },
      select: { status: true, consentedAt: true },
    });

    return {
      status: subscription.status,
      consentedAt: subscription.consentedAt.toISOString(),
      deliveryEnabled,
    };
  }
}
