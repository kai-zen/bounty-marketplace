import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MetadataController } from './metadata.controller';
import { MetadataService } from './metadata.service';
import { MetadataRecord, MetadataSchema } from './schemas/metadata.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MetadataRecord.name, schema: MetadataSchema },
    ]),
  ],
  controllers: [MetadataController],
  providers: [MetadataService],
  exports: [MetadataService],
})
export class MetadataModule {}
