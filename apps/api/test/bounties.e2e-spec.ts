import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import request from 'supertest';
import { App } from 'supertest/types';
import { BountyStatus, PageResult, type BountySummary } from '@bounty/types';
import { Model } from 'mongoose';
import { AppModule } from '../src/app.module';
import { BlockchainService } from '../src/blockchain/blockchain.service';
import { API_GLOBAL_PREFIX, configureApp } from '../src/configure-app';
import { IndexerService } from '../src/indexer/indexer.service';
import { BountyRecord } from '../src/indexer/schemas/bounty.schema';

const seededEscrow = '0x1234567890123456789012345678901234567890';
const seededCreator = '0x0000000000000000000000000000000000000002';

const seededBounty: BountyRecord = {
  escrowAddress: seededEscrow,
  creator: seededCreator,
  title: 'E2E indexed bounty',
  tags: ['e2e'],
  searchText: 'e2e indexed bounty',
  reward: '1000000000000000000',
  deadline: 1_900_000_000,
  metadataURI:
    'http://localhost:3001/api/v1/metadata/00000000-0000-4000-8000-000000000001',
  status: BountyStatus.Open,
  winner: null,
  winningSubmissionId: null,
  submissionRegistry: '0x5fbdb2315678afecb367f032d93f642f64180aa3',
  feeRecipient: '0x0000000000000000000000000000000000000001',
  platformFeeBps: 100,
  createdTxHash:
    '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  createdBlockNumber: 42,
  lastIndexedBlockNumber: 42,
};

describe('Bounties list (e2e)', () => {
  let app: INestApplication<App>;
  let bountyModel: Model<BountyRecord>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(BlockchainService)
      .useValue({
        getBlockNumber: jest.fn().mockResolvedValue(1n),
        onModuleInit: jest.fn(),
      })
      .overrideProvider(IndexerService)
      .useValue({
        onModuleInit: jest.fn(),
        onModuleDestroy: jest.fn(),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    bountyModel = moduleFixture.get<Model<BountyRecord>>(
      getModelToken(BountyRecord.name),
    );
    await bountyModel.deleteMany({}).exec();
  });

  afterEach(async () => {
    await app.close();
  });

  it(`GET /${API_GLOBAL_PREFIX}/bounties returns an empty page`, () => {
    return request(app.getHttpServer())
      .get(`/${API_GLOBAL_PREFIX}/bounties`)
      .expect(200)
      .expect((res) => {
        const body = res.body as PageResult<BountySummary>;
        expect(body).toEqual({
          items: [],
          page: 1,
          limit: 20,
          total: 0,
        });
      });
  });

  it(`GET /${API_GLOBAL_PREFIX}/bounties returns seeded indexed bounties`, async () => {
    await bountyModel.create(seededBounty);

    const res = await request(app.getHttpServer())
      .get(`/${API_GLOBAL_PREFIX}/bounties`)
      .expect(200);

    const body = res.body as PageResult<BountySummary>;
    expect(body.total).toBe(1);
    expect(body.page).toBe(1);
    expect(body.limit).toBe(20);
    expect(body.items).toEqual([
      {
        escrowAddress: seededEscrow,
        creator: seededCreator,
        title: 'E2E indexed bounty',
        reward: '1000000000000000000',
        deadline: 1_900_000_000,
        status: BountyStatus.Open,
        winner: null,
      },
    ]);
  });
});
