import { Controller, Get, Param, Query } from '@nestjs/common';
import { BountiesService } from './bounties.service';

@Controller('bounties')
export class BountiesController {
  constructor(private readonly bountiesService: BountiesService) {}

  @Get()
  list(@Query() query: Record<string, unknown>) {
    return this.bountiesService.list(query);
  }

  @Get(':escrowAddress')
  getByAddress(@Param('escrowAddress') escrowAddress: string) {
    return this.bountiesService.getByAddress(escrowAddress);
  }
}
