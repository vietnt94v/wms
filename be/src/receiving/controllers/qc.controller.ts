import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ReceivingService } from '../receiving.service';

@Controller('qc-results')
@UseGuards(JwtAuthGuard)
export class QcController {
  constructor(private readonly receivingService: ReceivingService) {}

  @Get()
  list() {
    return this.receivingService.listQcResults();
  }
}
