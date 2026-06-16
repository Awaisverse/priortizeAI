import { WebClient } from '@slack/web-api';
import type { Report } from '../models';
import { createLogger } from '../utils/logger';
import { executeWithTimeout } from '../utils/helpers';

const logger = createLogger('SlackDelivery');

const SLACK_TIMEOUT_MS = 15000;
const MAX_SLACK_BLOCK_LENGTH = 3000;

export interface SlackDeliveryConfig {
  botToken: string;
  defaultChannelId?: string;
}

export interface SlackTarget {
  userId?: string;
  channelId?: string;
}

export class SlackDelivery {
  private readonly client: WebClient;

  constructor(private readonly config: SlackDeliveryConfig) {
    this.client = new WebClient(config.botToken);
  }

  async send(report: Report, target?: SlackTarget): Promise<void> {
    const channelOrUser = target?.userId ?? target?.channelId ?? this.config.defaultChannelId;

    if (!channelOrUser) {
      throw new Error('No Slack target provided and no default channel configured');
    }

    logger.info('Sending Slack message', { aeId: report.aeId, target: channelOrUser });

    // Split markdown into chunks to stay within Slack block limits
    const chunks = this.splitMarkdown(report.markdown);

    await executeWithTimeout(
      async () => {
        // First chunk as main message, rest as threaded replies
        const main = await this.client.chat.postMessage({
          channel: channelOrUser,
          text: `AE Daily Brief — ${new Date(report.generatedAt).toLocaleDateString()}`,
          blocks: [
            {
              type: 'section',
              text: { type: 'mrkdwn', text: chunks[0] },
            },
          ],
          unfurl_links: false,
        });

        for (const chunk of chunks.slice(1)) {
          await this.client.chat.postMessage({
            channel: channelOrUser,
            thread_ts: main.ts,
            text: chunk,
            blocks: [{ type: 'section', text: { type: 'mrkdwn', text: chunk } }],
            unfurl_links: false,
          });
        }
      },
      SLACK_TIMEOUT_MS,
      'SlackDelivery',
    );

    logger.info('Slack message sent', { aeId: report.aeId, reportId: report.reportId });
  }

  private splitMarkdown(markdown: string): string[] {
    if (markdown.length <= MAX_SLACK_BLOCK_LENGTH) return [markdown];

    const chunks: string[] = [];
    const sections = markdown.split(/\n(?=## )/);

    let current = '';
    for (const section of sections) {
      if ((current + section).length > MAX_SLACK_BLOCK_LENGTH) {
        if (current) chunks.push(current.trim());
        current = section;
      } else {
        current += (current ? '\n' : '') + section;
      }
    }
    if (current.trim()) chunks.push(current.trim());

    return chunks.length > 0 ? chunks : [markdown.slice(0, MAX_SLACK_BLOCK_LENGTH)];
  }
}

export function createSlackDelivery(config: SlackDeliveryConfig): SlackDelivery {
  return new SlackDelivery(config);
}
