import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

export interface CreateCampaignDto {
  name: string;
  templateId?: string;
  templateParams?: string[];
  message?: string;
  link?: string;
  imageUrl?: string;
}

@Injectable()
export class CampaignsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCampaignDto) {
    return this.prisma.campaign.create({ data: dto });
  }

  async findAll() {
    return this.prisma.campaign.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        list: { select: { id: true, name: true } },
        _count: { select: { dispatches: true } },
      },
    });
  }

  async findOne(id: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id },
      include: {
        list: { select: { id: true, name: true } },
        _count: { select: { dispatches: true } },
      },
    });
    if (!campaign) throw new NotFoundException('Campanha não encontrada');
    return campaign;
  }

  async update(id: string, dto: Partial<CreateCampaignDto>) {
    await this.findOne(id);
    return this.prisma.campaign.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.campaign.delete({ where: { id } });
  }

  async setStatus(id: string, status: string, pausedReason?: string) {
    return this.prisma.campaign.update({
      where: { id },
      data: { status, pausedReason: pausedReason ?? null },
    });
  }

  async pause(id: string, reason: string) {
    return this.setStatus(id, 'paused', reason);
  }

  async pauseByTemplateId(templateId: string, reason: string) {
    await this.prisma.campaign.updateMany({
      where: { templateId, status: { in: ['active', 'running'] } },
      data: { status: 'paused', pausedReason: reason },
    });
  }

  async getDispatches(campaignId: string, page = 1, limit = 50) {
    await this.findOne(campaignId);
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.dispatch.findMany({
        where: { campaignId },
        skip,
        take: limit,
        include: { lead: true, waNumber: { select: { phone: true, appName: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.dispatch.count({ where: { campaignId } }),
    ]);
    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }
}
