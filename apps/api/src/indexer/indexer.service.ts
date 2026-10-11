import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { BlockchainService } from '../blockchain/blockchain.service';
import { IndexerStateService } from './indexer-state.service';

/** Polling interval until event handlers land in Step 22. */
const INDEXER_POLL_INTERVAL_MS = 12_000;

@Injectable()
export class IndexerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IndexerService.name);
  private pollTimer: ReturnType<typeof setInterval> | undefined;

  constructor(
    private readonly state: IndexerStateService,
    private readonly blockchain: BlockchainService,
  ) {}

  async onModuleInit(): Promise<void> {
    const cursor = await this.state.ensureCursor();
    this.logger.log(
      `Indexer cursor loaded (chain ${cursor.chainId}, block ${cursor.lastProcessedBlock})`,
    );
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

  /** Placeholder sync tick; Step 22 adds log handlers and cursor advancement. */
  private async poll(): Promise<void> {
    try {
      const head = await this.blockchain.getBlockNumber();
      const { lastProcessedBlock } = await this.state.getCursor();
      if (head > BigInt(lastProcessedBlock)) {
        this.logger.debug(
          `Indexer poll: chain head ${head}, cursor ${lastProcessedBlock} (event handlers not wired yet)`,
        );
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Indexer poll failed';
      this.logger.warn(message);
    }
  }
}
