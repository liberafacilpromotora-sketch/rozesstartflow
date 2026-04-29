import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DispatchService } from './dispatch.service';
import { DispatchWorker } from './dispatch.worker';
import { NumbersModule } from '../numbers/numbers.module';
import { VariablesModule } from '../variables/variables.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'dispatch' }),
    NumbersModule,
    VariablesModule,
  ],
  providers: [DispatchService, DispatchWorker],
  exports: [DispatchService],
})
export class DispatchModule {}
