import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ReceivingService } from '../receiving.service';

@Controller('docks')
@UseGuards(JwtAuthGuard)
export class DocksController {
  constructor(private readonly receivingService: ReceivingService) {}

  @Get()
  list() {
    return this.receivingService.listDocks();
  }
}
