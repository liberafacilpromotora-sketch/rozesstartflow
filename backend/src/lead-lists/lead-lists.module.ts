import { Module } from '@nestjs/common';
import { LeadListsService } from './lead-lists.service';
import { LeadListsController } from './lead-lists.controller';

@Module({
  controllers: [LeadListsController],
  providers: [LeadListsService],
  exports: [LeadListsService],
})
export class LeadListsModule {}
