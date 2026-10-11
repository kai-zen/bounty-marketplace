import { BadRequestException } from '@nestjs/common';
import { SubmissionStatus } from '@bounty/types';
import { Model } from 'mongoose';
import { SubmissionRecord } from '../indexer/schemas/submission.schema';
import { SubmissionsService } from './submissions.service';

const bountyAddress = '0x1234567890123456789012345678901234567890';
const submitter = '0x0000000000000000000000000000000000000003';

const indexedSubmission: SubmissionRecord = {
  submissionId: 0,
  bountyAddress,
  submitter,
  title: '',
  submissionURI: 'http://localhost:3001/api/v1/metadata/sub-1',
  status: SubmissionStatus.Pending,
};

describe('SubmissionsService', () => {
  function createService(options: {
    list?: SubmissionRecord[];
    total?: number;
  }) {
    const findQuery = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(options.list ?? []),
    };

    const submissionModel = {
      find: jest.fn().mockReturnValue(findQuery),
      countDocuments: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(options.total ?? 0),
      }),
    };

    const service = new SubmissionsService(
      submissionModel as unknown as Model<SubmissionRecord>,
    );

    return { service, submissionModel, findQuery };
  }

  it('lists indexed submissions for a bounty in submission order', async () => {
    const selected = {
      ...indexedSubmission,
      submissionId: 1,
      status: SubmissionStatus.Selected,
      title: 'Fix the indexer cursor',
    };
    const { service, submissionModel, findQuery } = createService({
      list: [indexedSubmission, selected],
      total: 2,
    });

    const result = await service.listForBounty(bountyAddress, {
      page: '1',
      limit: '20',
    });

    expect(submissionModel.find).toHaveBeenCalledWith({ bountyAddress });
    expect(findQuery.sort).toHaveBeenCalledWith({
      submissionId: 1,
      _id: 1,
    });
    expect(findQuery.skip).toHaveBeenCalledWith(0);
    expect(findQuery.limit).toHaveBeenCalledWith(20);
    expect(result).toEqual({
      items: [
        {
          submissionId: 0,
          bountyAddress,
          submitter,
          title: '',
          submissionURI: indexedSubmission.submissionURI,
          status: SubmissionStatus.Pending,
        },
        {
          submissionId: 1,
          bountyAddress,
          submitter,
          title: 'Fix the indexer cursor',
          submissionURI: indexedSubmission.submissionURI,
          status: SubmissionStatus.Selected,
        },
      ],
      page: 1,
      limit: 20,
      total: 2,
    });
  });

  it('lists a submitter submissions newest first for the dashboard', async () => {
    const { service, submissionModel, findQuery } = createService({
      list: [indexedSubmission],
      total: 1,
    });

    const result = await service.listBySubmitter({
      submitter: '0x0000000000000000000000000000000000000003',
      page: '2',
      limit: '10',
    });

    expect(submissionModel.find).toHaveBeenCalledWith({ submitter });
    expect(findQuery.sort).toHaveBeenCalledWith({
      submissionId: -1,
      _id: -1,
    });
    expect(findQuery.skip).toHaveBeenCalledWith(10);
    expect(findQuery.limit).toHaveBeenCalledWith(10);
    expect(result).toEqual({
      items: [
        {
          submissionId: 0,
          bountyAddress,
          submitter,
          title: '',
          submissionURI: indexedSubmission.submissionURI,
          status: SubmissionStatus.Pending,
        },
      ],
      page: 2,
      limit: 10,
      total: 1,
    });
  });

  it('rejects an invalid escrow and a missing submitter', async () => {
    const { service, submissionModel } = createService({});

    await expect(
      service.listForBounty('not-an-address', {}),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.listBySubmitter({})).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(submissionModel.find).not.toHaveBeenCalled();
  });
});
