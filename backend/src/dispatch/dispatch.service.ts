import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../common/prisma.service';
import { NumbersService } from '../numbers/numbers.service';

@Injectable()
export class DispatchService {
  constructor(
    @InjectQueue('dispatch') private dispatchQueue: Queue,
    private prisma: PrismaService,
    private numbersService: NumbersService,
  ) {}

  async startCampaign(campaignId: string) {
    const campaign = await this.prisma.campaign.findUniqueOrThrow({ where: { id: campaignId } });

    if (campaign.status === 'running') {
      throw new BadRequestException('Campanha já está em execução');
    }

    const leads = await this.prisma.lead.findMany();
    if (!leads.length) throw new BadRequestException('Nenhum lead disponível');

    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'running', pausedReason: null },
    });

    const pendingDispatches = await this.prisma.dispatch.findMany({
      where: { campaignId, status: 'pending' },
    });

    let dispatches = pendingDispatches;

    if (!pendingDispatches.length) {
      const alreadySent = await this.prisma.dispatch.findMany({
        where: { campaignId },
        select: { leadId: true },
      });
      const sentLeadIds = new Set(alreadySent.map(d => d.leadId));
      const newLeads = leads.filter(l => !sentLeadIds.has(l.id));

      if (!newLeads.length) {
        throw new BadRequestException('Todos os leads já foram disparados nesta campanha');
      }

      const number = await this.numbersService.getNextNumber();

      const created = await Promise.all(
        newLeads.map(lead =>
          this.prisma.dispatch.create({
            data: {
              campaignId,
              leadId: lead.id,
              waNumberId: number.id,
              status: 'pending',
            },
          }),
        ),
      );
      dispatches = created;
    }

    let delay = 0;
    for (const dispatch of dispatches) {
      const jitter = Math.floor(Math.random() * 2000) + 3000;
      await this.dispatchQueue.add(
        'send',
        { dispatchId: dispatch.id, campaignId },
        { delay, attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
      );
      delay += jitter;
    }

    return { queued: dispatches.length, estimatedMinutes: Math.ceil(delay / 60000) };
  }

  async resumeCampaign(campaignId: string) {
    const campaign = await this.prisma.campaign.findUniqueOrThrow({ where: { id: campaignId } });
    if (campaign.status !== 'paused') throw new BadRequestException('Campanha não está pausada');

    return this.startCampaign(campaignId);
  }

  async updateDispatchByGupshupId(gupshupMessageId: string, data: any) {
    await this.prisma.dispatch.updateMany({
      where: { gupshupMessageId },
      data,
    });
  }
}
