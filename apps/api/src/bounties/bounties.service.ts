import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  BountyDetail,
  BountySummary,
  PageResult,
  type Address,
  type Hex,
} from '@bounty/types';
import { Model } from 'mongoose';
import { BountyRecord } from '../indexer/schemas/bounty.schema';
import {
  parseEscrowAddress,
  parseListBountiesQuery,
} from './bounties.validation';

@Injectable()
export class BountiesService {
  constructor(
    @InjectModel(BountyRecord.name)
    private readonly bountyModel: Model<BountyRecord>,
  ) {}

  async list(query: unknown): Promise<PageResult<BountySummary>> {
    let parsed: ReturnType<typeof parseListBountiesQuery>;
    try {
      parsed = parseListBountiesQuery(query);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Invalid query parameters';
      throw new BadRequestException(message);
    }

    const { page, limit, status, search } = parsed;
    const filter: {
      status?: typeof status;
      searchText?: { $regex: string; $options: 'i' };
    } = {};
    if (status !== undefined) {
      filter.status = status;
    }
    if (search !== undefined) {
      filter.searchText = { $regex: escapeRegex(search), $options: 'i' };
    }

    const [records, total] = await Promise.all([
      this.bountyModel
        .find(filter)
        .sort({ createdBlockNumber: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      this.bountyModel.countDocuments(filter).exec(),
    ]);

    return {
      items: records.map(toBountySummary),
      page,
      limit,
      total,
    };
  }

  async getByAddress(escrowAddress: string): Promise<BountyDetail> {
    let address: Address;
    try {
      address = parseEscrowAddress(escrowAddress);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Invalid escrow address';
      throw new BadRequestException(message);
    }

    const record = await this.bountyModel
      .findOne({ escrowAddress: address })
      .lean()
      .exec();
    if (!record) {
      throw new NotFoundException(`Bounty not found: ${address}`);
    }

    return toBountyDetail(record);
  }
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toBountySummary(record: BountyRecord): BountySummary {
  return {
    escrowAddress: record.escrowAddress as Address,
    creator: record.creator as Address,
    title: record.title,
    reward: record.reward,
    deadline: record.deadline,
    status: record.status,
    winner: record.winner as Address | null,
  };
}

function toBountyDetail(record: BountyRecord): BountyDetail {
  return {
    ...toBountySummary(record),
    metadataURI: record.metadataURI,
    metadata: null,
    winningSubmissionId: record.winningSubmissionId,
    submissionRegistry: record.submissionRegistry as Address,
    feeRecipient: record.feeRecipient as Address,
    platformFeeBps: record.platformFeeBps,
    createdTxHash: record.createdTxHash as Hex,
    createdBlockNumber: record.createdBlockNumber,
  };
}
