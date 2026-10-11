import { BountyStatus } from '@bounty/types';
import {
  DEFAULT_BOUNTY_LIMIT,
  DEFAULT_BOUNTY_PAGE,
  parseEscrowAddress,
  parseListBountiesQuery,
} from './bounties.validation';

describe('bounties query validation', () => {
  it('defaults page and limit when omitted', () => {
    expect(parseListBountiesQuery({})).toEqual({
      page: DEFAULT_BOUNTY_PAGE,
      limit: DEFAULT_BOUNTY_LIMIT,
    });
  });

  it('parses status and pagination from query strings', () => {
    expect(
      parseListBountiesQuery({ page: '2', limit: '10', status: '1' }),
    ).toEqual({
      page: 2,
      limit: 10,
      status: BountyStatus.Awarded,
    });
  });

  it('rejects an unknown status', () => {
    expect(() => parseListBountiesQuery({ status: '9' })).toThrow(/status/);
  });

  it('normalizes a checksummed escrow address', () => {
    expect(
      parseEscrowAddress('0x1234567890AbCdEf1234567890aBcDeF12345678'),
    ).toBe('0x1234567890abcdef1234567890abcdef12345678');
  });

  it('rejects a non-address path param', () => {
    expect(() => parseEscrowAddress('not-an-address')).toThrow(
      /Invalid escrow address/,
    );
  });
});
