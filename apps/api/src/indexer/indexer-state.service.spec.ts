import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import { IndexerStateService } from './indexer-state.service';
import { IndexerStateRecord } from './schemas/indexer-state.schema';

describe('IndexerStateService', () => {
  const chainId = 31337;
  const config = {
    get: (key: string) => {
      const values: Record<string, number> = {
        CHAIN_ID: chainId,
        INDEXER_START_BLOCK: 0,
      };
      return values[key];
    },
  };

  it('creates a cursor from INDEXER_START_BLOCK when none exists', async () => {
    const created = {
      chainId,
      lastProcessedBlock: -1,
      toObject: () => ({ chainId, lastProcessedBlock: -1 }),
    };
    const stateModel = {
      findOne: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
      create: jest.fn().mockResolvedValue(created),
      updateOne: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue({}) }),
    };

    const service = new IndexerStateService(
      stateModel as unknown as Model<IndexerStateRecord>,
      config as unknown as ConfigService<
        import('../config/env.validation').EnvironmentVariables,
        true
      >,
    );

    await expect(service.ensureCursor()).resolves.toMatchObject({
      chainId,
      lastProcessedBlock: -1,
    });
    expect(stateModel.create).toHaveBeenCalledWith({
      chainId,
      lastProcessedBlock: -1,
    });
  });

  it('updates lastProcessedBlock for the configured chain', async () => {
    const exec = jest.fn().mockResolvedValue({ modifiedCount: 1 });
    const stateModel = {
      findOne: jest.fn(),
      create: jest.fn(),
      updateOne: jest.fn().mockReturnValue({ exec }),
    };

    const service = new IndexerStateService(
      stateModel as unknown as Model<IndexerStateRecord>,
      config as unknown as ConfigService<
        import('../config/env.validation').EnvironmentVariables,
        true
      >,
    );

    await service.setLastProcessedBlock(42);
    expect(stateModel.updateOne).toHaveBeenCalledWith(
      { chainId },
      { $set: { lastProcessedBlock: 42 } },
    );
  });
});
