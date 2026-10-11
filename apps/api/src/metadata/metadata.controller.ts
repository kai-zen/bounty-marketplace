import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { MetadataService } from './metadata.service';

@Controller('metadata')
export class MetadataController {
  constructor(private readonly metadataService: MetadataService) {}

  @Post('bounties')
  @HttpCode(HttpStatus.CREATED)
  createBountyMetadata(@Body() body: unknown) {
    return this.metadataService.createBountyMetadata(body);
  }

  @Post('submissions')
  @HttpCode(HttpStatus.CREATED)
  createSubmissionMetadata(@Body() body: unknown) {
    return this.metadataService.createSubmissionMetadata(body);
  }

  @Get(':id')
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.metadataService.getById(id);
  }
}
