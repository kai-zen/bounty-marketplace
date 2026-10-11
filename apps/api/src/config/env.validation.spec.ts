import { ConfigModule } from '@nestjs/config';
import { envValidationOptions, envValidationSchema } from './env.validation';

const validEnv = {
  MONGODB_URI: 'mongodb://127.0.0.1:27017/bounty-marketplace',
  RPC_URL: 'http://127.0.0.1:8545',
  CHAIN_ID: '31337',
  FACTORY_ADDRESS: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
  REGISTRY_ADDRESS: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
};

describe('envValidationSchema', () => {
  it('names Mongo, RPC, chain id, and contract addresses when they are missing', () => {
    const { error } = envValidationSchema.validate(
      { PATH: '/usr/bin' },
      envValidationOptions,
    );

    expect(error).toBeDefined();
    const message = error?.message ?? '';
    expect(message).toContain('"MONGODB_URI" is required');
    expect(message).toContain('"RPC_URL" is required');
    expect(message).toContain('"CHAIN_ID" is required');
    expect(message).toContain('"FACTORY_ADDRESS" is required');
    expect(message).toContain('"REGISTRY_ADDRESS" is required');
  });

  it('accepts the documented local env and applies defaults', () => {
    const result = envValidationSchema.validate(validEnv, envValidationOptions);
    if (result.error) {
      throw new Error(result.error.message);
    }

    expect(result.value).toMatchObject({
      MONGODB_URI: validEnv.MONGODB_URI,
      RPC_URL: validEnv.RPC_URL,
      PORT: 3001,
      CHAIN_ID: 31337,
      FACTORY_ADDRESS: validEnv.FACTORY_ADDRESS,
      REGISTRY_ADDRESS: validEnv.REGISTRY_ADDRESS,
      INDEXER_START_BLOCK: 0,
    });
  });

  it('rejects an invalid Mongo URI, RPC URL, and contract address', () => {
    const { error } = envValidationSchema.validate(
      {
        ...validEnv,
        MONGODB_URI: 'postgres://127.0.0.1/bounty',
        RPC_URL: 'not-a-url',
        FACTORY_ADDRESS: '0x123',
      },
      envValidationOptions,
    );

    const message = error?.message ?? '';
    expect(message).toContain('MONGODB_URI');
    expect(message).toContain('RPC_URL');
    expect(message).toContain('FACTORY_ADDRESS');
  });
});

describe('ConfigModule env validation', () => {
  const requiredKeys = [
    'MONGODB_URI',
    'RPC_URL',
    'CHAIN_ID',
    'FACTORY_ADDRESS',
    'REGISTRY_ADDRESS',
  ] as const;

  const previous: Partial<Record<(typeof requiredKeys)[number], string>> = {};

  beforeEach(() => {
    for (const key of requiredKeys) {
      previous[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of requiredKeys) {
      if (previous[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = previous[key];
      }
    }
  });

  it('fails fast when required variables are missing', async () => {
    await expect(
      ConfigModule.forRoot({
        ignoreEnvFile: true,
        validationSchema: envValidationSchema,
        validationOptions: envValidationOptions,
      }),
    ).rejects.toThrow(
      /MONGODB_URI[\s\S]*RPC_URL[\s\S]*FACTORY_ADDRESS[\s\S]*REGISTRY_ADDRESS/,
    );
  });

  it('loads when the documented local env is present', async () => {
    Object.assign(process.env, validEnv);

    await expect(
      ConfigModule.forRoot({
        ignoreEnvFile: true,
        validationSchema: envValidationSchema,
        validationOptions: envValidationOptions,
      }),
    ).resolves.toEqual(expect.objectContaining({ module: ConfigModule }));
  });
});
