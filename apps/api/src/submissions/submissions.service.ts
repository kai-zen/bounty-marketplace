import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { PageResult, SubmissionSummary, type Address } from '@bounty/types';
import { Model } from 'mongoose';
import { parseEscrowAddress } from '../bounties/bounties.validation';
import { SubmissionRecord } from '../indexer/schemas/submission.schema';
import {
  parseListBountySubmissionsQuery,
  parseListSubmitterSubmissionsQuery,
} from './submissions.validation';

@Injectable()
export class SubmissionsService {
  constructor(
    @InjectModel(SubmissionRecord.name)
    private readonly submissionModel: Model<SubmissionRecord>,
  ) {}

  async listForBounty(
    escrowAddress: string,
    query: unknown,
  ): Promise<PageResult<SubmissionSummary>> {
    let bountyAddress: Address;
    try {
      bountyAddress = parseEscrowAddress(escrowAddress);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Invalid escrow address';
      throw new BadRequestException(message);
    }

    let parsed: ReturnType<typeof parseListBountySubmissionsQuery>;
    try {
      parsed = parseListBountySubmissionsQuery(query);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Invalid query parameters';
      throw new BadRequestException(message);
    }

    return this.paginate(
      { bountyAddress },
      { submissionId: 1, _id: 1 },
      parsed.page,
      parsed.limit,
    );
  }

  async listBySubmitter(
    query: unknown,
  ): Promise<PageResult<SubmissionSummary>> {
    let parsed: ReturnType<typeof parseListSubmitterSubmissionsQuery>;
    try {
      parsed = parseListSubmitterSubmissionsQuery(query);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Invalid query parameters';
      throw new BadRequestException(message);
    }

    return this.paginate(
      { submitter: parsed.submitter },
      { submissionId: -1, _id: -1 },
      parsed.page,
      parsed.limit,
    );
  }

  private async paginate(
    filter: { bountyAddress: Address } | { submitter: Address },
    sort: { submissionId: 1 | -1; _id: 1 | -1 },
    page: number,
    limit: number,
  ): Promise<PageResult<SubmissionSummary>> {
    const [records, total] = await Promise.all([
      this.submissionModel
        .find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      this.submissionModel.countDocuments(filter).exec(),
    ]);

    return {
      items: records.map(toSubmissionSummary),
      page,
      limit,
      total,
    };
  }
}

function toSubmissionSummary(record: SubmissionRecord): SubmissionSummary {
  return {
    submissionId: record.submissionId,
    bountyAddress: record.bountyAddress as Address,
    submitter: record.submitter as Address,
    title: record.title ?? '',
    submissionURI: record.submissionURI,
    status: record.status,
  };
}
