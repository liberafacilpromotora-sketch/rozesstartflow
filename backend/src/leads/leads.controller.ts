import {
  Controller, Get, Post, Body, Query, UploadedFile,
  UseInterceptors, UseGuards, ParseIntPipe, DefaultValuePipe, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators';
import { LeadsService } from './leads.service';

@Controller('leads')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class LeadsController {
  constructor(private leadsService: LeadsService) {}

  @Post('import')
  @Roles('master', 'admin')
  @UseInterceptors(FileInterceptor('file'))
  importCsv(
    @UploadedFile() file: Express.Multer.File,
    @Body('listId') listId: string,
  ) {
    if (!listId) throw new BadRequestException('listId é obrigatório');
    return this.leadsService.importCsv(file.buffer, listId);
  }

  @Get()
  @Roles('master', 'admin')
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('search') search?: string,
    @Query('listId') listId?: string,
  ) {
    return this.leadsService.findAll(page, limit, search, listId);
  }

  @Get('columns')
  @Roles('master', 'admin')
  getColumns(@Query('listId') listId?: string) {
    return this.leadsService.getColumns(listId);
  }

  @Get('count')
  @Roles('master', 'admin')
  count(@Query('listId') listId?: string) {
    return this.leadsService.count(listId);
  }
}
