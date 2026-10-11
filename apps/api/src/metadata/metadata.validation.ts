import {
  BountyMetadata,
  METADATA_VERSION,
  SubmissionMetadata,
} from '@bounty/types';
import Joi from 'joi';

export const metadataPayloadSchema = Joi.object<
  BountyMetadata | SubmissionMetadata
>({
  version: Joi.number().valid(METADATA_VERSION).required(),
  title: Joi.string().trim().min(1).max(200).required(),
  description: Joi.string().trim().min(1).max(10_000).required(),
  tags: Joi.array()
    .items(Joi.string().trim().min(1).max(50))
    .max(20)
    .default([]),
  links: Joi.array().items(Joi.string().uri()).max(10).default([]),
});

export function validateMetadataPayload(
  payload: unknown,
): BountyMetadata | SubmissionMetadata {
  const { error, value } = metadataPayloadSchema.validate(payload, {
    abortEarly: false,
    stripUnknown: true,
  });
  if (error) {
    throw error;
  }
  return value;
}
