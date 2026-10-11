import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { IndexerStateService } from './indexer-state.service';
import { IndexerSyncService } from './indexer-sync.service';

const INDEXER_POLL_INTERVAL_MS = 12_000;

@Injectable()
export class IndexerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IndexerService.name);
  private pollTimer: ReturnType<typeof setInterval> | undefined;

  constructor(
    private readonly state: IndexerStateService,
    private readonly sync: IndexerSyncService,
  ) {}

  async onModuleInit(): Promise<void> {
    const cursor = await this.state.ensureCursor();
    this.logger.log(
      `Indexer cursor loaded (chain ${cursor.chainId}, block ${cursor.lastProcessedBlock})`,
    );
    await this.poll();
    this.startPolling();
  }

  onModuleDestroy(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = undefined;
    }
  }

  private startPolling(): void {
    this.pollTimer = setInterval(() => {
      void this.poll();
    }, INDEXER_POLL_INTERVAL_MS);
    this.pollTimer.unref?.();
  }

  private async poll(): Promise<void> {
    try {
      await this.sync.sync();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Indexer poll failed';
      this.logger.warn(message);
    }
  }
}
