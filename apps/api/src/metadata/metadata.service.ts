import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomUUID } from 'node:crypto';
import { BountyMetadata, SubmissionMetadata } from '@bounty/types';
import { EnvironmentVariables } from '../config/env.validation';
import { MetadataKind, MetadataRecord } from './schemas/metadata.schema';
import { validateMetadataPayload } from './metadata.validation';
import { API_GLOBAL_PREFIX } from '../configure-app';

export interface CreateMetadataResult {
  uri: string;
}

/** On-chain metadataURI values use `{API_PUBLIC_URL}/api/v1/metadata/{id}`. */
@Injectable()
export class MetadataService {
  constructor(
    @InjectModel(MetadataRecord.name)
    private readonly metadataModel: Model<MetadataRecord>,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  async createBountyMetadata(body: unknown): Promise<CreateMetadataResult> {
    return this.create('bounty', body);
  }

  async createSubmissionMetadata(body: unknown): Promise<CreateMetadataResult> {
    return this.create('submission', body);
  }

  async getById(id: string): Promise<BountyMetadata | SubmissionMetadata> {
    const record = await this.findRecord(id);
    if (!record) {
      throw new NotFoundException(`Metadata not found: ${id}`);
    }
    return record.payload;
  }

  async findRecord(id: string): Promise<{
    kind: MetadataKind;
    payload: BountyMetadata | SubmissionMetadata;
  } | null> {
    const record = await this.metadataModel
      .findOne({ id })
      .select({ kind: 1, payload: 1 })
      .lean()
      .exec();
    if (!record) {
      return null;
    }
    return { kind: record.kind, payload: record.payload };
  }

  private async create(
    kind: MetadataKind,
    body: unknown,
  ): Promise<CreateMetadataResult> {
    let payload: BountyMetadata | SubmissionMetadata;
    try {
      payload = validateMetadataPayload(body);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Invalid metadata payload';
      throw new BadRequestException(message);
    }

    const id = randomUUID();
    await this.metadataModel.create({ id, kind, payload });

    return { uri: this.buildMetadataUri(id) };
  }

  buildMetadataUri(id: string): string {
    const base = this.config
      .get('API_PUBLIC_URL', { infer: true })
      .replace(/\/$/, '');
    return `${base}/${API_GLOBAL_PREFIX}/metadata/${id}`;
  }
}
