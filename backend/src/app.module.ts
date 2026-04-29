import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { LeadsModule } from './leads/leads.module';
import { NumbersModule } from './numbers/numbers.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { DispatchModule } from './dispatch/dispatch.module';
import { WebhookModule } from './webhook/webhook.module';
import { MetricsModule } from './metrics/metrics.module';
import { PrismaModule } from './common/prisma.module';
import { ResetDailyService } from './common/interceptors/reset-daily.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    BullModule.forRoot({
      connection: {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
      },
    }),
    PrismaModule,
    AuthModule,
    LeadsModule,
    NumbersModule,
    CampaignsModule,
    DispatchModule,
    WebhookModule,
    MetricsModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
