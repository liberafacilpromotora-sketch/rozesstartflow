import { Module } from '@nestjs/common';
import { VariableEngine } from './variable-engine';

@Module({
  providers: [VariableEngine],
  exports: [VariableEngine],
})
export class VariablesModule {}
