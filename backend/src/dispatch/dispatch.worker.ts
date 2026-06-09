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
      include: { lead: true, waNumber: true, seller: true, campaign: true },
    });

    if (dispatch.status !== 'pending') return;

    const { lead, waNumber, campaign, seller } = dispatch;

    const leadData: Record<string, string> = {
      nome: lead.fullName || '',
      primeiro_nome: lead.firstName || '',
      telefone: lead.phone,
      ...(lead.extras as Record<string, string>),
      ...(seller?.linkBotao ? { linkbotao: seller.linkBotao } : {}),
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

    // imagem: vendedor > campanha (suporte a variáveis) > coluna "imagem" do lead
    const imageTemplate = seller?.imageUrl || campaign.imageUrl;
    const resolvedImage = imageTemplate
      ? this.variableEngine.resolve(imageTemplate, leadData)
      : leadData['imagem'];

    if (resolvedImage) {
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

      await this.prisma.waNumber.update({
        where: { id: waNumber.id },
        data: { sentCount: { increment: 1 } },
      });
    } catch (err) {
      const errorCode = err?.response?.data?.status ?? err?.response?.data?.code;
      const errorMsg = err?.response?.data?.message || err.message;

      // 130429 = MPS rate limit da Meta — não falha, reagenda com backoff por tier
      if (errorCode === 130429 || err?.response?.status === 429) {
        const tier = waNumber.tier ?? 1;
        const retryDelays: Record<number, number> = { 1: 30000, 2: 10000, 3: 5000, 4: 2000 };
        job.opts.backoff = { type: 'fixed', delay: retryDelays[tier] ?? 30000 };
        throw err;
      }

      await this.prisma.dispatch.update({
        where: { id: dispatchId },
        data: { status: 'failed', errorMsg },
      });
      throw err;
    }
  }
}
