import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { BountyStatus, SubmissionStatus } from '@bounty/types';
import { Model } from 'mongoose';
import type { Abi, Address, Hash } from 'viem';
import { bountyFactoryAbi, submissionRegistryAbi } from '../contracts/abis';
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
    };

type BountyCreatedRpcLog = {
  blockNumber: bigint | null;
  logIndex: number | null;
  transactionHash: Hash | null;
  args: {
    escrow?: Address;
    creator?: Address;
    deadline?: bigint;
    metadataURI?: string;
    amount?: bigint;
  };
};

type WorkSubmittedRpcLog = {
  blockNumber: bigint | null;
  logIndex: number | null;
  args: {
    submissionId?: bigint;
    bountyAddress?: Address;
    submitter?: Address;
    submissionURI?: string;
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
    const client = this.blockchain.publicClient;
    const from = BigInt(fromBlock);
    const to = BigInt(toBlock);

    const [bountyLogs, submissionLogs] = await Promise.all([
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

    for (const log of submissionLogs as WorkSubmittedRpcLog[]) {
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

    events.sort((a, b) => {
      if (a.blockNumber !== b.blockNumber) {
        return a.blockNumber - b.blockNumber;
      }
      return a.logIndex - b.logIndex;
    });

    for (const event of events) {
      if (event.kind === 'BountyCreated') {
        await this.handleBountyCreated(event);
      } else {
        await this.handleWorkSubmitted(event);
      }
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
