import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export type OperationalAlertCode =
  | 'RESERVATION_WORKER_FAILED'
  | 'RESERVATION_WORKER_STALLED'
  | 'PAYMENT_STATE_UNKNOWN'
  | 'PAYMENT_RECONCILIATION_MISMATCH'
  | 'REFUND_PROCESSING_FAILED'
  | 'DATA_CONSISTENCY_DRIFT';

export interface OperationalAlert {
  code: OperationalAlertCode;
  severity: 'warning' | 'critical';
  summary: string;
  occurredAt: string;
  attributes?: Record<string, string | number | boolean>;
}

export interface AlertDeliveryResult {
  status: 'delivered' | 'deduplicated' | 'not_configured' | 'failed';
  statusCode?: number;
}

export class OperationalAlertService {
  private readonly recent = new Map<string, number>();

  constructor(
    private readonly webhookUrl = env.OPERATIONAL_ALERT_WEBHOOK_URL,
    private readonly token = env.OPERATIONAL_ALERT_WEBHOOK_TOKEN,
    private readonly cooldownMs = 5 * 60_000,
  ) {}

  async deliver(alert: Omit<OperationalAlert, 'occurredAt'>, deduplicationKey: string = alert.code): Promise<AlertDeliveryResult> {
    if (!this.webhookUrl) return { status: 'not_configured' };
    const now = Date.now();
    const previous = this.recent.get(deduplicationKey);
    if (previous && now - previous < this.cooldownMs) return { status: 'deduplicated' };

    if (this.recent.size >= 500) {
      const oldest = this.recent.keys().next().value as string | undefined;
      if (oldest) this.recent.delete(oldest);
    }
    this.recent.set(deduplicationKey, now);

    try {
      const isSlack = this.webhookUrl.includes('hooks.slack.com');
      const isDiscord = this.webhookUrl.includes('discord.com/api/webhooks');

      let bodyString: string;
      if (isSlack) {
        const emoji = alert.severity === 'critical' ? ':rotating_light:' : ':warning:';
        bodyString = JSON.stringify({
          text: `${emoji} *[${alert.severity.toUpperCase()}] ${alert.code}*: ${alert.summary}`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `${emoji} *Purvaja Operational Alert: ${alert.code}*\n*Severity:* \`${alert.severity}\`\n*Summary:* ${alert.summary}\n*Time:* \`${new Date(now).toISOString()}\``,
              },
            },
          ],
        });
      } else if (isDiscord) {
        bodyString = JSON.stringify({
          content: `🚨 **[${alert.severity.toUpperCase()}] ${alert.code}**\n${alert.summary}\nTime: \`${new Date(now).toISOString()}\``,
        });
      } else {
        bodyString = JSON.stringify({ ...alert, occurredAt: new Date(now).toISOString() } satisfies OperationalAlert);
      }

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(this.token ? { authorization: `Bearer ${this.token}` } : {}),
        },
        body: bodyString,
        signal: AbortSignal.timeout(3_000),
      });
      if (!response.ok) throw new Error(`Alert destination returned HTTP ${response.status}.`);
      logger.info({ alertCode: alert.code, severity: alert.severity }, 'Operational alert delivered.');
      return { status: 'delivered', statusCode: response.status };
    } catch (error) {
      this.recent.delete(deduplicationKey);
      logger.error({ alertCode: alert.code, errorName: error instanceof Error ? error.name : 'UnknownError' }, 'Operational alert delivery failed.');
      return { status: 'failed' };
    }
  }
}

export const operationalAlerts = new OperationalAlertService();
