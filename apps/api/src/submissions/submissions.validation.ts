import type { Address } from '@bounty/types';
import Joi from 'joi';

export const DEFAULT_SUBMISSION_PAGE = 1;
export const DEFAULT_SUBMISSION_LIMIT = 20;
export const MAX_SUBMISSION_LIMIT = 100;

const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;

export interface ListBountySubmissionsQuery {
  page: number;
  limit: number;
}

export interface ListSubmitterSubmissionsQuery {
  page: number;
  limit: number;
  submitter: Address;
}

const pageField = Joi.number()
  .integer()
  .min(1)
  .default(DEFAULT_SUBMISSION_PAGE);
const limitField = Joi.number()
  .integer()
  .min(1)
  .max(MAX_SUBMISSION_LIMIT)
  .default(DEFAULT_SUBMISSION_LIMIT);

export const listBountySubmissionsQuerySchema =
  Joi.object<ListBountySubmissionsQuery>({
    page: pageField,
    limit: limitField,
  });

export const listSubmitterSubmissionsQuerySchema =
  Joi.object<ListSubmitterSubmissionsQuery>({
    page: pageField,
    limit: limitField,
    submitter: Joi.string()
      .pattern(ADDRESS_PATTERN)
      .required()
      .custom((value: string) => value.toLowerCase())
      .messages({
        'string.pattern.base': 'Invalid submitter address',
        'string.empty': 'Invalid submitter address',
        'any.required': 'submitter is required',
      }),
  });

export function parseListBountySubmissionsQuery(
  query: unknown,
): ListBountySubmissionsQuery {
  return parseQuery(listBountySubmissionsQuerySchema, query);
}

export function parseListSubmitterSubmissionsQuery(
  query: unknown,
): ListSubmitterSubmissionsQuery {
  return parseQuery(listSubmitterSubmissionsQuerySchema, query);
}

function parseQuery<T>(schema: Joi.ObjectSchema<T>, query: unknown): T {
  const result = schema.validate(query, {
    abortEarly: false,
    stripUnknown: true,
    convert: true,
  });
  if (result.error) {
    throw result.error;
  }
  return result.value;
}
