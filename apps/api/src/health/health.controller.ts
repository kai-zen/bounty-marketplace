import { Controller, Get } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import {
  HealthCheck,
  HealthCheckService,
  HealthIndicatorService,
} from '@nestjs/terminus';
import { Connection } from 'mongoose';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly indicators: HealthIndicatorService,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([() => this.pingMongo()]);
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
}
