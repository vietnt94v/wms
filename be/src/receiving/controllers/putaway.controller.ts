import { Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ReceivingService } from '../receiving.service';

@Controller('putaway-tasks')
@UseGuards(JwtAuthGuard)
export class PutawayController {
  constructor(private readonly receivingService: ReceivingService) {}

  @Get()
  list() {
    return this.receivingService.listPutawayTasks();
  }

  @Patch(':id/confirm')
  confirm(@Param('id') id: string) {
    return this.receivingService.confirmPutaway(id);
  }
}
