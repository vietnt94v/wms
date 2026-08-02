import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ResolveDiscrepancyDto } from '../dto/receiving.dto';
import { ReceivingService } from '../receiving.service';

@Controller('discrepancies')
@UseGuards(JwtAuthGuard)
export class DiscrepanciesController {
  constructor(private readonly receivingService: ReceivingService) {}

  @Get()
  list() {
    return this.receivingService.listDiscrepancies();
  }

  @Patch(':id')
  resolve(@Param('id') id: string, @Body() body: ResolveDiscrepancyDto) {
    return this.receivingService.resolveDiscrepancy(id, body);
  }
}
