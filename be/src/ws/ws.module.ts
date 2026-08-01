import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { EventsGateway } from './events.gateway';

@Module({
  imports: [AuthModule, UsersModule],
  providers: [EventsGateway],
})
export class WsModule {}
