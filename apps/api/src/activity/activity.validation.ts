import type { Address } from '@bounty/types';
import Joi from 'joi';

export const DEFAULT_ACTIVITY_LIMIT = 50;
export const MAX_ACTIVITY_LIMIT = 100;

const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;

export interface ListActivityQuery {
  limit: number;
  bounty?: Address;
}

export const listActivityQuerySchema = Joi.object<ListActivityQuery>({
  limit: Joi.number()
    .integer()
    .min(1)
    .max(MAX_ACTIVITY_LIMIT)
    .default(DEFAULT_ACTIVITY_LIMIT),
  bounty: Joi.string()
    .pattern(ADDRESS_PATTERN)
    .optional()
    .custom((value: string) => value.toLowerCase())
    .messages({
      'string.pattern.base': 'Invalid bounty address',
      'string.empty': 'Invalid bounty address',
    }),
});

export function parseListActivityQuery(query: unknown): ListActivityQuery {
  const result = listActivityQuerySchema.validate(query, {
    abortEarly: false,
    stripUnknown: true,
    convert: true,
  });
  if (result.error) {
    throw result.error;
  }
  return result.value;
}
