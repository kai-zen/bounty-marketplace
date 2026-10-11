import { BountyStatus, SubmissionStatus } from '@bounty/types';
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
});
