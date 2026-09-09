import { getPrismaClient } from '../config/database.js';
import { normalizeEmail } from '../utils/auth.js';

export class NewsletterService {
  async subscribe(emailInput: string, consentSource: string) {
    const email = normalizeEmail(emailInput);
    const subscription = await getPrismaClient().newsletterSubscription.upsert({
      where: { email },
      create: { email, consentSource, status: 'PENDING_PROVIDER' },
      update: {
        consentSource,
        consentedAt: new Date(),
        status: 'PENDING_PROVIDER',
        unsubscribedAt: null,
      },
      select: { status: true, consentedAt: true },
    });
    return {
      status: subscription.status,
      consentedAt: subscription.consentedAt.toISOString(),
      deliveryEnabled: false,
    };
  }
}
