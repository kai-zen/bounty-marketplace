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
  options?: { upsert: boolean },
];

describe('IndexerSyncService', () => {
  const factoryAddress = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512' as const;
  const registryAddress = '0x5FbDB2315678afecb367f032d93F642f64180aa3' as const;
  const escrow = '0x1234567890123456789012345678901234567890' as const;
  const winner = '0x0000000000000000000000000000000000000003' as const;
  const creator = '0x0000000000000000000000000000000000000002' as const;

  function createService(options: {
    bountyLogs?: unknown[];
    submissionLogs?: unknown[];
    winnerAwardedLogs?: unknown[];
    rewardClaimedLogs?: unknown[];
    bountyRefundedLogs?: unknown[];
    submissionSelectedLogs?: unknown[];
    lastProcessedBlock: number;
    head: bigint;
    bountyMatchedCount?: number;
    submissionMatchedCount?: number;
  }) {
    const getContractEvents = jest
      .fn()
      .mockImplementation(
        (params: { eventName: string; fromBlock: bigint; toBlock: bigint }) => {
          switch (params.eventName) {
            case 'BountyCreated':
              return Promise.resolve(options.bountyLogs ?? []);
            case 'WorkSubmitted':
              return Promise.resolve(options.submissionLogs ?? []);
            case 'WinnerAwarded':
              return Promise.resolve(options.winnerAwardedLogs ?? []);
            case 'RewardClaimed':
              return Promise.resolve(options.rewardClaimedLogs ?? []);
            case 'BountyRefunded':
              return Promise.resolve(options.bountyRefundedLogs ?? []);
            case 'SubmissionSelected':
              return Promise.resolve(options.submissionSelectedLogs ?? []);
            default:
              return Promise.resolve([]);
          }
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
      updateOne: jest
        .fn()
        .mockResolvedValue({ matchedCount: options.bountyMatchedCount ?? 1 }),
    };
    const submissionModel = {
      updateOne: jest.fn().mockResolvedValue({
        matchedCount: options.submissionMatchedCount ?? 1,
      }),
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
      getContractEvents,
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
            creator,
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
            submitter: winner,
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

  it('updates bounty and submission through award and claim', async () => {
    const { service, bountyModel, submissionModel, getContractEvents } =
      createService({
        lastProcessedBlock: 3,
        head: 6n,
        winnerAwardedLogs: [
          {
            address: escrow,
            blockNumber: 4n,
            logIndex: 1,
            args: {
              winner,
              submissionId: 0n,
            },
          },
        ],
        submissionSelectedLogs: [
          {
            blockNumber: 4n,
            logIndex: 0,
            args: {
              submissionId: 0n,
              bountyAddress: escrow,
              submitter: winner,
            },
          },
        ],
        rewardClaimedLogs: [
          {
            address: escrow,
            blockNumber: 5n,
            logIndex: 0,
            args: {
              winner,
              winnerAmount: 990n,
            },
          },
        ],
      });

    await service.sync();

    expect(getContractEvents).toHaveBeenCalledWith(
      expect.objectContaining({ eventName: 'WinnerAwarded' }),
    );
    expect(getContractEvents).toHaveBeenCalledWith(
      expect.objectContaining({ eventName: 'RewardClaimed' }),
    );
    expect(getContractEvents).toHaveBeenCalledWith(
      expect.objectContaining({ eventName: 'SubmissionSelected' }),
    );

    const bountyUpdateCalls = jest.mocked(bountyModel.updateOne).mock
      .calls as unknown as MongoUpdateCall[];
    expect(bountyUpdateCalls).toHaveLength(2);
    expect(bountyUpdateCalls[0]?.[0]).toEqual({
      escrowAddress: escrow.toLowerCase(),
    });
    expect(bountyUpdateCalls[0]?.[1].$set).toMatchObject({
      status: BountyStatus.Awarded,
      winner: winner.toLowerCase(),
      winningSubmissionId: 0,
      lastIndexedBlockNumber: 4,
    });
    expect(bountyUpdateCalls[0]?.[2]).toBeUndefined();
    expect(bountyUpdateCalls[1]?.[1].$set).toMatchObject({
      status: BountyStatus.Claimed,
      lastIndexedBlockNumber: 5,
    });

    const submissionUpdateCalls = jest.mocked(submissionModel.updateOne).mock
      .calls as unknown as MongoUpdateCall[];
    expect(submissionUpdateCalls).toHaveLength(1);
    expect(submissionUpdateCalls[0]?.[0]).toEqual({ submissionId: 0 });
    expect(submissionUpdateCalls[0]?.[1].$set).toMatchObject({
      status: SubmissionStatus.Selected,
    });
    expect(submissionUpdateCalls[0]?.[2]).toBeUndefined();
  });

  it('updates bounty status to Refunded on BountyRefunded', async () => {
    const { service, bountyModel } = createService({
      lastProcessedBlock: 3,
      head: 5n,
      bountyRefundedLogs: [
        {
          address: escrow,
          blockNumber: 4n,
          logIndex: 0,
          args: {
            creator,
            amount: 1000n,
          },
        },
      ],
    });

    await service.sync();

    const bountyUpdateCalls = jest.mocked(bountyModel.updateOne).mock
      .calls as unknown as MongoUpdateCall[];
    expect(bountyUpdateCalls).toHaveLength(1);
    expect(bountyUpdateCalls[0]?.[0]).toEqual({
      escrowAddress: escrow.toLowerCase(),
    });
    expect(bountyUpdateCalls[0]?.[1].$set).toMatchObject({
      status: BountyStatus.Refunded,
      lastIndexedBlockNumber: 4,
    });
    expect(bountyUpdateCalls[0]?.[2]).toBeUndefined();
  });
});
