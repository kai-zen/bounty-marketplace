import { METADATA_VERSION } from '@bounty/types';
import { validateMetadataPayload } from './metadata.validation';

describe('validateMetadataPayload', () => {
  const valid = {
    version: METADATA_VERSION,
    title: 'Fix login bug',
    description: 'Reproduce and patch the OAuth redirect loop.',
    tags: ['bug', 'auth'],
    links: ['https://github.com/example/repo/issues/1'],
  };

  it('accepts a valid bounty-shaped document', () => {
    expect(validateMetadataPayload(valid)).toEqual(valid);
  });

  it('defaults tags and links when omitted', () => {
    const { tags, links, ...rest } = valid;
    void tags;
    void links;
    expect(validateMetadataPayload(rest)).toMatchObject({
      ...rest,
      tags: [],
      links: [],
    });
  });

  it('rejects an unsupported metadata version', () => {
    expect(() => validateMetadataPayload({ ...valid, version: 99 })).toThrow(
      /version/,
    );
  });
});
