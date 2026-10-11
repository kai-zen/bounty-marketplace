import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { BountyStatus, SubmissionStatus } from '@bounty/types';
import { Model } from 'mongoose';
import type { Abi, Address, Hash } from 'viem';
import {
  bountyEscrowAbi,
  bountyFactoryAbi,
  submissionRegistryAbi,
} from '../contracts/abis';
import { BlockchainService } from '../blockchain/blockchain.service';
import { IndexerStateService } from './indexer-state.service';
import { BountyRecord } from './schemas/bounty.schema';
import { SubmissionRecord } from './schemas/submission.schema';

/** Max inclusive block span per `getContractEvents` batch. */
const INDEXER_MAX_BLOCK_RANGE = 1000;

interface FactoryConfig {
  submissionRegistry: Address;
  feeRecipient: Address;
  platformFeeBps: number;
}

type OrderedIndexerEvent =
  | {
      kind: 'BountyCreated';
      blockNumber: number;
      logIndex: number;
      transactionHash: Hash;
      escrow: Address;
      creator: Address;
      deadline: bigint;
      metadataURI: string;
      amount: bigint;
    }
  | {
      kind: 'WorkSubmitted';
      blockNumber: number;
      logIndex: number;
      submissionId: bigint;
      bountyAddress: Address;
      submitter: Address;
      submissionURI: string;
    }
  | {
      kind: 'WinnerAwarded';
      blockNumber: number;
      logIndex: number;
      escrow: Address;
      winner: Address;
      submissionId: bigint;
    }
  | {
      kind: 'RewardClaimed';
      blockNumber: number;
      logIndex: number;
      escrow: Address;
      winner: Address;
      winnerAmount: bigint;
    }
  | {
      kind: 'BountyRefunded';
      blockNumber: number;
      logIndex: number;
      escrow: Address;
      creator: Address;
      amount: bigint;
    }
  | {
      kind: 'SubmissionSelected';
      blockNumber: number;
      logIndex: number;
      submissionId: bigint;
      bountyAddress: Address;
      submitter: Address;
    };

type RpcLogBase = {
  address?: Address;
  blockNumber: bigint | null;
  logIndex: number | null;
  transactionHash?: Hash | null;
};

type BountyCreatedRpcLog = RpcLogBase & {
  args: {
    escrow?: Address;
    creator?: Address;
    deadline?: bigint;
    metadataURI?: string;
    amount?: bigint;
  };
};

type WorkSubmittedRpcLog = RpcLogBase & {
  args: {
    submissionId?: bigint;
    bountyAddress?: Address;
    submitter?: Address;
    submissionURI?: string;
  };
};

type WinnerAwardedRpcLog = RpcLogBase & {
  args: {
    winner?: Address;
    submissionId?: bigint;
  };
};

type RewardClaimedRpcLog = RpcLogBase & {
  args: {
    winner?: Address;
    winnerAmount?: bigint;
  };
};

type BountyRefundedRpcLog = RpcLogBase & {
  args: {
    creator?: Address;
    amount?: bigint;
  };
};

type SubmissionSelectedRpcLog = RpcLogBase & {
  args: {
    submissionId?: bigint;
    bountyAddress?: Address;
    submitter?: Address;
  };
};

@Injectable()
export class IndexerSyncService {
  private readonly logger = new Logger(IndexerSyncService.name);
  private factoryConfig: FactoryConfig | undefined;

  constructor(
    private readonly blockchain: BlockchainService,
    private readonly state: IndexerStateService,
    @InjectModel(BountyRecord.name)
    private readonly bountyModel: Model<BountyRecord>,
    @InjectModel(SubmissionRecord.name)
    private readonly submissionModel: Model<SubmissionRecord>,
  ) {}

  /** Catch up from cursor to chain head in bounded block ranges. */
  async sync(): Promise<void> {
    const head = await this.blockchain.getBlockNumber();
    let { lastProcessedBlock } = await this.state.getCursor();

    while (BigInt(lastProcessedBlock) < head) {
      const fromBlock = lastProcessedBlock + 1;
      const toBlock = Math.min(
        Number(head),
        fromBlock + INDEXER_MAX_BLOCK_RANGE - 1,
      );
      await this.processBlockRange(fromBlock, toBlock);
      await this.state.setLastProcessedBlock(toBlock);
      lastProcessedBlock = toBlock;
    }
  }

