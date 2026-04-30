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

function parseRedisUrl(rawUrl: string) {
  const u = new URL(rawUrl);
  return {
    host: u.hostname,
    port: parseInt(u.port || '6379', 10),
    ...(u.password ? { password: decodeURIComponent(u.password) } : {}),
    ...(u.protocol === 'rediss:' ? { tls: {} } : {}),
  };
}

@Module({
  imports: [
    ScheduleModule.forRoot(),
    BullModule.forRoot({
      connection: parseRedisUrl(process.env.REDIS_URL || 'redis://localhost:6379'),
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
