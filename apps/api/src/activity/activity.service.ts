import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ActivityEvent, type Address, type Hex } from '@bounty/types';
import { Model } from 'mongoose';
import { ActivityRecord } from '../indexer/schemas/activity.schema';
import { parseListActivityQuery } from './activity.validation';

export interface ActivityListResult {
  items: ActivityEvent[];
  limit: number;
}

@Injectable()
export class ActivityService {
  constructor(
    @InjectModel(ActivityRecord.name)
    private readonly activityModel: Model<ActivityRecord>,
  ) {}

  async list(query: unknown): Promise<ActivityListResult> {
    let parsed: ReturnType<typeof parseListActivityQuery>;
    try {
      parsed = parseListActivityQuery(query);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Invalid query parameters';
      throw new BadRequestException(message);
    }

    const filter = parsed.bounty === undefined ? {} : { bounty: parsed.bounty };
    const records = await this.activityModel
      .find(filter)
      .sort({ blockNumber: -1, logIndex: -1 })
      .limit(parsed.limit)
      .lean()
      .exec();

    return {
      items: records.map(toActivityEvent).reverse(),
      limit: parsed.limit,
    };
  }
}

function toActivityEvent(record: ActivityRecord): ActivityEvent {
  return {
    type: record.type,
    bounty: record.bounty as Address,
    actor: record.actor as Address,
    txHash: record.txHash as Hex,
    timestamp: record.timestamp,
    ...(record.submissionId != null
      ? { submissionId: record.submissionId }
      : {}),
  };
}
