import { ConfigService } from '@nestjs/config';
import { BlockchainService } from './blockchain.service';

describe('BlockchainService', () => {
  const config = {
    get: (key: string) => {
      const values: Record<string, string | number> = {
        CHAIN_ID: 31337,
        RPC_URL: 'http://127.0.0.1:8545',
        FACTORY_ADDRESS: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
        REGISTRY_ADDRESS: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
      };
      return values[key];
    },
  };

  it('exposes env chain id and contract addresses', () => {
    const service = new BlockchainService(
      config as unknown as ConfigService<
        import('../config/env.validation').EnvironmentVariables,
        true
      >,
    );

    expect(service.chainId).toBe(31337);
    expect(service.factoryAddress).toBe(
      '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
    );
    expect(service.registryAddress).toBe(
      '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    );
    expect(service.publicClient).toBeDefined();
  });
});
