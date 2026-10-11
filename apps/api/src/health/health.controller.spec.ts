import { HealthCheckService, HealthIndicatorService } from '@nestjs/terminus';
import { Connection } from 'mongoose';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  const indicators = new HealthIndicatorService();

  function createController(command: jest.Mock) {
    const health = {
      check: (fns: Array<() => Promise<Record<string, unknown>>>) => fns[0](),
    };
    const connection = { db: { command } };

    return new HealthController(
      health as unknown as HealthCheckService,
      indicators,
      connection as unknown as Connection,
    );
  }

  it('reports MongoDB up when ping succeeds', async () => {
    const command = jest.fn().mockResolvedValue({ ok: 1 });
    const controller = createController(command);

    await expect(controller.check()).resolves.toEqual({
      mongodb: { status: 'up' },
    });
    expect(command).toHaveBeenCalledWith({ ping: 1 });
  });

  it('reports MongoDB down when ping fails', async () => {
    const controller = createController(
      jest.fn().mockRejectedValue(new Error('connection closed')),
    );

    await expect(controller.check()).resolves.toEqual({
      mongodb: { status: 'down', message: 'connection closed' },
    });
  });
});
