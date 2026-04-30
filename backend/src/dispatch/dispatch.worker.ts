import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../common/prisma.service';
import { VariableEngine } from '../variables/variable-engine';

@Processor('dispatch', { concurrency: 1 })
@Injectable()
export class DispatchWorker extends WorkerHost {
  constructor(
    private prisma: PrismaService,
    private variableEngine: VariableEngine,
  ) {
    super();
  }

  async process(job: Job) {
    const { dispatchId, campaignId } = job.data;

    const dispatch = await this.prisma.dispatch.findUniqueOrThrow({
      where: { id: dispatchId },
      include: { lead: true, waNumber: true, campaign: { include: { seller: true } } },
    });

    if (dispatch.status !== 'pending') return;

    const { lead, waNumber, campaign } = dispatch;
    const seller = campaign.seller;

    const leadData: Record<string, string> = {
      nome: lead.fullName || '',
      primeiro_nome: lead.firstName || '',
      telefone: lead.phone,
      ...(lead.extras as Record<string, string>),
      // vendedor — sobrescreve qualquer coluna do CSV com mesmo nome
      ...(seller ? {
        login: seller.login,
        link: seller.link || '',
        linkbotao: seller.linkBotao || '',
      } : {}),
    };

    const resolvedParams = campaign.templateParams.map(param =>
      this.variableEngine.resolve(param, leadData),
    );

    const formData = new URLSearchParams({
      channel: 'whatsapp',
      source: waNumber.phone,
      'src.name': waNumber.appName,
      destination: lead.phone,
      template: JSON.stringify({
        id: campaign.templateId,
        params: resolvedParams,
      }),
    });

    if (campaign.imageUrl) {
      const resolvedImage = this.variableEngine.resolve(campaign.imageUrl, leadData);
      formData.set('message', JSON.stringify({
        type: 'image',
        image: { link: resolvedImage },
      }));
    }

    try {
      const response = await axios.post(
        'https://api.gupshup.io/wa/api/v1/template/msg',
        formData.toString(),
        {
          headers: {
            apikey: waNumber.apiKey,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 15000,
        },
      );

      const messageId = response.data?.messageId || response.data?.id;

      await this.prisma.dispatch.update({
        where: { id: dispatchId },
        data: { status: 'submitted', gupshupMessageId: messageId },
      });
    } catch (err) {
      const errorMsg = err?.response?.data?.message || err.message;
      await this.prisma.dispatch.update({
        where: { id: dispatchId },
        data: { status: 'failed', errorMsg },
      });
      throw err;
    }
  }
}
