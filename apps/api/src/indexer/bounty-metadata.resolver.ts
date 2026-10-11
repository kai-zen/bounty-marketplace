import { Injectable, Logger } from '@nestjs/common';
import { BountyMetadata } from '@bounty/types';
import { MetadataService } from '../metadata/metadata.service';
import { validateMetadataPayload } from '../metadata/metadata.validation';

const METADATA_ID =
  /\/metadata\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

export interface DenormalizedBountyMetadata {
  title: string;
  tags: string[];
  searchText: string;
}

export const EMPTY_BOUNTY_METADATA: DenormalizedBountyMetadata = {
  title: '',
  tags: [],
  searchText: '',
};

/** Loads bounty JSON from our metadata collection or an http(s) URI. */
@Injectable()
export class BountyMetadataResolver {
  private readonly logger = new Logger(BountyMetadataResolver.name);

  constructor(private readonly metadata: MetadataService) {}

  async resolve(uri: string): Promise<DenormalizedBountyMetadata> {
    try {
      const payload = await this.loadPayload(uri);
      if (!payload) {
        return EMPTY_BOUNTY_METADATA;
      }
      const validated = validateMetadataPayload(payload);
      return {
        title: validated.title,
        tags: validated.tags,
        searchText: buildBountySearchText(validated),
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'metadata resolve failed';
      this.logger.warn(`Failed to resolve bounty metadata ${uri}: ${message}`);
      return EMPTY_BOUNTY_METADATA;
    }
  }

  private async loadPayload(uri: string): Promise<unknown> {
    const id = metadataIdFromUri(uri);
    if (id) {
      const record = await this.metadata.findRecord(id);
      if (!record) {
        this.logger.warn(`Bounty metadata not found: ${uri}`);
        return null;
      }
      if (record.kind !== 'bounty') {
        this.logger.warn(`Metadata ${id} is ${record.kind}, not bounty`);
        return null;
      }
      return record.payload;
    }
    return this.fetchExternal(uri);
  }

  private async fetchExternal(uri: string): Promise<unknown> {
    let url: URL;
    try {
      url = new URL(uri);
    } catch {
      throw new Error('Invalid metadata URI');
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error('Unsupported metadata URI');
    }

    const response = await fetch(url, { signal: AbortSignal.timeout(5_000) });
    if (!response.ok) {
      throw new Error(`Metadata request failed: ${response.status}`);
    }
    return response.json() as Promise<unknown>;
  }
}

export function buildBountySearchText(
  payload: Pick<BountyMetadata, 'title' | 'description' | 'tags'>,
): string {
  return [payload.title, payload.description, ...payload.tags]
    .join('\n')
    .toLowerCase();
}

function metadataIdFromUri(uri: string): string | null {
  let url: URL;
  try {
    url = new URL(uri);
  } catch {
    return null;
  }
  return url.pathname.match(METADATA_ID)?.[1] ?? null;
}
