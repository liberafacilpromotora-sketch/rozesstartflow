import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { parse } from 'csv-parse/sync';

@Injectable()
export class LeadsService {
  constructor(private prisma: PrismaService) {}

  private detectDelimiter(text: string): string {
    const firstLine = text.split('\n')[0] ?? '';
    const counts = {
      ';': (firstLine.match(/;/g) || []).length,
      '\t': (firstLine.match(/\t/g) || []).length,
      ',': (firstLine.match(/,/g) || []).length,
    };
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  }

  async importCsv(buffer: Buffer, listId: string): Promise<{ created: number; updated: number; errors: number }> {
    const text = buffer.toString('utf-8').replace(/^﻿/, '');
    const delimiter = this.detectDelimiter(text);

    let rows: Record<string, string>[];
    try {
      rows = parse(Buffer.from(text), {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        delimiter,
      });
    } catch (e) {
      throw new BadRequestException('Arquivo inválido: ' + e.message);
    }

    if (!rows.length) throw new BadRequestException('CSV sem dados');

    const firstRow = rows[0];
    const keys = Object.keys(firstRow);

    const phoneKey = keys.find(k => /celular|telefone|phone|fone|whatsapp/i.test(k));
    const nameKey = keys.find(k => /^nome$|^name$|nome_completo|full_name/i.test(k));

    if (!phoneKey) throw new BadRequestException('Coluna de telefone não encontrada (esperado: celular, telefone, phone, fone ou whatsapp)');

    let created = 0, updated = 0, errors = 0;

    for (const row of rows) {
      try {
        const phone = this.normalizePhone(row[phoneKey] ?? '');
        if (!phone || phone.length < 12) { errors++; continue; }

        const fullName = nameKey ? (row[nameKey] ?? '') : '';
        const firstName = fullName.split(' ')[0];

        const extras: Record<string, string> = {};
        for (const k of keys) {
          if (k !== phoneKey && k !== nameKey) extras[k] = row[k];
        }

        const existing = await this.prisma.lead.findFirst({ where: { phone, listId } });
        if (existing) {
          await this.prisma.lead.update({
            where: { id: existing.id },
            data: { fullName, firstName, extras },
          });
          updated++;
        } else {
          await this.prisma.lead.create({
            data: { phone, fullName, firstName, extras, listId },
          });
          created++;
        }
      } catch {
        errors++;
      }
    }

    return { created, updated, errors };
  }

  normalizePhone(raw: string): string {
    const digits = raw.replace(/\D/g, '');
    if (digits.startsWith('55') && digits.length >= 12) return digits;
    if (digits.length === 11 || digits.length === 10) return `55${digits}`;
    return digits;
  }

  async findAll(page = 1, limit = 50, search?: string, listId?: string) {
    const skip = (page - 1) * limit;
    const baseWhere = listId ? { listId } : {};
    const where = search
      ? { ...baseWhere, OR: [{ phone: { contains: search } }, { fullName: { contains: search, mode: 'insensitive' as const } }] }
      : baseWhere;

    const [data, total] = await Promise.all([
      this.prisma.lead.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.lead.count({ where }),
    ]);

    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    return this.prisma.lead.findUniqueOrThrow({ where: { id } });
  }

  async getColumns(listId?: string): Promise<string[]> {
    const sample = await this.prisma.lead.findFirst({ where: listId ? { listId } : {} });
    if (!sample) return ['nome', 'telefone'];
    const extras = (sample.extras as Record<string, string>) || {};
    return ['nome', 'primeiro_nome', 'telefone', ...Object.keys(extras)];
  }

  async count(listId?: string) {
    return this.prisma.lead.count({ where: listId ? { listId } : {} });
  }
}
