import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators';
import { SellersService } from './sellers.service';
import { IsString, IsOptional } from 'class-validator';

class CreateSellerDto {
  @IsString()
  name: string;

  @IsString()
  login: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  link?: string;

  @IsOptional()
  @IsString()
  linkBotao?: string;
}

@Controller('sellers')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('master', 'admin')
export class SellersController {
  constructor(private sellersService: SellersService) {}

  @Get()
  findAll() {
    return this.sellersService.findAll();
  }

  @Post()
  create(@Body() dto: CreateSellerDto) {
    return this.sellersService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateSellerDto>) {
    return this.sellersService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.sellersService.remove(id);
  }
}