  private async processBlockRange(
    fromBlock: number,
    toBlock: number,
  ): Promise<void> {
    const events = await this.fetchOrderedEvents(fromBlock, toBlock);
    for (const event of events) {
      await this.handleEvent(event);
    }
  }

  private async fetchOrderedEvents(
    fromBlock: number,
    toBlock: number,
  ): Promise<OrderedIndexerEvent[]> {
    const client = this.blockchain.publicClient;
    const from = BigInt(fromBlock);
    const to = BigInt(toBlock);

    const [
      bountyLogs,
      workSubmittedLogs,
      submissionSelectedLogs,
      winnerAwardedLogs,
      rewardClaimedLogs,
      bountyRefundedLogs,
    ] = await Promise.all([
      client.getContractEvents({
        address: this.blockchain.factoryAddress,
        abi: bountyFactoryAbi as Abi,
        eventName: 'BountyCreated',
        fromBlock: from,
        toBlock: to,
      }),
      client.getContractEvents({
        address: this.blockchain.registryAddress,
        abi: submissionRegistryAbi as Abi,
        eventName: 'WorkSubmitted',
        fromBlock: from,
        toBlock: to,
      }),
      client.getContractEvents({
        address: this.blockchain.registryAddress,
        abi: submissionRegistryAbi as Abi,
        eventName: 'SubmissionSelected',
        fromBlock: from,
        toBlock: to,
      }),
      // Escrow clones share one ABI; omit `address` so award/claim/refund
      // logs from every factory-created escrow are included in the range.
      client.getContractEvents({
        abi: bountyEscrowAbi as Abi,
        eventName: 'WinnerAwarded',
        fromBlock: from,
        toBlock: to,
      }),
      client.getContractEvents({
        abi: bountyEscrowAbi as Abi,
        eventName: 'RewardClaimed',
        fromBlock: from,
        toBlock: to,
      }),
      client.getContractEvents({
        abi: bountyEscrowAbi as Abi,
        eventName: 'BountyRefunded',
        fromBlock: from,
        toBlock: to,
      }),
    ]);

    const events: OrderedIndexerEvent[] = [];

    for (const log of bountyLogs as BountyCreatedRpcLog[]) {
      const { escrow, creator, deadline, metadataURI, amount } = log.args;
      if (
        log.blockNumber == null ||
        log.logIndex == null ||
        !log.transactionHash ||
        escrow == null ||
        creator == null ||
        deadline == null ||
        metadataURI == null ||
        amount == null
      ) {
        continue;
      }
      events.push({
        kind: 'BountyCreated',
        blockNumber: Number(log.blockNumber),
        logIndex: log.logIndex,
        transactionHash: log.transactionHash,
        escrow,
        creator,
        deadline,
        metadataURI,
        amount,
      });
    }

    for (const log of workSubmittedLogs as WorkSubmittedRpcLog[]) {
      const { submissionId, bountyAddress, submitter, submissionURI } =
        log.args;
      if (
        log.blockNumber == null ||
        log.logIndex == null ||
        submissionId == null ||
        bountyAddress == null ||
        submitter == null ||
        submissionURI == null
      ) {
        continue;
      }
      events.push({
        kind: 'WorkSubmitted',
        blockNumber: Number(log.blockNumber),
        logIndex: log.logIndex,
        submissionId,
        bountyAddress,
        submitter,
        submissionURI,
      });
    }

    for (const log of winnerAwardedLogs as WinnerAwardedRpcLog[]) {
      const { winner, submissionId } = log.args;
      if (
        log.address == null ||
        log.blockNumber == null ||
        log.logIndex == null ||
        winner == null ||
        submissionId == null
      ) {
        continue;
      }
      events.push({
        kind: 'WinnerAwarded',
        blockNumber: Number(log.blockNumber),
        logIndex: log.logIndex,
        escrow: log.address,
        winner,
        submissionId,
      });
    }

    for (const log of rewardClaimedLogs as RewardClaimedRpcLog[]) {
      const { winner, winnerAmount } = log.args;
      if (
        log.address == null ||
        log.blockNumber == null ||
        log.logIndex == null ||
        winner == null ||
        winnerAmount == null
      ) {
        continue;
      }
      events.push({
        kind: 'RewardClaimed',
        blockNumber: Number(log.blockNumber),
        logIndex: log.logIndex,
        escrow: log.address,
        winner,
        winnerAmount,
      });
    }

    for (const log of bountyRefundedLogs as BountyRefundedRpcLog[]) {
      const { creator, amount } = log.args;
      if (
        log.address == null ||
        log.blockNumber == null ||
        log.logIndex == null ||
        creator == null ||
        amount == null
      ) {
        continue;
      }
      events.push({
        kind: 'BountyRefunded',
        blockNumber: Number(log.blockNumber),
        logIndex: log.logIndex,
        escrow: log.address,
        creator,
        amount,
      });
    }

    for (const log of submissionSelectedLogs as SubmissionSelectedRpcLog[]) {
      const { submissionId, bountyAddress, submitter } = log.args;
      if (
        log.blockNumber == null ||
        log.logIndex == null ||
        submissionId == null ||
        bountyAddress == null ||
        submitter == null
      ) {
        continue;
      }
      events.push({
        kind: 'SubmissionSelected',
        blockNumber: Number(log.blockNumber),
        logIndex: log.logIndex,
        submissionId,
        bountyAddress,
        submitter,
      });
    }

    events.sort((a, b) => {
      if (a.blockNumber !== b.blockNumber) {
        return a.blockNumber - b.blockNumber;
      }
      return a.logIndex - b.logIndex;
    });

    return events;
  }

