import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { RECEIVING_ENTITIES } from './receiving/entities';
import { ReceivingModule } from './receiving/receiving.module';
import { RefreshToken } from './users/entities/refresh-token.entity';
import { Role } from './users/entities/role.entity';
import { User } from './users/entities/user.entity';
import { UsersModule } from './users/users.module';
import { WsModule } from './ws/ws.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('POSTGRES_HOST', 'localhost'),
        port: Number(configService.get<string>('POSTGRES_PORT', '5432')),
        username: configService.get<string>('POSTGRES_USER', 'wms'),
        password: configService.get<string>('POSTGRES_PASSWORD', 'wms'),
        database: configService.get<string>('POSTGRES_DB', 'wms'),
        entities: [User, Role, RefreshToken, ...RECEIVING_ENTITIES],
        synchronize: false,
      }),
    }),
    UsersModule,
    AuthModule,
    ReceivingModule,
    WsModule,
  ],
})
export class AppModule {}
