import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { WebhookService } from './webhook.service';

@Controller('webhook')
export class WebhookController {
  constructor(private webhookService: WebhookService) {}

  @Post('gupshup')
  @HttpCode(200)
  async handleGupshupEvent(@Body() body: any) {
    return this.webhookService.handleEvent(body);
  }

  // Gupshup pode enviar como form-urlencoded com campo 'payload'
  @Post('gupshup/events')
  @HttpCode(200)
  async handleGupshupEvents(@Body() body: any) {
    return this.webhookService.handleEvent(body);
  }
}