  private async handleEvent(event: OrderedIndexerEvent): Promise<void> {
    switch (event.kind) {
      case 'BountyCreated':
        await this.handleBountyCreated(event);
        return;
      case 'WorkSubmitted':
        await this.handleWorkSubmitted(event);
        return;
      case 'WinnerAwarded':
        await this.handleWinnerAwarded(event);
        return;
      case 'RewardClaimed':
        await this.handleRewardClaimed(event);
        return;
      case 'BountyRefunded':
        await this.handleBountyRefunded(event);
        return;
      case 'SubmissionSelected':
        await this.handleSubmissionSelected(event);
    }
  }

  private async handleBountyCreated(
    event: Extract<OrderedIndexerEvent, { kind: 'BountyCreated' }>,
  ): Promise<void> {
    const factory = await this.loadFactoryConfig();
    const escrowAddress = event.escrow.toLowerCase();
    const deadline = Number(event.deadline);

    await this.bountyModel.updateOne(
      { escrowAddress },
      {
        $set: {
          escrowAddress,
          creator: event.creator.toLowerCase(),
          reward: event.amount.toString(),
          deadline,
          metadataURI: event.metadataURI,
          status: BountyStatus.Open,
          winner: null,
          winningSubmissionId: null,
          submissionRegistry: factory.submissionRegistry.toLowerCase(),
          feeRecipient: factory.feeRecipient.toLowerCase(),
          platformFeeBps: factory.platformFeeBps,
          createdTxHash: event.transactionHash,
          createdBlockNumber: event.blockNumber,
          lastIndexedBlockNumber: event.blockNumber,
        },
      },
      { upsert: true },
    );

    this.logger.log(
      `Indexed BountyCreated escrow=${escrowAddress} block=${event.blockNumber}`,
    );
  }

  private async handleWorkSubmitted(
    event: Extract<OrderedIndexerEvent, { kind: 'WorkSubmitted' }>,
  ): Promise<void> {
    const submissionId = Number(event.submissionId);

    await this.submissionModel.updateOne(
      { submissionId },
      {
        $set: {
          submissionId,
          bountyAddress: event.bountyAddress.toLowerCase(),
          submitter: event.submitter.toLowerCase(),
          submissionURI: event.submissionURI,
          status: SubmissionStatus.Pending,
        },
      },
      { upsert: true },
    );

    this.logger.log(
      `Indexed WorkSubmitted id=${submissionId} block=${event.blockNumber}`,
    );
  }

