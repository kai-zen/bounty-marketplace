import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BountyStatus } from '@bounty/types';
import { HydratedDocument } from 'mongoose';

export type BountyDocument = HydratedDocument<BountyRecord>;

@Schema({ collection: 'bounties', timestamps: true })
export class BountyRecord {
  @Prop({ required: true, unique: true, index: true, lowercase: true })
  escrowAddress!: string;

  @Prop({ required: true, lowercase: true })
  creator!: string;

  /** Denormalized from bounty metadata when the bounty is indexed. */
  @Prop({ default: '' })
  title!: string;

  /** Denormalized tags from bounty metadata. */
  @Prop({ type: [String], default: [] })
  tags!: string[];

  /** Lowercased title, description, and tags for list search. */
  @Prop({ default: '' })
  searchText!: string;

  @Prop({ required: true })
  reward!: string;

  @Prop({ required: true })
  deadline!: number;

  @Prop({ required: true })
  metadataURI!: string;

  @Prop({ required: true, enum: BountyStatus, type: Number })
  status!: BountyStatus;

  @Prop({ type: String, default: null, lowercase: true })
  winner!: string | null;

  @Prop({ type: Number, default: null })
  winningSubmissionId!: number | null;

  @Prop({ required: true, lowercase: true })
  submissionRegistry!: string;

  @Prop({ required: true, lowercase: true })
  feeRecipient!: string;

  @Prop({ required: true })
  platformFeeBps!: number;

  @Prop({ required: true })
  createdTxHash!: string;

  @Prop({ required: true })
  createdBlockNumber!: number;

  /** Block of the last on-chain update applied by the indexer. */
  @Prop({ required: true })
  lastIndexedBlockNumber!: number;
}

export const BountySchema = SchemaFactory.createForClass(BountyRecord);
