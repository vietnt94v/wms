import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import * as AuthTypes from '../../auth/types/auth-user.type';
import { ReceivingService } from '../receiving.service';

@Controller('docks')
@UseGuards(JwtAuthGuard)
export class DocksController {
  constructor(private readonly receivingService: ReceivingService) {}

  @Get()
  list() {
    return this.receivingService.listDocks();
  }

  @Get('assignments/me')
  myAssignment(@CurrentUser() user: AuthTypes.AuthUser) {
    return this.receivingService.getMyDockAssignment(user.id);
  }

  @Post('check-out')
  checkOut(@CurrentUser() user: AuthTypes.AuthUser) {
    return this.receivingService.checkOutDock(user.id);
  }

  @Post(':dockId/check-in')
  checkIn(
    @Param('dockId') dockId: string,
    @CurrentUser() user: AuthTypes.AuthUser,
  ) {
    return this.receivingService.checkInDock(dockId, user.id);
  }
}
