import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { EnvironmentVariables } from './config/env.validation';
import { INestApplication } from '@nestjs/common';

export const API_GLOBAL_PREFIX = 'api/v1';
const CORS_ORIGINS = ['http://localhost:3000'];

export const configureApp = (app: INestApplication) => {
  app.setGlobalPrefix(API_GLOBAL_PREFIX);
  app.enableCors({ origin: CORS_ORIGINS });
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  configureApp(app);

  const config = app.get(ConfigService<EnvironmentVariables, true>);
  await app.listen(config.get('PORT', { infer: true }));
}

void bootstrap();
