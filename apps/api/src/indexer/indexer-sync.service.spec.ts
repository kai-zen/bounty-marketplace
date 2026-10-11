import { Model } from 'mongoose';
import { BountyStatus, SubmissionStatus } from '@bounty/types';
import { BlockchainService } from '../blockchain/blockchain.service';
import { IndexerStateService } from './indexer-state.service';
import { IndexerSyncService } from './indexer-sync.service';
import { BountyRecord } from './schemas/bounty.schema';
import { SubmissionRecord } from './schemas/submission.schema';

type MongoUpdateCall = [
  filter: Record<string, unknown>,
  update: { $set: Record<string, unknown> },
  options: { upsert: boolean },
];

describe('IndexerSyncService', () => {
  const factoryAddress = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512' as const;
  const registryAddress = '0x5FbDB2315678afecb367f032d93F642f64180aa3' as const;
  const escrow = '0x1234567890123456789012345678901234567890' as const;

  function createService(options: {
    bountyLogs?: unknown[];
    submissionLogs?: unknown[];
    lastProcessedBlock: number;
    head: bigint;
  }) {
    const getContractEvents = jest
      .fn()
      .mockImplementation(
        (params: { eventName: string; fromBlock: bigint; toBlock: bigint }) => {
          if (params.eventName === 'BountyCreated') {
            return Promise.resolve(options.bountyLogs ?? []);
          }
          return Promise.resolve(options.submissionLogs ?? []);
        },
      );

    const readContract = jest
      .fn()
      .mockImplementation((params: { functionName: string }) => {
        if (params.functionName === 'submissionRegistry') {
          return Promise.resolve(registryAddress);
        }
        if (params.functionName === 'feeRecipient') {
          return Promise.resolve('0x0000000000000000000000000000000000000001');
        }
        return Promise.resolve(100n);
      });

    const blockchain = {
      publicClient: { getContractEvents, readContract },
      factoryAddress,
      registryAddress,
      getBlockNumber: jest.fn().mockResolvedValue(options.head),
    };

    const state = {
      getCursor: jest
        .fn()
        .mockResolvedValue({ lastProcessedBlock: options.lastProcessedBlock }),
      setLastProcessedBlock: jest.fn().mockResolvedValue(undefined),
    };

    const bountyModel = {
      updateOne: jest.fn().mockResolvedValue({}),
    };
    const submissionModel = {
      updateOne: jest.fn().mockResolvedValue({}),
    };

    const service = new IndexerSyncService(
      blockchain as unknown as BlockchainService,
      state as unknown as IndexerStateService,
      bountyModel as unknown as Model<BountyRecord>,
      submissionModel as unknown as Model<SubmissionRecord>,
    );

    return {
      service,
      bountyModel,
      submissionModel,
      state,
    };
  }

  it('upserts bounty and submission rows and advances the cursor', async () => {
    const txHash =
      '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as const;
    const { service, bountyModel, submissionModel, state } = createService({
      lastProcessedBlock: -1,
      head: 5n,
      bountyLogs: [
        {
          blockNumber: 2n,
          logIndex: 0,
          transactionHash: txHash,
          args: {
            bountyId: 0n,
            escrow,
            creator: '0x0000000000000000000000000000000000000002',
            deadline: 9999999999n,
            metadataURI: 'https://example.com/bounty',
            amount: 1000n,
          },
        },
      ],
      submissionLogs: [
        {
          blockNumber: 3n,
          logIndex: 1,
          args: {
            submissionId: 0n,
            bountyAddress: escrow,
            submitter: '0x0000000000000000000000000000000000000003',
            submissionURI: 'https://example.com/submission',
          },
        },
      ],
    });

    await service.sync();

    expect(bountyModel.updateOne).toHaveBeenCalledWith(
      { escrowAddress: escrow.toLowerCase() },
      expect.any(Object),
      { upsert: true },
    );
    const bountyUpdateCalls = jest.mocked(bountyModel.updateOne).mock
      .calls as unknown as MongoUpdateCall[];
    expect(bountyUpdateCalls[0]?.[1].$set).toMatchObject({
      status: BountyStatus.Open,
      metadataURI: 'https://example.com/bounty',
      reward: '1000',
      createdTxHash: txHash,
    });

    expect(submissionModel.updateOne).toHaveBeenCalledWith(
      { submissionId: 0 },
      expect.any(Object),
      { upsert: true },
    );
    const submissionUpdateCalls = jest.mocked(submissionModel.updateOne).mock
      .calls as unknown as MongoUpdateCall[];
    expect(submissionUpdateCalls[0]?.[1].$set).toMatchObject({
      status: SubmissionStatus.Pending,
      submissionURI: 'https://example.com/submission',
    });

    expect(state.setLastProcessedBlock).toHaveBeenCalledWith(5);
  });
});
