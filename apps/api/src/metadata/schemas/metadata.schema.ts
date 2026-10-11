import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes } from 'mongoose';
import { BountyMetadata, SubmissionMetadata } from '@bounty/types';

export type MetadataKind = 'bounty' | 'submission';

export type MetadataDocument = HydratedDocument<MetadataRecord>;

@Schema({
  collection: 'metadata',
  timestamps: { createdAt: true, updatedAt: false },
})
export class MetadataRecord {
  @Prop({ required: true, unique: true, index: true })
  id!: string;

  @Prop({ required: true, enum: ['bounty', 'submission'] })
  kind!: MetadataKind;

  @Prop({ type: SchemaTypes.Mixed, required: true })
  payload!: BountyMetadata | SubmissionMetadata;
}

export const MetadataSchema = SchemaFactory.createForClass(MetadataRecord);
