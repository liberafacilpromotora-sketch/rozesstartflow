import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CampaignsService } from '../campaigns/campaigns.service';
import { NumbersService } from '../numbers/numbers.service';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private prisma: PrismaService,
    private campaignsService: CampaignsService,
    private numbersService: NumbersService,
  ) {}

  async handleEvent(body: any) {
    const type = body.type;
    const payload = body.payload;

    this.logger.debug(`Webhook event: ${type}`, JSON.stringify(body));

    try {
      if (type === 'message-event') {
        await this.handleMessageEvent(payload);
      } else if (type === 'template-event') {
        await this.handleTemplateEvent(payload);
      } else if (type === 'account-event') {
        await this.handleAccountEvent(body.app, payload);
      }
    } catch (err) {
      this.logger.error(`Error handling webhook: ${err.message}`, err.stack);
    }

    return { ok: true };
  }

  private async handleMessageEvent(payload: any) {
    const gsId = payload?.gsId || payload?.id;
    const eventType = payload?.type;

    if (!gsId || !eventType) return;

    const updateMap: Record<string, any> = {
      enqueued:  { status: 'enqueued' },
      sent:      { status: 'sent', sentAt: new Date() },
      delivered: { status: 'delivered', deliveredAt: new Date() },
      read:      { status: 'read', readAt: new Date() },
      failed:    { status: 'failed', errorMsg: payload?.payload?.reason || 'Falha no envio' },
      deleted:   { status: 'deleted' },
    };

    const update = updateMap[eventType];
    if (!update) return;

    await this.prisma.dispatch.updateMany({
      where: { gupshupMessageId: gsId },
      data: update,
    });
  }

  private async handleTemplateEvent(payload: any) {
    const { id, status, elementName } = payload || {};
    if (!id || !status) return;

    if (['rejected', 'deleted', 'disabled', 'REJECTED', 'DELETED', 'DISABLED'].includes(status)) {
      await this.campaignsService.pauseByTemplateId(
        id,
        `Template "${elementName || id}" foi ${status.toLowerCase()} pela Meta`,
      );
    }
  }

  private async handleAccountEvent(appName: string, payload: any) {
    const evType = payload?.type;

    if (evType === 'status-event') {
      const status = payload?.payload?.status;
      if (['ACCOUNT_RESTRICTED', 'ACCOUNT_DISABLE'].includes(status)) {
        await this.numbersService.deactivateByApp(appName, status);
        this.logger.warn(`Número ${appName} desativado: ${status}`);
      }
    }

    if (evType === 'tier-event') {
      const limitMap: Record<string, number> = {
        TIER_10K: 10000,
        TIER_100K: 100000,
        TIER_1K: 1000,
        TIER_250: 250,
      };
      const currentLimit = payload?.payload?.currentLimit;
      if (currentLimit && limitMap[currentLimit]) {
        await this.numbersService.updateDailyLimit(appName, limitMap[currentLimit]);
      }
    }
  }
}
