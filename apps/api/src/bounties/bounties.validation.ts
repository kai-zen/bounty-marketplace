import { BountyStatus, type Address } from '@bounty/types';
import Joi from 'joi';

export const DEFAULT_BOUNTY_PAGE = 1;
export const DEFAULT_BOUNTY_LIMIT = 20;
export const MAX_BOUNTY_LIMIT = 100;

const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;

const BOUNTY_STATUSES = [
  BountyStatus.Open,
  BountyStatus.Awarded,
  BountyStatus.Claimed,
  BountyStatus.Refunded,
] as const;

export interface ListBountiesQuery {
  page: number;
  limit: number;
  status?: BountyStatus;
  search?: string;
}

export const listBountiesQuerySchema = Joi.object<ListBountiesQuery>({
  page: Joi.number().integer().min(1).default(DEFAULT_BOUNTY_PAGE),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(MAX_BOUNTY_LIMIT)
    .default(DEFAULT_BOUNTY_LIMIT),
  status: Joi.number()
    .integer()
    .valid(...BOUNTY_STATUSES)
    .optional(),
  search: Joi.string().trim().max(200).empty('').optional(),
});

export function parseListBountiesQuery(query: unknown): ListBountiesQuery {
  const result = listBountiesQuerySchema.validate(query, {
    abortEarly: false,
    stripUnknown: true,
    convert: true,
  });
  if (result.error) {
    throw result.error;
  }
  return result.value;
}

export function parseEscrowAddress(value: string): Address {
  if (!ADDRESS_PATTERN.test(value)) {
    throw new Error('Invalid escrow address');
  }
  return value.toLowerCase() as Address;
}
