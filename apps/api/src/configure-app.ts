import { INestApplication } from '@nestjs/common';

export const API_GLOBAL_PREFIX = 'api/v1';

const CORS_ORIGINS = ['http://localhost:3000'];

export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix(API_GLOBAL_PREFIX);
  app.enableCors({ origin: CORS_ORIGINS });
}
