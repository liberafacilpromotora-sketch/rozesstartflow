import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

export interface SellerDto {
  name: string;
  login: string;
  imageUrl?: string;
  link?: string;
  linkBotao?: string;
}

@Injectable()
export class SellersService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.seller.findMany({ orderBy: { name: 'asc' } });
  }

  findOne(id: string) {
    return this.prisma.seller.findUniqueOrThrow({ where: { id } });
  }

  create(dto: SellerDto) {
    return this.prisma.seller.create({ data: dto });
  }

  async update(id: string, dto: Partial<SellerDto>) {
    await this.findOne(id);
    return this.prisma.seller.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.seller.delete({ where: { id } });
  }
}
