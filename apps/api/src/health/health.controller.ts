import { Controller, Get } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import {
  HealthCheck,
  HealthCheckService,
  HealthIndicatorService,
} from '@nestjs/terminus';
import { Connection } from 'mongoose';
import { BlockchainService } from '../blockchain/blockchain.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly indicators: HealthIndicatorService,
    @InjectConnection() private readonly connection: Connection,
    private readonly blockchain: BlockchainService,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.pingMongo(),
      () => this.pingBlockchain(),
    ]);
  }

  private async pingMongo() {
    const check = this.indicators.check('mongodb');
    const db = this.connection.db;
    if (!db) {
      return check.down('MongoDB is not connected');
    }

    try {
      await db.command({ ping: 1 });
      return check.up();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'MongoDB ping failed';
      return check.down(message);
    }
  }

  private async pingBlockchain() {
    const check = this.indicators.check('blockchain');
    try {
      await this.blockchain.getBlockNumber();
      return check.up();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'RPC getBlockNumber failed';
      return check.down(message);
    }
  }
}
