import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators';
import { LeadListsService } from './lead-lists.service';
import { IsString } from 'class-validator';

class CreateListDto {
  @IsString()
  name: string;
}

@Controller('lead-lists')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('master', 'admin')
export class LeadListsController {
  constructor(private leadListsService: LeadListsService) {}

  @Get()
  findAll() {
    return this.leadListsService.findAll();
  }

  @Post()
  create(@Body() dto: CreateListDto) {
    return this.leadListsService.create(dto.name);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.leadListsService.remove(id);
  }
}
