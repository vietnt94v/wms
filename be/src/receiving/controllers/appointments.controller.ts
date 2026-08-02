import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ScheduleAppointmentDto } from '../dto/receiving.dto';
import { ReceivingService } from '../receiving.service';

@Controller('appointments')
@UseGuards(JwtAuthGuard)
export class AppointmentsController {
  constructor(private readonly receivingService: ReceivingService) {}

  @Get()
  list() {
    return this.receivingService.listAppointments();
  }

  @Post()
  schedule(@Body() body: ScheduleAppointmentDto) {
    return this.receivingService.scheduleAppointment(body);
  }
}
