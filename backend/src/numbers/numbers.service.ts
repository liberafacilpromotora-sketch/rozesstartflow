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
    let response: any;
    const encodedApp = encodeURIComponent(num.appName);
    try {
      response = await axios.get(
        `https://api.gupshup.io/wa/api/v1/templates/${encodedApp}`,
        { headers: { apikey: num.apiKey }, timeout: 10000 },
      );
    } catch (err: any) {
      // tenta endpoint alternativo
      try {
        response = await axios.get(
          `https://api.gupshup.io/sm/api/v1/template/list/${encodedApp}`,
          { headers: { apikey: num.apiKey }, timeout: 10000 },
        );
      } catch {
        const msg = err?.response?.data?.message || err.message;
        throw new Error(`Gupshup 404 — verifique se o App Name "${num.appName}" está correto. Erro: ${msg}`);
      }
    }

    // Gupshup pode retornar templates em campos diferentes
    const raw = response.data;
    const templates: any[] = raw?.templates ?? raw?.result ?? raw?.data ?? [];

    if (!Array.isArray(templates)) {
      throw new Error(`Resposta inesperada do Gupshup: ${JSON.stringify(raw).slice(0, 200)}`);
    }

    return templates.map(t => {
      const body: string = t.data ?? t.body ?? t.template ?? '';
      const uniqueIndices = new Set((body.match(/\{\{(\d+)\}\}/g) || []).map(m => m.replace(/\D/g, '')));
      const bodyParams = uniqueIndices.size;
      let hasButton = false;
      try {
        const rawButtons = t.buttons ?? t.components ?? '[]';
        const buttons = typeof rawButtons === 'string' ? JSON.parse(rawButtons) : rawButtons;
        hasButton = Array.isArray(buttons) && buttons.some(
          (b: any) => (b.type === 'URL' || b.sub_type === 'url') && String(b.url ?? b.example ?? '').includes('{{'),
        );
      } catch {}
      return {
        id: t.id ?? t.templateId,
        name: t.elementName ?? t.name,
        status: t.status,
        approved: String(t.status).toUpperCase() === 'APPROVED',
        body,
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
