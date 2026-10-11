import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ActivityRecord, ActivitySchema } from './schemas/activity.schema';
import { BountyRecord, BountySchema } from './schemas/bounty.schema';
import {
  SubmissionRecord,
  SubmissionSchema,
} from './schemas/submission.schema';

/** Registers indexer collections. IndexerModule (Step 21) builds on this. */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ActivityRecord.name, schema: ActivitySchema },
      { name: BountyRecord.name, schema: BountySchema },
      { name: SubmissionRecord.name, schema: SubmissionSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class IndexerSchemasModule {}
