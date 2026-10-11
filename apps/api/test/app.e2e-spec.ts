import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { BlockchainService } from '../src/blockchain/blockchain.service';
import { API_GLOBAL_PREFIX, configureApp } from '../src/configure-app';

describe('Health (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(BlockchainService)
      .useValue({
        getBlockNumber: jest.fn().mockResolvedValue(1n),
        onModuleInit: jest.fn(),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it(`/${API_GLOBAL_PREFIX}/health (GET)`, () => {
    return request(app.getHttpServer())
      .get(`/${API_GLOBAL_PREFIX}/health`)
      .expect(200)
      .expect((res) => {
        expect(res.body).toMatchObject({
          status: 'ok',
          details: {
            mongodb: { status: 'up' },
            blockchain: { status: 'up' },
          },
        });
      });
  });

  it('allows CORS from the Next.js dev origin', () => {
    return request(app.getHttpServer())
      .get(`/${API_GLOBAL_PREFIX}/health`)
      .set('Origin', 'http://localhost:3000')
      .expect(200)
      .expect('Access-Control-Allow-Origin', 'http://localhost:3000');
  });
});
