import { Module } from '@nestjs/common';
import { NumbersController } from './numbers.controller';
import { NumbersService } from './numbers.service';
import { ResetDailyService } from '../common/interceptors/reset-daily.service';

@Module({
  controllers: [NumbersController],
  providers: [NumbersService, ResetDailyService],
  exports: [NumbersService],
})
export class NumbersModule {}
