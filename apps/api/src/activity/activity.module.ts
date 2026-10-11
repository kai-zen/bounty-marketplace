import { Module } from '@nestjs/common';
import { IndexerSchemasModule } from '../indexer/indexer-schemas.module';
import { ActivityController } from './activity.controller';
import { ActivityService } from './activity.service';

@Module({
  imports: [IndexerSchemasModule],
  controllers: [ActivityController],
  providers: [ActivityService],
  exports: [ActivityService],
})
export class ActivityModule {}
