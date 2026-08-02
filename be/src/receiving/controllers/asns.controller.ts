import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ReceivingService } from '../receiving.service';

@Controller('asns')
@UseGuards(JwtAuthGuard)
export class AsnsController {
  constructor(private readonly receivingService: ReceivingService) {}

  @Get()
  list() {
    return this.receivingService.listAsns();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.receivingService.getAsn(id);
  }
}
