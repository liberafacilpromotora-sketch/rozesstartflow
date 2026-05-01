import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import axios from 'axios';

export interface CreateCampaignDto {
  name: string;
  listId?: string;
  sellerIds?: string[];
  maxLeads?: number;
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
    await this.prisma.dispatch.deleteMany({ where: { campaignId: id } });
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

  async templatePreview(templateId: string) {
    const waNumber = await this.prisma.waNumber.findFirst({ where: { active: true } });
    if (!waNumber) throw new NotFoundException('Nenhum número WhatsApp ativo cadastrado');

    const response = await axios.get(
      `https://api.gupshup.io/wa/api/v1/templates/${waNumber.appName}`,
      { headers: { apikey: waNumber.apiKey }, timeout: 10000 },
    );

    const templates: any[] = response.data?.templates || [];
    const tpl = templates.find(t => t.id === templateId);
    if (!tpl) throw new NotFoundException('Template não encontrado neste número');

    const bodyParams = (tpl.data?.match(/\{\{\d+\}\}/g) || []).length;

    let hasButton = false;
    try {
      const buttons = JSON.parse(tpl.buttons || '[]');
      hasButton = buttons.some((b: any) => b.type === 'URL' && String(b.url || '').includes('{{'));
    } catch {}

    return {
      id: tpl.id,
      name: tpl.elementName,
      status: tpl.status,
      approved: tpl.status === 'APPROVED',
      body: tpl.data,
      textParams: bodyParams,
      hasButton,
    };
  }

  async getDispatches(campaignId: string, page = 1, limit = 50) {
    await this.findOne(campaignId);
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.dispatch.findMany({
        where: { campaignId },
        skip,
        take: limit,
        include: {
          lead: true,
          waNumber: { select: { phone: true, appName: true } },
          seller: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.dispatch.count({ where: { campaignId } }),
    ]);
    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }
}
