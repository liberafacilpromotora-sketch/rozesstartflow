import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { CampaignsModule } from '../campaigns/campaigns.module';
import { NumbersModule } from '../numbers/numbers.module';

@Module({
  imports: [CampaignsModule, NumbersModule],
  controllers: [WebhookController],
  providers: [WebhookService],
})
export class WebhookModule {}
