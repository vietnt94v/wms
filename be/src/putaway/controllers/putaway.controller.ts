import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ConfirmPutawayDto } from '../dto/putaway.dto';
import { PutawayService } from '../putaway.service';

@Controller('putaway')
@UseGuards(JwtAuthGuard)
export class PutawayController {
  constructor(private readonly putawayService: PutawayService) {}

  @Get('tasks')
  list(@Query('status') status?: string) {
    return this.putawayService.listTasks(status);
  }

  @Get('tasks/:id')
  get(@Param('id') id: string) {
    return this.putawayService.getTask(id);
  }

  @Post('tasks/:id/confirm')
  confirm(@Param('id') id: string, @Body() body: ConfirmPutawayDto) {
    return this.putawayService.confirmPutaway(id, body);
  }
}