  private async handleWinnerAwarded(
    event: Extract<OrderedIndexerEvent, { kind: 'WinnerAwarded' }>,
  ): Promise<void> {
    const escrowAddress = event.escrow.toLowerCase();
    const result = await this.bountyModel.updateOne(
      { escrowAddress },
      {
        $set: {
          status: BountyStatus.Awarded,
          winner: event.winner.toLowerCase(),
          winningSubmissionId: Number(event.submissionId),
          lastIndexedBlockNumber: event.blockNumber,
        },
      },
    );

    if (result.matchedCount === 0) {
      this.logger.warn(
        `WinnerAwarded for unknown escrow=${escrowAddress} block=${event.blockNumber}`,
      );
      return;
    }

    this.logger.log(
      `Indexed WinnerAwarded escrow=${escrowAddress} block=${event.blockNumber}`,
    );
  }

  private async handleRewardClaimed(
    event: Extract<OrderedIndexerEvent, { kind: 'RewardClaimed' }>,
  ): Promise<void> {
    const escrowAddress = event.escrow.toLowerCase();
    const result = await this.bountyModel.updateOne(
      { escrowAddress },
      {
        $set: {
          status: BountyStatus.Claimed,
          lastIndexedBlockNumber: event.blockNumber,
        },
      },
    );

    if (result.matchedCount === 0) {
      this.logger.warn(
        `RewardClaimed for unknown escrow=${escrowAddress} block=${event.blockNumber}`,
      );
      return;
    }

    this.logger.log(
      `Indexed RewardClaimed escrow=${escrowAddress} block=${event.blockNumber}`,
    );
  }

  private async handleBountyRefunded(
    event: Extract<OrderedIndexerEvent, { kind: 'BountyRefunded' }>,
  ): Promise<void> {
    const escrowAddress = event.escrow.toLowerCase();
    const result = await this.bountyModel.updateOne(
      { escrowAddress },
      {
        $set: {
          status: BountyStatus.Refunded,
          lastIndexedBlockNumber: event.blockNumber,
        },
      },
    );

    if (result.matchedCount === 0) {
      this.logger.warn(
        `BountyRefunded for unknown escrow=${escrowAddress} block=${event.blockNumber}`,
      );
      return;
    }

    this.logger.log(
      `Indexed BountyRefunded escrow=${escrowAddress} block=${event.blockNumber}`,
    );
  }

  private async handleSubmissionSelected(
    event: Extract<OrderedIndexerEvent, { kind: 'SubmissionSelected' }>,
  ): Promise<void> {
    const submissionId = Number(event.submissionId);
    const result = await this.submissionModel.updateOne(
      { submissionId },
      {
        $set: {
          status: SubmissionStatus.Selected,
        },
      },
    );

    if (result.matchedCount === 0) {
      this.logger.warn(
        `SubmissionSelected for unknown id=${submissionId} block=${event.blockNumber}`,
      );
      return;
    }

    this.logger.log(
      `Indexed SubmissionSelected id=${submissionId} block=${event.blockNumber}`,
    );
  }

  private async loadFactoryConfig(): Promise<FactoryConfig> {
    if (this.factoryConfig) {
      return this.factoryConfig;
    }

    const client = this.blockchain.publicClient;
    const address = this.blockchain.factoryAddress;

    const [submissionRegistry, feeRecipient, platformFeeBps] =
      await Promise.all([
        client.readContract({
          address,
          abi: bountyFactoryAbi as Abi,
          functionName: 'submissionRegistry',
        }),
        client.readContract({
          address,
          abi: bountyFactoryAbi as Abi,
          functionName: 'feeRecipient',
        }),
        client.readContract({
          address,
          abi: bountyFactoryAbi as Abi,
          functionName: 'platformFeeBps',
        }),
      ]);

    const config: FactoryConfig = {
      submissionRegistry: submissionRegistry as Address,
      feeRecipient: feeRecipient as Address,
      platformFeeBps: Number(platformFeeBps),
    };
    this.factoryConfig = config;
    return config;
  }
}
