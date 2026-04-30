import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class LeadListsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.leadList.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { leads: true } } },
    });
  }

  create(name: string) {
    return this.prisma.leadList.create({ data: { name } });
  }

  async remove(id: string) {
    const list = await this.prisma.leadList.findUnique({ where: { id } });
    if (!list) throw new NotFoundException('Base não encontrada');
    return this.prisma.leadList.delete({ where: { id } });
  }
}
