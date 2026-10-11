import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { MetadataModule } from '../metadata/metadata.module';
import { BountyMetadataResolver } from './bounty-metadata.resolver';
import { IndexerSchemasModule } from './indexer-schemas.module';
import { IndexerStateService } from './indexer-state.service';
import { IndexerService } from './indexer.service';
import { IndexerSyncService } from './indexer-sync.service';
import {
  IndexerStateRecord,
  IndexerStateSchema,
} from './schemas/indexer-state.schema';

@Module({
  imports: [
    IndexerSchemasModule,
    BlockchainModule,
    MetadataModule,
    MongooseModule.forFeature([
      { name: IndexerStateRecord.name, schema: IndexerStateSchema },
    ]),
  ],
  providers: [
    IndexerStateService,
    IndexerSyncService,
    IndexerService,
    BountyMetadataResolver,
  ],
  exports: [IndexerStateService, IndexerSchemasModule],
})
export class IndexerModule {}
