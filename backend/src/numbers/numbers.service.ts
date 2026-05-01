import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import axios from 'axios';

export class CreateNumberDto {
  phone: string;
  appName: string;
  apiKey: string;
  dailyLimit?: number;
}

@Injectable()
export class NumbersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateNumberDto) {
    return this.prisma.waNumber.create({ data: dto });
  }

  async findAll() {
    return this.prisma.waNumber.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string) {
    const num = await this.prisma.waNumber.findUnique({ where: { id } });
    if (!num) throw new NotFoundException('Número não encontrado');
    return num;
  }

  async toggle(id: string) {
    const num = await this.findOne(id);
    return this.prisma.waNumber.update({
      where: { id },
      data: { active: !num.active },
    });
  }

  async update(id: string, data: Partial<CreateNumberDto>) {
    return this.prisma.waNumber.update({ where: { id }, data });
  }

  async remove(id: string) {
    return this.prisma.waNumber.delete({ where: { id } });
  }

  async getTemplates(id: string) {
    const num = await this.findOne(id);
    const response = await axios.get(
      `https://api.gupshup.io/wa/api/v1/templates/${num.appName}`,
      { headers: { apikey: num.apiKey }, timeout: 10000 },
    );
    const templates: any[] = response.data?.templates || [];
    return templates.map(t => {
      const bodyParams = (t.data?.match(/\{\{\d+\}\}/g) || []).length;
      let hasButton = false;
      try {
        const buttons = JSON.parse(t.buttons || '[]');
        hasButton = buttons.some((b: any) => b.type === 'URL' && String(b.url || '').includes('{{'));
      } catch {}
      return {
        id: t.id,
        name: t.elementName,
        status: t.status,
        approved: t.status === 'APPROVED',
        body: t.data,
        textParams: bodyParams,
        hasButton,
      };
    });
  }

  async getNextNumber() {
    const number = await this.prisma.waNumber.findFirst({
      where: { active: true, restrictionStatus: null },
      orderBy: { sentCount: 'asc' },
    });
    if (!number) throw new Error('Nenhum número ativo disponível');

    await this.prisma.waNumber.update({
      where: { id: number.id },
      data: { sentCount: { increment: 1 } },
    });

    return number;
  }

  async deactivateByApp(appName: string, reason: string) {
    await this.prisma.waNumber.updateMany({
      where: { appName },
      data: { active: false, restrictionStatus: reason },
    });
  }

  async updateDailyLimit(appName: string, limit: number) {
    await this.prisma.waNumber.updateMany({
      where: { appName },
      data: { dailyLimit: limit },
    });
  }

  async resetDailyCounts() {
    await this.prisma.waNumber.updateMany({ data: { sentCount: 0 } });
  }
}
