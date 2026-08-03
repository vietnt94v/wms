import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import * as AuthTypes from '../../auth/types/auth-user.type';
import {
  GateInDto,
  RejectArrivalDto,
  ScanDto,
  SubmitQcDto,
} from '../dto/receiving.dto';
import { ReceivingService } from '../receiving.service';

@Controller('sessions')
@UseGuards(JwtAuthGuard)
export class SessionsController {
  constructor(private readonly receivingService: ReceivingService) {}

  @Get()
  list() {
    return this.receivingService.listSessions();
  }

  @Post('gate-in')
  gateIn(@Body() body: GateInDto, @CurrentUser() user: AuthTypes.AuthUser) {
    return this.receivingService.gateIn(body, user.id);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.receivingService.getSession(id);
  }

  @Patch(':id/reject-arrival')
  rejectArrival(@Param('id') id: string, @Body() body: RejectArrivalDto) {
    return this.receivingService.rejectArrival(id, body.reason);
  }

  @Patch(':id/approve-unknown')
  approveUnknown(@Param('id') id: string) {
    return this.receivingService.approveUnknownArrival(id);
  }

  @Patch(':id/start-unload')
  startUnload(@Param('id') id: string) {
    return this.receivingService.startUnload(id);
  }

  @Patch(':id/start-receiving')
  startReceiving(@Param('id') id: string) {
    return this.receivingService.startReceiving(id);
  }

  @Post(':id/scan')
  scan(@Param('id') id: string, @Body() body: ScanDto) {
    return this.receivingService.scan(id, body);
  }

  @Post(':id/finish-receiving')
  finishReceiving(@Param('id') id: string) {
    return this.receivingService.finishReceiving(id);
  }

  @Post(':id/qc')
  submitQc(@Param('id') id: string, @Body() body: SubmitQcDto) {
    return this.receivingService.submitQc(id, body);
  }

  @Post(':id/putaway-tasks')
  generatePutaway(@Param('id') id: string) {
    return this.receivingService.generatePutawayTasks(id);
  }
}
