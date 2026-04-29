import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MetricsService } from './metrics.service';

@Controller('metrics')
@UseGuards(AuthGuard('jwt'))
export class MetricsController {
  constructor(private metricsService: MetricsService) {}

  @Get('dashboard')
  getDashboard(@Query('campaignId') campaignId?: string) {
    return this.metricsService.getDashboard(campaignId);
  }

  @Get('campaign')
  getCampaignStats(@Query('id') id: string) {
    return this.metricsService.getCampaignStats(id);
  }
}
