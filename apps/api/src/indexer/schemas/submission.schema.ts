import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SubmissionStatus } from '@bounty/types';
import { HydratedDocument } from 'mongoose';

export type SubmissionDocument = HydratedDocument<SubmissionRecord>;

@Schema({ collection: 'submissions', timestamps: true })
export class SubmissionRecord {
  @Prop({ required: true, unique: true, index: true })
  submissionId!: number;

  @Prop({ required: true, index: true, lowercase: true })
  bountyAddress!: string;

  @Prop({ required: true, lowercase: true })
  submitter!: string;

  /** Denormalized from metadata when indexed (Step 27). */
  @Prop({ default: '' })
  title!: string;

  @Prop({ required: true })
  submissionURI!: string;

  @Prop({ required: true, enum: SubmissionStatus, type: Number })
  status!: SubmissionStatus;
}

export const SubmissionSchema = SchemaFactory.createForClass(SubmissionRecord);

SubmissionSchema.index({ bountyAddress: 1, submissionId: 1 });
SubmissionSchema.index({ submitter: 1, submissionId: -1 });
