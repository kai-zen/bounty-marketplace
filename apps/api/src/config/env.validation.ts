import Joi from 'joi';

/**
 * Environment validated at boot. Names match `apps/api/.env.example`.
 * `PORT` defaults to 3001 (the Next.js app uses 3000).
 * `INDEXER_START_BLOCK` defaults to 0 so a local deploy is included.
 */
export interface EnvironmentVariables {
  MONGODB_URI: string;
  PORT: number;
  /** Base URL for absolute metadata URIs returned to clients and stored on-chain. */
  API_PUBLIC_URL: string;
  RPC_URL: string;
  CHAIN_ID: number;
  FACTORY_ADDRESS: string;
  REGISTRY_ADDRESS: string;
  INDEXER_START_BLOCK: number;
}

const evmAddress = Joi.string()
  .pattern(/^0x[a-fA-F0-9]{40}$/)
  .messages({
    'string.pattern.base':
      '{{#label}} must be a 0x-prefixed 20-byte hex address',
  });

/**
 * Joi options aligned with `@nestjs/config` defaults for Joi schemas:
 * report every failure, and allow unrelated `process.env` keys.
 */
export const envValidationOptions: Joi.ValidationOptions = {
  abortEarly: false,
  allowUnknown: true,
};

export const envValidationSchema = Joi.object<EnvironmentVariables>({
  MONGODB_URI: Joi.string()
    .uri({ scheme: ['mongodb', 'mongodb+srv'] })
    .required(),
  PORT: Joi.number().port().default(3001),
  API_PUBLIC_URL: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .default('http://localhost:3001'),
  RPC_URL: Joi.string()
    .uri({ scheme: ['http', 'https', 'ws', 'wss'] })
    .required(),
  CHAIN_ID: Joi.number().integer().positive().required(),
  FACTORY_ADDRESS: evmAddress.required(),
  REGISTRY_ADDRESS: evmAddress.required(),
  INDEXER_START_BLOCK: Joi.number().integer().min(0).default(0),
});
