import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators';
import { NumbersService, CreateNumberDto } from './numbers.service';
import { IsString, IsOptional, IsNumber } from 'class-validator';

class CreateNumberDtoValidated {
  @IsString()
  phone: string;

  @IsString()
  appName: string;

  @IsString()
  apiKey: string;

  @IsOptional()
  @IsNumber()
  dailyLimit?: number;
}

@Controller('numbers')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('master', 'admin')
export class NumbersController {
  constructor(private numbersService: NumbersService) {}

  @Post()
  create(@Body() dto: CreateNumberDtoValidated) {
    return this.numbersService.create(dto);
  }

  @Get()
  findAll() {
    return this.numbersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.numbersService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateNumberDtoValidated>) {
    return this.numbersService.update(id, dto);
  }

  @Patch(':id/toggle')
  toggle(@Param('id') id: string) {
    return this.numbersService.toggle(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.numbersService.remove(id);
  }
}
