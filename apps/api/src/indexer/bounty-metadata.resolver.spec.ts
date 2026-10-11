import { METADATA_VERSION } from '@bounty/types';
import { MetadataService } from '../metadata/metadata.service';
import {
  BountyMetadataResolver,
  EMPTY_BOUNTY_METADATA,
} from './bounty-metadata.resolver';

const bountyId = '11111111-1111-4111-8111-111111111111';
const bountyUri = `http://localhost:3001/api/v1/metadata/${bountyId}`;

const bountyPayload = {
  version: METADATA_VERSION,
  title: 'Fix login bug',
  description: 'Session expires too soon',
  tags: ['Auth'],
  links: [] as string[],
};

describe('BountyMetadataResolver', () => {
  const fetchSpy = jest.spyOn(globalThis, 'fetch');

  afterEach(() => {
    fetchSpy.mockReset();
  });

  afterAll(() => {
    fetchSpy.mockRestore();
  });

  function createResolver(
    record: {
      kind: 'bounty' | 'submission';
      payload: typeof bountyPayload;
    } | null,
  ) {
    const metadata = {
      findRecord: jest.fn().mockResolvedValue(record),
    };
    const resolver = new BountyMetadataResolver(
      metadata as unknown as MetadataService,
    );
    return { resolver, metadata };
  }

  it('stores title and search text from our metadata document', async () => {
    const { resolver, metadata } = createResolver({
      kind: 'bounty',
      payload: bountyPayload,
    });

    await expect(resolver.resolve(bountyUri)).resolves.toEqual({
      title: 'Fix login bug',
      tags: ['Auth'],
      searchText: 'fix login bug\nsession expires too soon\nauth',
    });
    expect(metadata.findRecord).toHaveBeenCalledWith(bountyId);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns empty fields when the metadata document is missing', async () => {
    const { resolver } = createResolver(null);

    await expect(resolver.resolve(bountyUri)).resolves.toEqual(
      EMPTY_BOUNTY_METADATA,
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns empty fields when the document is submission metadata', async () => {
    const { resolver } = createResolver({
      kind: 'submission',
      payload: bountyPayload,
    });

    await expect(resolver.resolve(bountyUri)).resolves.toEqual(
      EMPTY_BOUNTY_METADATA,
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('fetches an external http metadata URI', async () => {
    const { resolver, metadata } = createResolver(null);
    fetchSpy.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(bountyPayload),
    } as Response);

    await expect(
      resolver.resolve('https://example.com/bounty.json'),
    ).resolves.toMatchObject({
      title: 'Fix login bug',
      tags: ['Auth'],
    });
    expect(metadata.findRecord).not.toHaveBeenCalled();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('returns empty fields when metadata cannot be loaded', async () => {
    const { resolver } = createResolver(null);
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({}),
    } as Response);

    await expect(
      resolver.resolve('https://example.com/missing'),
    ).resolves.toEqual(EMPTY_BOUNTY_METADATA);
    await expect(resolver.resolve('ipfs://bafy')).resolves.toEqual(
      EMPTY_BOUNTY_METADATA,
    );
  });
});
