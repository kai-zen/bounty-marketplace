import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { HealthController } from './health.controller';

@Module({
  imports: [TerminusModule, BlockchainModule],
  controllers: [HealthController],
})
export class HealthModule {}
