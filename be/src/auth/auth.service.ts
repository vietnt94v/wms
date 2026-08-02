import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { RoleCode } from '../common/enums/role.enum';
import { RefreshToken } from '../users/entities/refresh-token.entity';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { AuthUser } from './types/auth-user.type';

export type AuthTokensResponse = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    username: string;
    fullName: string;
    roles: RoleCode[];
  };
};

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokensRepository: Repository<RefreshToken>,
  ) {}

  async login(username: string, password: string): Promise<AuthTokensResponse> {
    const user = await this.usersService.findByUsername(username);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.issueTokens(user);
  }

  async refresh(refreshToken: string): Promise<AuthTokensResponse> {
    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.refreshTokensRepository.findOne({
      where: { tokenHash },
      relations: { user: { roles: true } },
    });

    if (
      !stored ||
      stored.revokedAt ||
      stored.expiresAt.getTime() <= Date.now()
    ) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (!stored.user.isActive) {
      throw new UnauthorizedException('User is inactive');
    }

    stored.revokedAt = new Date();
    await this.refreshTokensRepository.save(stored);

    return this.issueTokens(stored.user);
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.refreshTokensRepository.findOne({
      where: { tokenHash },
    });

    if (!stored || stored.revokedAt) {
      return;
    }

    stored.revokedAt = new Date();
    await this.refreshTokensRepository.save(stored);
  }

  async me(userId: string): Promise<AuthUser> {
    const user = await this.usersService.findById(userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User is inactive or not found');
    }

    return this.toAuthUser(user);
  }

  private async issueTokens(user: User): Promise<AuthTokensResponse> {
    const authUser = this.toAuthUser(user);
    const accessExpiresIn = this.configService.get<string>(
      'JWT_ACCESS_EXPIRES_IN',
      '15m',
    );

    const accessToken = await this.jwtService.signAsync(
      {
        sub: authUser.id,
        username: authUser.username,
        roles: authUser.roles,
      },
      {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: accessExpiresIn,
      },
    );

    const refreshToken = randomBytes(48).toString('hex');
    const refreshExpiresIn = this.configService.get<string>(
      'JWT_REFRESH_EXPIRES_IN',
      '7d',
    );

    await this.refreshTokensRepository.save(
      this.refreshTokensRepository.create({
        userId: user.id,
        tokenHash: this.hashToken(refreshToken),
        expiresAt: new Date(
          Date.now() + this.parseDurationMs(refreshExpiresIn),
        ),
      }),
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: authUser.id,
        username: authUser.username,
        fullName: authUser.fullName,
        roles: authUser.roles,
      },
    };
  }

  private toAuthUser(user: User): AuthUser {
    return {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      roles: user.roles.map((role) => role.code),
    };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private parseDurationMs(value: string): number {
    const match = /^(\d+)([smhd])$/.exec(value);
    if (!match) {
      return 7 * 24 * 60 * 60 * 1000;
    }

    const amount = Number(match[1]);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return amount * multipliers[unit];
  }
}
