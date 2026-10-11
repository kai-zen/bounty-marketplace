import { BountyStatus, SubmissionStatus } from '@bounty/types';
import { ActivitySchema } from './activity.schema';
import { BountySchema } from './bounty.schema';
import { SubmissionSchema } from './submission.schema';

describe('indexer Mongoose schemas', () => {
  it('defines Bounty fields aligned with on-chain index data', () => {
    expect(BountySchema.path('escrowAddress')?.options.unique).toBe(true);
    expect(BountySchema.path('status')?.options.enum).toMatchObject(
      BountyStatus,
    );
    for (const path of [
      'creator',
      'reward',
      'deadline',
      'metadataURI',
      'createdTxHash',
      'createdBlockNumber',
      'lastIndexedBlockNumber',
    ] as const) {
      expect(BountySchema.path(path)).toBeDefined();
    }
  });

  it('defines Submission fields for registry events', () => {
    expect(SubmissionSchema.path('submissionId')?.options.unique).toBe(true);
    expect(SubmissionSchema.path('status')?.options.enum).toMatchObject(
      SubmissionStatus,
    );
    for (const path of [
      'bountyAddress',
      'submitter',
      'submissionURI',
    ] as const) {
      expect(SubmissionSchema.path(path)).toBeDefined();
    }
  });

  it('defines an append-only Activity timeline ordered by chain position', () => {
    for (const path of [
      'type',
      'bounty',
      'actor',
      'txHash',
      'timestamp',
      'blockNumber',
      'logIndex',
    ] as const) {
      expect(ActivitySchema.path(path)).toBeDefined();
    }
    expect(ActivitySchema.indexes()).toEqual(
      expect.arrayContaining([
        [
          { blockNumber: 1, logIndex: 1 },
          expect.objectContaining({ unique: true }),
        ],
      ]),
    );
  });
});
