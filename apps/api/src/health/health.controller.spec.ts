import { HealthCheckService, HealthIndicatorService } from '@nestjs/terminus';
import { Connection } from 'mongoose';
import { BlockchainService } from '../blockchain/blockchain.service';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  const indicators = new HealthIndicatorService();

  function createController(
    command: jest.Mock,
    getBlockNumber: jest.Mock = jest.fn().mockResolvedValue(1n),
  ) {
    const health = {
      check: async (
        fns: Array<() => Promise<Record<string, unknown>>>,
      ): Promise<Record<string, unknown>> => {
        const parts = await Promise.all(fns.map((fn) => fn()));
        return parts.reduce<Record<string, unknown>>(
          (acc, part) => ({ ...acc, ...part }),
          {},
        );
      },
    };
    const connection = { db: { command } };
    const blockchain = { getBlockNumber };

    return new HealthController(
      health as unknown as HealthCheckService,
      indicators,
      connection as unknown as Connection,
      blockchain as unknown as BlockchainService,
    );
  }

  it('reports MongoDB and blockchain up when pings succeed', async () => {
    const command = jest.fn().mockResolvedValue({ ok: 1 });
    const getBlockNumber = jest.fn().mockResolvedValue(42n);
    const controller = createController(command, getBlockNumber);

    await expect(controller.check()).resolves.toEqual({
      mongodb: { status: 'up' },
      blockchain: { status: 'up' },
    });
    expect(command).toHaveBeenCalledWith({ ping: 1 });
    expect(getBlockNumber).toHaveBeenCalled();
  });

  it('reports MongoDB down when ping fails', async () => {
    const controller = createController(
      jest.fn().mockRejectedValue(new Error('connection closed')),
    );

    await expect(controller.check()).resolves.toEqual({
      mongodb: { status: 'down', message: 'connection closed' },
      blockchain: { status: 'up' },
    });
  });

  it('reports blockchain down when getBlockNumber fails', async () => {
    const controller = createController(
      jest.fn().mockResolvedValue({ ok: 1 }),
      jest.fn().mockRejectedValue(new Error('ECONNREFUSED')),
    );

    await expect(controller.check()).resolves.toEqual({
      mongodb: { status: 'up' },
      blockchain: { status: 'down', message: 'ECONNREFUSED' },
    });
  });
});
