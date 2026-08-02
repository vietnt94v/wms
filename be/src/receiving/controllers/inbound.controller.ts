import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateAsnDto } from '../dto/inbound.dto';
import { ReceivingService } from '../receiving.service';

@Controller('inbound')
@UseGuards(JwtAuthGuard)
export class InboundController {
  constructor(private readonly receivingService: ReceivingService) {}

  @Post('asns')
  createAsn(@Body() body: CreateAsnDto) {
    return this.receivingService.createAsn(body);
  }
}
