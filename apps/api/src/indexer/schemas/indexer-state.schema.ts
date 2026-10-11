import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type IndexerStateDocument = HydratedDocument<IndexerStateRecord>;

@Schema({ collection: 'indexer_state', timestamps: true })
export class IndexerStateRecord {
  /** One cursor row per indexed chain (matches `CHAIN_ID` in env). */
  @Prop({ required: true, unique: true, index: true })
  chainId!: number;

  /** Highest block fully processed by the indexer for this chain. */
  @Prop({ required: true })
  lastProcessedBlock!: number;
}

export const IndexerStateSchema =
  SchemaFactory.createForClass(IndexerStateRecord);
