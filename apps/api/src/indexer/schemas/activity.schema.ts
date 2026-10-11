import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { ActivityEventType } from '@bounty/types';
import { HydratedDocument } from 'mongoose';

export type ActivityDocument = HydratedDocument<ActivityRecord>;

const ACTIVITY_TYPES: ActivityEventType[] = [
  'BountyCreated',
  'WorkSubmitted',
  'SubmissionSelected',
  'WinnerAwarded',
  'RewardClaimed',
  'BountyRefunded',
];

/** Append-only timeline row. `blockNumber` and `logIndex` order events on a bounty. */
@Schema({ collection: 'activity', timestamps: false })
export class ActivityRecord {
  @Prop({ required: true, enum: ACTIVITY_TYPES, type: String })
  type!: ActivityEventType;

  @Prop({ required: true, lowercase: true })
  bounty!: string;

  @Prop({ required: true, lowercase: true })
  actor!: string;

  @Prop({ required: true, lowercase: true })
  txHash!: string;

  @Prop({ required: true })
  timestamp!: number;

  @Prop({ type: Number })
  submissionId?: number;

  @Prop({ required: true })
  blockNumber!: number;

  @Prop({ required: true })
  logIndex!: number;
}

export const ActivitySchema = SchemaFactory.createForClass(ActivityRecord);

ActivitySchema.index({ blockNumber: 1, logIndex: 1 }, { unique: true });
ActivitySchema.index({ bounty: 1, blockNumber: 1, logIndex: 1 });
