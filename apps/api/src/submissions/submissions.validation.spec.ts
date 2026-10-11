import {
  DEFAULT_SUBMISSION_LIMIT,
  DEFAULT_SUBMISSION_PAGE,
  parseListBountySubmissionsQuery,
  parseListSubmitterSubmissionsQuery,
} from './submissions.validation';

describe('submissions query validation', () => {
  it('defaults page and limit for bounty submissions', () => {
    expect(parseListBountySubmissionsQuery({})).toEqual({
      page: DEFAULT_SUBMISSION_PAGE,
      limit: DEFAULT_SUBMISSION_LIMIT,
    });
  });

  it('parses pagination from query strings', () => {
    expect(parseListBountySubmissionsQuery({ page: '2', limit: '10' })).toEqual(
      {
        page: 2,
        limit: 10,
      },
    );
  });

  it('rejects a limit above the maximum', () => {
    expect(() => parseListBountySubmissionsQuery({ limit: '101' })).toThrow(
      /limit/,
    );
  });

  it('parses and lowercases a checksummed submitter', () => {
    expect(
      parseListSubmitterSubmissionsQuery({
        submitter: '0x1234567890AbCdEf1234567890aBcDeF12345678',
        page: '1',
      }),
    ).toEqual({
      page: 1,
      limit: DEFAULT_SUBMISSION_LIMIT,
      submitter: '0x1234567890abcdef1234567890abcdef12345678',
    });
  });

  it('requires a submitter address', () => {
    expect(() => parseListSubmitterSubmissionsQuery({})).toThrow(
      /submitter is required/,
    );
  });

  it('rejects a non-address submitter', () => {
    expect(() =>
      parseListSubmitterSubmissionsQuery({ submitter: 'not-an-address' }),
    ).toThrow(/Invalid submitter address/);
  });
});
