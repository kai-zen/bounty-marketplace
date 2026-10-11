import { Module } from '@nestjs/common';
import { IndexerSchemasModule } from '../indexer/indexer-schemas.module';
import { SubmissionsController } from './submissions.controller';
import { SubmissionsService } from './submissions.service';

@Module({
  imports: [IndexerSchemasModule],
  controllers: [SubmissionsController],
  providers: [SubmissionsService],
  exports: [SubmissionsService],
})
export class SubmissionsModule {}
