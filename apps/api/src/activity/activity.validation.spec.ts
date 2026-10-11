import {
  DEFAULT_ACTIVITY_LIMIT,
  parseListActivityQuery,
} from './activity.validation';

describe('activity query validation', () => {
  it('defaults limit when omitted', () => {
    expect(parseListActivityQuery({})).toEqual({
      limit: DEFAULT_ACTIVITY_LIMIT,
    });
  });

  it('parses limit and lowercases a bounty address', () => {
    expect(
      parseListActivityQuery({
        limit: '10',
        bounty: '0x1234567890AbCdEf1234567890aBcDeF12345678',
      }),
    ).toEqual({
      limit: 10,
      bounty: '0x1234567890abcdef1234567890abcdef12345678',
    });
  });

  it('rejects a limit above the maximum', () => {
    expect(() => parseListActivityQuery({ limit: '101' })).toThrow(/limit/);
  });

  it('rejects a non-address bounty', () => {
    expect(() => parseListActivityQuery({ bounty: 'not-an-address' })).toThrow(
      /Invalid bounty address/,
    );
  });
});
