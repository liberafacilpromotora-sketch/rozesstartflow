import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class MetricsService {
  constructor(private prisma: PrismaService) {}

  async getDashboard(campaignId?: string) {
    const where = campaignId ? { campaignId } : {};

    const [counts, campaigns, numbers, totalLeads] = await Promise.all([
      this.prisma.dispatch.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
      this.prisma.campaign.findMany({
        select: {
          id: true, name: true, status: true, createdAt: true,
          _count: { select: { dispatches: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.waNumber.findMany({
        select: { id: true, phone: true, appName: true, active: true, sentCount: true, dailyLimit: true, restrictionStatus: true },
      }),
      this.prisma.lead.count(),
    ]);

    const get = (s: string) => counts.find(c => c.status === s)?._count ?? 0;

    const pending   = get('pending') + get('submitted') + get('enqueued');
    const sent      = get('sent');
    const delivered = get('delivered');
    const read      = get('read');
    const failed    = get('failed');
    const total     = pending + sent + delivered + read + failed;
    const done      = sent + delivered + read + failed;

    return {
      overview: {
        total, pending, sent, delivered, read, failed,
        delivery_rate: done ? +((delivered + read) / done * 100).toFixed(1) : 0,
        read_rate:     (delivered + read) ? +(read / (delivered + read) * 100).toFixed(1) : 0,
        progress:      total ? +(done / total * 100).toFixed(1) : 0,
      },
      campaigns,
      numbers,
      totalLeads,
    };
  }

  async getCampaignStats(campaignId: string) {
    return this.getDashboard(campaignId);
  }
}
