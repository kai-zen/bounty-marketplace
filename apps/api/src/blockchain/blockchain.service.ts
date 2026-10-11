import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createPublicClient,
  http,
  type Address,
  type Chain,
  type PublicClient,
} from 'viem';
import { EnvironmentVariables } from '../config/env.validation';

function chainFromEnv(chainId: number, rpcUrl: string): Chain {
  return {
    id: chainId,
    name: `chain-${chainId}`,
    nativeCurrency: { decimals: 18, name: 'Ether', symbol: 'ETH' },
    rpcUrls: { default: { http: [rpcUrl] } },
  };
}

@Injectable()
export class BlockchainService implements OnModuleInit {
  private readonly logger = new Logger(BlockchainService.name);

  readonly publicClient: PublicClient;
  readonly chainId: number;
  readonly factoryAddress: Address;
  readonly registryAddress: Address;

  constructor(config: ConfigService<EnvironmentVariables, true>) {
    this.chainId = config.get('CHAIN_ID', { infer: true });
    const rpcUrl = config.get('RPC_URL', { infer: true });
    this.factoryAddress = config.get('FACTORY_ADDRESS', {
      infer: true,
    });
    this.registryAddress = config.get('REGISTRY_ADDRESS', {
      infer: true,
    });

    this.publicClient = createPublicClient({
      chain: chainFromEnv(this.chainId, rpcUrl),
      transport: http(rpcUrl),
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      const blockNumber = await this.getBlockNumber();
      this.logger.log(
        `RPC connected (chain ${this.chainId}, block ${blockNumber})`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'RPC getBlockNumber failed';
      this.logger.warn(`RPC not reachable at startup: ${message}`);
    }
  }

  getBlockNumber(): Promise<bigint> {
    return this.publicClient.getBlockNumber();
  }
}
