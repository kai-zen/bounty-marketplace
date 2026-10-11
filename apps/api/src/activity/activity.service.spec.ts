import { BadRequestException } from '@nestjs/common';
import { Model } from 'mongoose';
import { ActivityRecord } from '../indexer/schemas/activity.schema';
import { ActivityService } from './activity.service';

const bounty = '0x1234567890123456789012345678901234567890';
const creator = '0x0000000000000000000000000000000000000002';
const submitter = '0x0000000000000000000000000000000000000003';
const tx = (suffix: string) => `0x${suffix.padEnd(64, 'a')}`;

function activity(
  overrides: Pick<ActivityRecord, 'type' | 'blockNumber' | 'logIndex'> &
    Partial<ActivityRecord>,
): ActivityRecord {
  return {
    bounty,
    actor: creator,
    txHash: tx(`${overrides.blockNumber}${overrides.logIndex}`),
    timestamp: 1_700_000_000 + overrides.blockNumber,
    ...overrides,
  };
}

describe('ActivityService', () => {
  function createService(list: ActivityRecord[]) {
    const findQuery = {
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(list),
    };
    const activityModel = {
      find: jest.fn().mockReturnValue(findQuery),
    };
    const service = new ActivityService(
      activityModel as unknown as Model<ActivityRecord>,
    );
    return { service, activityModel, findQuery };
  }

  it('returns a bounty timeline in chain order through claim', async () => {
    const created = activity({
      type: 'BountyCreated',
      actor: creator,
      blockNumber: 2,
      logIndex: 0,
    });
    const submitted = activity({
      type: 'WorkSubmitted',
      actor: submitter,
      submissionId: 0,
      blockNumber: 3,
      logIndex: 0,
    });
    const selected = activity({
      type: 'SubmissionSelected',
      actor: submitter,
      submissionId: 0,
      blockNumber: 4,
      logIndex: 0,
    });
    const awarded = activity({
      type: 'WinnerAwarded',
      actor: submitter,
      submissionId: 0,
      blockNumber: 4,
      logIndex: 1,
    });
    const claimed = activity({
      type: 'RewardClaimed',
      actor: submitter,
      blockNumber: 5,
      logIndex: 0,
    });
    const { service, activityModel, findQuery } = createService([
      claimed,
      awarded,
      selected,
      submitted,
      created,
    ]);

    const result = await service.list({ bounty, limit: '20' });

    expect(activityModel.find).toHaveBeenCalledWith({ bounty });
    expect(findQuery.sort).toHaveBeenCalledWith({
      blockNumber: -1,
      logIndex: -1,
    });
    expect(findQuery.limit).toHaveBeenCalledWith(20);
    expect(result.limit).toBe(20);
    expect(result.items.map((item) => item.type)).toEqual([
      'BountyCreated',
      'WorkSubmitted',
      'SubmissionSelected',
      'WinnerAwarded',
      'RewardClaimed',
    ]);
    expect(result.items[1]).toMatchObject({
      bounty,
      actor: submitter,
      submissionId: 0,
    });
    expect(result.items[0]).not.toHaveProperty('submissionId');
  });

  it('returns a bounty timeline in chain order through refund', async () => {
    const created = activity({
      type: 'BountyCreated',
      blockNumber: 2,
      logIndex: 0,
    });
    const submitted = activity({
      type: 'WorkSubmitted',
      actor: submitter,
      submissionId: 1,
      blockNumber: 3,
      logIndex: 0,
    });
    const refunded = activity({
      type: 'BountyRefunded',
      actor: creator,
      blockNumber: 8,
      logIndex: 0,
    });
    const { service } = createService([refunded, submitted, created]);

    const result = await service.list({ bounty });

    expect(result.items.map((item) => item.type)).toEqual([
      'BountyCreated',
      'WorkSubmitted',
      'BountyRefunded',
    ]);
    expect(result.limit).toBe(50);
  });

  it('lists the global timeline when bounty is omitted', async () => {
    const { service, activityModel, findQuery } = createService([]);

    await service.list({});

    expect(activityModel.find).toHaveBeenCalledWith({});
    expect(findQuery.limit).toHaveBeenCalledWith(50);
  });

  it('rejects an invalid bounty address', async () => {
    const { service, activityModel } = createService([]);

    await expect(
      service.list({ bounty: 'not-an-address' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(activityModel.find).not.toHaveBeenCalled();
  });
});
