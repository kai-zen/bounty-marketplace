import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BountyStatus } from '@bounty/types';
import { Model } from 'mongoose';
import { BountyRecord } from '../indexer/schemas/bounty.schema';
import { BountiesService } from './bounties.service';

const escrow = '0x1234567890123456789012345678901234567890';
const creator = '0x0000000000000000000000000000000000000002';

const indexedBounty: BountyRecord = {
  escrowAddress: escrow,
  creator,
  title: '',
  tags: [],
  searchText: '',
  reward: '1000',
  deadline: 1_900_000_000,
  metadataURI: 'http://localhost:3001/api/v1/metadata/abc',
  status: BountyStatus.Open,
  winner: null,
  winningSubmissionId: null,
  submissionRegistry: '0x5fbdb2315678afecb367f032d93f642f64180aa3',
  feeRecipient: '0x0000000000000000000000000000000000000001',
  platformFeeBps: 100,
  createdTxHash:
    '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  createdBlockNumber: 12,
  lastIndexedBlockNumber: 12,
};

describe('BountiesService', () => {
  function createService(options: {
    list?: BountyRecord[];
    total?: number;
    detail?: BountyRecord | null;
  }) {
    const findQuery = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(options.list ?? []),
    };
    const findOneQuery = {
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(options.detail ?? null),
    };

    const bountyModel = {
      find: jest.fn().mockReturnValue(findQuery),
      countDocuments: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(options.total ?? 0),
      }),
      findOne: jest.fn().mockReturnValue(findOneQuery),
    };

    const service = new BountiesService(
      bountyModel as unknown as Model<BountyRecord>,
    );

    return { service, bountyModel, findQuery, findOneQuery };
  }

  it('lists indexed bounties with pagination and optional status', async () => {
    const { service, bountyModel, findQuery } = createService({
      list: [indexedBounty],
      total: 1,
    });

    const result = await service.list({ page: '1', limit: '20', status: '0' });

    expect(bountyModel.find).toHaveBeenCalledWith({
      status: BountyStatus.Open,
    });
    expect(findQuery.sort).toHaveBeenCalledWith({
      createdBlockNumber: -1,
      _id: -1,
    });
    expect(findQuery.skip).toHaveBeenCalledWith(0);
    expect(findQuery.limit).toHaveBeenCalledWith(20);
    expect(bountyModel.find).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      items: [
        {
          escrowAddress: escrow,
          creator,
          title: '',
          reward: '1000',
          deadline: 1_900_000_000,
          status: BountyStatus.Open,
          winner: null,
        },
      ],
      page: 1,
      limit: 20,
      total: 1,
    });
  });

  it('filters list search against denormalized text', async () => {
    const { service, bountyModel } = createService({
      list: [
        {
          ...indexedBounty,
          title: 'Fix login bug',
          searchText: 'fix login bug\nsession expires too soon\nauth',
        },
      ],
      total: 1,
    });

    const result = await service.list({ search: 'Login', status: '0' });

    expect(bountyModel.find).toHaveBeenCalledTimes(1);
    expect(bountyModel.find).toHaveBeenCalledWith({
      status: BountyStatus.Open,
      searchText: { $regex: 'Login', $options: 'i' },
    });
    expect(result.items).toEqual([
      expect.objectContaining({ title: 'Fix login bug' }),
    ]);
  });

  it('escapes regex characters in search', async () => {
    const { service, bountyModel } = createService({ list: [], total: 0 });

    await service.list({ search: 'c++' });

    expect(bountyModel.find).toHaveBeenCalledWith({
      searchText: { $regex: 'c\\+\\+', $options: 'i' },
    });
  });

  it('returns bounty detail from indexed fields', async () => {
    const { service, bountyModel } = createService({
      detail: {
        ...indexedBounty,
        status: BountyStatus.Awarded,
        winner: '0x0000000000000000000000000000000000000003',
        winningSubmissionId: 0,
      },
    });

    const detail = await service.getByAddress(
      '0x1234567890123456789012345678901234567890',
    );

    expect(bountyModel.findOne).toHaveBeenCalledWith({
      escrowAddress: escrow,
    });
    expect(detail).toMatchObject({
      escrowAddress: escrow,
      status: BountyStatus.Awarded,
      winner: '0x0000000000000000000000000000000000000003',
      winningSubmissionId: 0,
      metadataURI: indexedBounty.metadataURI,
      metadata: null,
      createdTxHash: indexedBounty.createdTxHash,
      createdBlockNumber: 12,
    });
  });

  it('rejects invalid list query and unknown escrow', async () => {
    const { service } = createService({ detail: null });

    await expect(service.list({ status: '99' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(service.getByAddress('not-an-address')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(service.getByAddress(escrow)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
