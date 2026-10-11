import { Module } from '@nestjs/common';
import { IndexerSchemasModule } from '../indexer/indexer-schemas.module';
import { BountiesController } from './bounties.controller';
import { BountiesService } from './bounties.service';

@Module({
  imports: [IndexerSchemasModule],
  controllers: [BountiesController],
  providers: [BountiesService],
  exports: [BountiesService],
})
export class BountiesModule {}
