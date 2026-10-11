import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import {
  EnvironmentVariables,
  envValidationOptions,
  envValidationSchema,
} from './config/env.validation';
import { ActivityModule } from './activity/activity.module';
import { BlockchainModule } from './blockchain/blockchain.module';
import { BountiesModule } from './bounties/bounties.module';
import { HealthModule } from './health/health.module';
import { IndexerModule } from './indexer/indexer.module';
import { MetadataModule } from './metadata/metadata.module';
import { SubmissionsModule } from './submissions/submissions.module';

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
    ActivityModule,
    BountiesModule,
    HealthModule,
    SubmissionsModule,
    MetadataModule,
    IndexerModule,
  ],
})
export class AppModule {}
