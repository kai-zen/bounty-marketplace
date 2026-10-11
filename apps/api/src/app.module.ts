import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import {
  EnvironmentVariables,
  envValidationOptions,
  envValidationSchema,
} from './config/env.validation';
import { BlockchainModule } from './blockchain/blockchain.module';
import { HealthModule } from './health/health.module';
import { IndexerModule } from './indexer/indexer.module';
import { MetadataModule } from './metadata/metadata.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: envValidationOptions,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) => ({
        uri: config.get('MONGODB_URI', { infer: true }),
      }),
    }),
    BlockchainModule,
    HealthModule,
    MetadataModule,
    IndexerModule,
  ],
})
export class AppModule {}
