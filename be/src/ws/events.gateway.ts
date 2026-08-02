import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { DefaultEventsMap, Server, Socket } from 'socket.io';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { UsersService } from '../users/users.service';
import { COMMAND_CODES, WsEnvelope } from './ws-envelope';

type SocketData = {
  user?: {
    id: string;
    username: string;
    fullName: string;
    roles: string[];
  };
};

type AuthedSocket = Socket<
  DefaultEventsMap,
  DefaultEventsMap,
  DefaultEventsMap,
  SocketData
>;

@WebSocketGateway({
  namespace: '/ws',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(EventsGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  async handleConnection(client: AuthedSocket): Promise<void> {
    try {
      const token = this.extractToken(client);
      if (!token) {
        client.disconnect(true);
        return;
      }

      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });

      const user = await this.usersService.findById(payload.sub);
      if (!user || !user.isActive) {
        client.disconnect(true);
        return;
      }

      const authUser = {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        roles: user.roles.map((role) => role.code),
      };

      client.data.user = authUser;
      await client.join(`user:${authUser.id}`);
      for (const role of authUser.roles) {
        await client.join(`role:${role}`);
      }

      const command: WsEnvelope = {
        type: 'COMMAND',
        code: COMMAND_CODES.AUTH_OK,
        payload: { user: authUser },
      };
      client.emit('command', command);
      this.logger.log(`WS connected user=${authUser.username}`);
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: AuthedSocket): void {
    const username = client.data.user?.username ?? 'unknown';
    this.logger.log(`WS disconnected user=${username}`);
  }

  private extractToken(client: Socket): string | null {
    const auth = client.handshake.auth as Record<string, unknown>;
    const authToken = auth.token;
    if (typeof authToken === 'string' && authToken.length > 0) {
      return authToken;
    }

    const queryToken = client.handshake.query.token;
    if (typeof queryToken === 'string' && queryToken.length > 0) {
      return queryToken;
    }

    const header = client.handshake.headers.authorization;
    if (typeof header === 'string' && header.startsWith('Bearer ')) {
      return header.slice('Bearer '.length);
    }

    return null;
  }
}
