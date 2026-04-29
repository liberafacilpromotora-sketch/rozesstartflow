import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NumbersService } from '../../numbers/numbers.service';

@Injectable()
export class ResetDailyService {
  constructor(private numbersService: NumbersService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async resetDailyCounts() {
    await this.numbersService.resetDailyCounts();
    console.log('[Cron] Contadores diários zerados');
  }
}
