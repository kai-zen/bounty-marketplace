import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { IndexerSchemasModule } from './indexer-schemas.module';
import { IndexerStateService } from './indexer-state.service';
import { IndexerService } from './indexer.service';
import {
  IndexerStateRecord,
  IndexerStateSchema,
} from './schemas/indexer-state.schema';

@Module({
  imports: [
    IndexerSchemasModule,
    BlockchainModule,
    MongooseModule.forFeature([
      { name: IndexerStateRecord.name, schema: IndexerStateSchema },
    ]),
  ],
  providers: [IndexerStateService, IndexerService],
  exports: [IndexerStateService, IndexerSchemasModule],
})
export class IndexerModule {}
