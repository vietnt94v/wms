import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ReceivingService } from '../receiving.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class CatalogController {
  constructor(private readonly receivingService: ReceivingService) {}

  @Get('products')
  listProducts() {
    return this.receivingService.listProducts();
  }

  @Get('suppliers')
  listSuppliers() {
    return this.receivingService.listSuppliers();
  }
}
