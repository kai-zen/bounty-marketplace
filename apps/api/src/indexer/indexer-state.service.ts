import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EnvironmentVariables } from '../config/env.validation';
import {
  IndexerStateDocument,
  IndexerStateRecord,
} from './schemas/indexer-state.schema';

@Injectable()
export class IndexerStateService {
  constructor(
    @InjectModel(IndexerStateRecord.name)
    private readonly stateModel: Model<IndexerStateRecord>,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  async ensureCursor(): Promise<IndexerStateDocument> {
    const chainId = this.config.get('CHAIN_ID', { infer: true });
    const existing = await this.stateModel.findOne({ chainId }).exec();
    if (existing) {
      return existing;
    }

    const startBlock = this.config.get('INDEXER_START_BLOCK', { infer: true });
    const lastProcessedBlock = startBlock - 1;

    return this.stateModel.create({ chainId, lastProcessedBlock });
  }

  async getCursor(): Promise<IndexerStateRecord> {
    const doc = await this.ensureCursor();
    return doc.toObject();
  }

  async setLastProcessedBlock(blockNumber: number): Promise<void> {
    const chainId = this.config.get('CHAIN_ID', { infer: true });
    await this.stateModel
      .updateOne({ chainId }, { $set: { lastProcessedBlock: blockNumber } })
      .exec();
  }
}
