import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { Prisma, PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import * as argon2 from 'argon2';
import ms from 'ms';

import { envs, NATS_SERVICE, AuthEvents } from 'src/config';
import {
  LoginUserDto,
  ProfileRequestDto,
  RefreshTokenDto,
  RegisterUserDto,
  UpdateUserRequestDto,
  VerifyTokenDto,
} from './dto';
import type { AuthResponse, AuthTokens, AuthUser, JwtPayload } from './interfaces';

@Injectable()
export class AuthService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    @Inject(NATS_SERVICE) private readonly client: ClientProxy,
  ) {
    super();
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Database connection established');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database connection closed');
  }

  async register(payload: RegisterUserDto): Promise<AuthResponse> {
    try {
      const response = await this.$transaction(async (tx: Prisma.TransactionClient) => {
        const existing = await tx.user.findUnique({
          where: { email: payload.email },
        });

        if (existing) {
          throw new RpcException({
            status: 400,
            message: 'Email already registered',
          });
        }

        // Verificar que el rol existe
        const role = await tx.role.findUnique({
          where: { id: payload.roleId },
        });

        if (!role) {
          throw new RpcException({
            status: 400,
            message: 'Invalid role',
          });
        }

        const passwordHash = await argon2.hash(payload.password);

        const created = await tx.user.create({
          data: {
            email: payload.email,
            name: payload.name,
            passwordHash,
            roleId: payload.roleId,
            enterpriseId: payload.enterpriseId,
            phonePrefix: payload.phonePrefix,
            phoneNumber: payload.phoneNumber,
            emailFluvia: payload.emailFluvia,
          },
          include: {
            role: true,
          },
        });

        const tokens = await this.issueTokens(tx, created);

        return {
          user: created,
          tokens,
        };
      });

      this.publishUserCreated(response.user);

      return this.mapResponse(response.user, response.tokens);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async login(payload: LoginUserDto): Promise<AuthResponse> {
    try {
      const user = await this.user.findUnique({
        where: { email: payload.email },
        include: { role: true },
      });

      if (!user) {
        throw new RpcException({ status: 400, message: 'Invalid credentials' });
      }

      const isValid = await argon2.verify(user.passwordHash, payload.password);
      if (!isValid) {
        throw new RpcException({ status: 400, message: 'Invalid credentials' });
      }

      const { tokens } = await this.$transaction(async (tx: Prisma.TransactionClient) => {
        const issuedTokens = await this.issueTokens(tx, user);
        return { tokens: issuedTokens };
      });

      return this.mapResponse(user, tokens);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async refresh(payload: RefreshTokenDto): Promise<AuthResponse> {
    try {
      const decoded = await this.jwtService.verifyAsync<JwtPayload>(payload.refreshToken, {
        secret: envs.refreshJwtSecret,
        issuer: envs.jwtIssuer,
        audience: envs.jwtAudience,
      });

      if (!decoded.jti) {
        throw new RpcException({ status: 401, message: 'Invalid refresh token' });
      }

      const tokenRecord = await this.refreshToken.findUnique({
        where: { id: decoded.jti },
      });

      if (!tokenRecord || tokenRecord.revokedAt) {
        throw new RpcException({ status: 401, message: 'Refresh token revoked' });
      }

      if (tokenRecord.expiresAt.getTime() < Date.now()) {
        throw new RpcException({ status: 401, message: 'Refresh token expired' });
      }

      const valid = await argon2.verify(tokenRecord.tokenHash, payload.refreshToken);
      if (!valid) {
        throw new RpcException({ status: 401, message: 'Invalid refresh token' });
      }

      const user = await this.user.findUnique({ where: { id: decoded.sub } });
      if (!user) {
        throw new RpcException({ status: 404, message: 'User not found' });
      }

      const { tokens } = await this.$transaction(async (tx: Prisma.TransactionClient) => {
        await tx.refreshToken.update({
          where: { id: tokenRecord.id },
          data: { revokedAt: new Date() },
        });

        const issuedTokens = await this.issueTokens(tx, user);
        return { tokens: issuedTokens };
      });

      return this.mapResponse(user, tokens);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async profile(payload: ProfileRequestDto): Promise<{ user: AuthUser }> {
    try {
      const user = await this.findUserById(payload);

      return {
        user: this.toAuthUser(user),
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async userUpdate(payload: UpdateUserRequestDto) {
    try {
      const user = await this.findUserById({
        userId: payload.userId,
        enterpriseId: payload.enterpriseId,
      });

      const isValid = await argon2.verify(user.passwordHash, payload.data.currentPassword);
      if (!isValid) {
        throw new RpcException({ status: 400, message: 'Invalid credentials' });
      }

      const updateData: any = {};

      if (payload.data.name) {
        updateData.name = payload.data.name;
      }

      if (payload.data.email) {
        updateData.email = payload.data.email;
      }

      if (payload.data.password) {
        updateData.passwordHash = await argon2.hash(payload.data.password);
      }

      if (payload.data.phonePrefix !== undefined) {
        updateData.phonePrefix = payload.data.phonePrefix;
      }

      if (payload.data.phoneNumber !== undefined) {
        updateData.phoneNumber = payload.data.phoneNumber;
      }

      if (Object.keys(updateData).length === 0) {
        throw new RpcException({
          status: 400,
          message: 'No fields to update',
        });
      }

      const response = await this.$transaction(async (tx: Prisma.TransactionClient) => {
        const updatedUser = await tx.user.update({
          where: { id: payload.userId },
          data: updateData,
          include: { role: true },
        });

        await tx.refreshToken.updateMany({
          where: { userId: payload.userId, revokedAt: null },
          data: { revokedAt: new Date() },
        });

        return { user: updatedUser };
      });

      return {
        user: this.toAuthUser(response.user),
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async verifyToken(payload: VerifyTokenDto): Promise<{ user: AuthUser }> {
    try {
      const decoded = await this.jwtService.verifyAsync<JwtPayload>(payload.token, {
        secret: envs.jwtSecret,
        issuer: envs.jwtIssuer,
        audience: envs.jwtAudience,
      });

      const user = await this.user.findUnique({
        where: { id: decoded.sub },
        include: { role: true },
      });

      if (!user) {
        throw new RpcException({ status: 404, message: 'User not found' });
      }
      if (decoded.enterpriseId && decoded.enterpriseId !== user.enterpriseId) {
        throw new RpcException({ status: 403, message: 'Forbidden' });
      }

      return {
        user: this.toAuthUser(user),
      };
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }

      this.logger.warn(`Token verification failed: ${(error as Error).message}`);
      throw new RpcException({ status: 401, message: 'Invalid token' });
    }
  }

  async getRoleByName(name: string): Promise<{ id: string; name: string }> {
    try {
      const role = await this.role.findUnique({
        where: { name },
        select: { id: true, name: true },
      });

      if (!role) {
        throw new RpcException({ status: 404, message: `Role '${name}' not found` });
      }

      return role;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async health() {
    return {
      status: 'ok',
    };
  }

  private async issueTokens(tx: Prisma.TransactionClient, user: any): Promise<AuthTokens> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roleId: user.roleId,
      enterpriseId: user.enterpriseId,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: envs.jwtSecret,
      expiresIn: envs.jwtExpiresIn as any,
      issuer: envs.jwtIssuer,
      audience: envs.jwtAudience,
    });

    const refreshId = randomUUID();

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: envs.refreshJwtSecret,
      expiresIn: envs.refreshExpiresIn as any,
      issuer: envs.jwtIssuer,
      audience: envs.jwtAudience,
      jwtid: refreshId,
    });

    const hashedRefresh = await argon2.hash(refreshToken);
    const expiresAt = this.computeExpiry(envs.refreshExpiresIn);

    await tx.refreshToken.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await tx.refreshToken.create({
      data: {
        id: refreshId,
        userId: user.id,
        tokenHash: hashedRefresh,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: envs.jwtExpiresIn,
      refreshExpiresIn: envs.refreshExpiresIn,
    };
  }

  async getRoles() {
    try {
      const roles = await this.role.findMany({
        select: {
          id: true,
          name: true,
          description: true,
        },
        orderBy: {
          name: 'asc',
        },
      });

      return roles;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private publishUserCreated(user: any): void {
    this.client.emit(AuthEvents.userCreated, {
      userId: user.id,
      email: user.email,
      name: user.name,
      roleId: user.roleId,
      enterpriseId: user.enterpriseId,
      createdAt: user.createdAt.toISOString(),
    });
  }

  private mapResponse(user: any, tokens: AuthTokens): AuthResponse {
    return {
      user: this.toAuthUser(user),
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
        refreshExpiresIn: tokens.refreshExpiresIn,
      },
    };
  }

  private toAuthUser(user: any): AuthUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      roleId: user.roleId,
      roleName: user.role?.name,
      enterpriseId: user.enterpriseId,
      phonePrefix: user.phonePrefix,
      phoneNumber: user.phoneNumber,
      emailFluvia: user.emailFluvia,
      createdAt: user.createdAt,
    };
  }

  private computeExpiry(duration: string): Date {
    const millis = ms(duration as Parameters<typeof ms>[0]);
    if (typeof millis !== 'number') {
      throw new RpcException({ status: 500, message: 'Invalid duration format' });
    }

    return new Date(Date.now() + millis);
  }

  private handleError(error: unknown): RpcException {
    if (error instanceof RpcException) {
      return error;
    }

    if (error instanceof Error && 'code' in error) {
      return new RpcException({
        status: 400,
        message: (error as Error).message,
      });
    }

    this.logger.error(error);
    return new RpcException({
      status: 500,
      message: 'Internal server error',
    });
  }

  private async findUserById(payload: ProfileRequestDto) {
    const user = await this.user.findUnique({
      where: { id: payload.userId },
      include: { role: true },
    });

    if (!user) {
      throw new RpcException({ status: 404, message: 'User not found' });
    }

    if (payload.enterpriseId && user.enterpriseId !== payload.enterpriseId) {
      throw new RpcException({ status: 403, message: 'Forbidden' });
    }
    return user;
  }
}
