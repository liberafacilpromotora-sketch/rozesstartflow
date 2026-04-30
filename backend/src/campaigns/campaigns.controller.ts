import {
  Controller, Get, Post, Patch, Delete, Body, Param,
  UseGuards, Query, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators';
import { CampaignsService } from './campaigns.service';
import { DispatchService } from '../dispatch/dispatch.service';
import { IsString, IsOptional, IsArray } from 'class-validator';

class CreateCampaignDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsArray()
  templateParams?: string[];

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsString()
  link?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}

@Controller('campaigns')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('master', 'admin')
export class CampaignsController {
  constructor(
    private campaignsService: CampaignsService,
    private dispatchService: DispatchService,
  ) {}

  @Post()
  create(@Body() dto: CreateCampaignDto) {
    return this.campaignsService.create(dto);
  }

  @Get()
  findAll() {
    return this.campaignsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.campaignsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateCampaignDto>) {
    return this.campaignsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.campaignsService.remove(id);
  }

  @Post(':id/start')
  start(@Param('id') id: string) {
    return this.dispatchService.startCampaign(id);
  }

  @Post(':id/pause')
  pause(@Param('id') id: string, @Body('reason') reason: string) {
    return this.campaignsService.pause(id, reason || 'Pausado manualmente');
  }

  @Post(':id/resume')
  resume(@Param('id') id: string) {
    return this.dispatchService.resumeCampaign(id);
  }

  @Get(':id/dispatches')
  dispatches(
    @Param('id') id: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.campaignsService.getDispatches(id, page, limit);
  }
}
