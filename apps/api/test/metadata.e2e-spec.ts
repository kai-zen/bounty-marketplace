import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { BountyMetadata, METADATA_VERSION } from '@bounty/types';
import { AppModule } from '../src/app.module';
import { API_GLOBAL_PREFIX, configureApp } from '../src/configure-app';
import type { CreateMetadataResult } from '../src/metadata/metadata.service';

const metadataUriPattern =
  /^http:\/\/localhost:3001\/api\/v1\/metadata\/[0-9a-f-]{36}$/;

const samplePayload = {
  version: METADATA_VERSION,
  title: 'E2E bounty',
  description: 'Created during metadata POST e2e.',
  tags: ['test'],
  links: [],
};

describe('Metadata (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it(`POST /${API_GLOBAL_PREFIX}/metadata/bounties returns a metadata URI`, () => {
    return request(app.getHttpServer())
      .post(`/${API_GLOBAL_PREFIX}/metadata/bounties`)
      .send(samplePayload)
      .expect(201)
      .expect((res) => {
        const body = res.body as CreateMetadataResult;
        expect(body.uri).toMatch(metadataUriPattern);
      });
  });

  it(`POST /${API_GLOBAL_PREFIX}/metadata/submissions returns a metadata URI`, () => {
    return request(app.getHttpServer())
      .post(`/${API_GLOBAL_PREFIX}/metadata/submissions`)
      .send({ ...samplePayload, title: 'E2E submission' })
      .expect(201)
      .expect((res) => {
        const body = res.body as CreateMetadataResult;
        expect(body.uri).toMatch(metadataUriPattern);
      });
  });

  it('rejects invalid metadata with 400', () => {
    return request(app.getHttpServer())
      .post(`/${API_GLOBAL_PREFIX}/metadata/bounties`)
      .send({ title: 'missing version' })
      .expect(400);
  });

  it('GET metadata by id returns the posted JSON', async () => {
    const postRes = await request(app.getHttpServer())
      .post(`/${API_GLOBAL_PREFIX}/metadata/bounties`)
      .send(samplePayload)
      .expect(201);

    const { uri } = postRes.body as CreateMetadataResult;
    const path = new URL(uri).pathname;

    const getRes = await request(app.getHttpServer()).get(path).expect(200);

    expect(getRes.body as BountyMetadata).toEqual(samplePayload);
  });

  it('GET metadata returns 404 for an unknown id', () => {
    return request(app.getHttpServer())
      .get(
        `/${API_GLOBAL_PREFIX}/metadata/00000000-0000-4000-8000-000000000000`,
      )
      .expect(404);
  });
});
