import { Controller, Get, Param, Query } from '@nestjs/common';
import { SubmissionsService } from './submissions.service';

@Controller()
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Get('bounties/:escrowAddress/submissions')
  listForBounty(
    @Param('escrowAddress') escrowAddress: string,
    @Query() query: Record<string, unknown>,
  ) {
    return this.submissionsService.listForBounty(escrowAddress, query);
  }

  @Get('submissions')
  listBySubmitter(@Query() query: Record<string, unknown>) {
    return this.submissionsService.listBySubmitter(query);
  }
}
