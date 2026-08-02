import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ReceivingService } from '../receiving.service';

@Controller('inventory')
@UseGuards(JwtAuthGuard)
export class InventoryController {
  constructor(private readonly receivingService: ReceivingService) {}

  @Get()
  list() {
    return this.receivingService.listInventory();
  }
}
