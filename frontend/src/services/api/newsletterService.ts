import { apiClient, unwrapApiData } from './client.js';

export interface NewsletterSubscriptionResult {
  status: 'PENDING_PROVIDER' | 'SUBSCRIBED';
  consentedAt: string;
  deliveryEnabled: boolean;
}

export const newsletterService = {
  async subscribe(email: string): Promise<NewsletterSubscriptionResult> {
    const response = await apiClient.post('/newsletter/subscriptions', {
      email,
      consentSource: 'storefront_footer',
    });
    return unwrapApiData<NewsletterSubscriptionResult>(response.data);
  },
};
