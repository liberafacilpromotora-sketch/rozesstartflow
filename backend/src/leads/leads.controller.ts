import {
  Controller, Get, Post, Query, UploadedFile,
  UseInterceptors, UseGuards, ParseIntPipe, DefaultValuePipe,
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
  @Roles('master')
  @UseInterceptors(FileInterceptor('file'))
  importCsv(@UploadedFile() file: Express.Multer.File) {
    return this.leadsService.importCsv(file.buffer);
  }

  @Get()
  @Roles('master')
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('search') search?: string,
  ) {
    return this.leadsService.findAll(page, limit, search);
  }

  @Get('columns')
  @Roles('master')
  getColumns() {
    return this.leadsService.getColumns();
  }

  @Get('count')
  @Roles('master')
  count() {
    return this.leadsService.count();
  }
}
