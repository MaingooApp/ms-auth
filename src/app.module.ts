import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { envs } from './config';
import { AuthModule } from './modules/auth/auth.module';
import { NatsModule } from './transports/nats.module';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: envs.jwtSecret,
      signOptions: {
        expiresIn: envs.jwtExpiresIn,
        issuer: envs.jwtIssuer,
        audience: envs.jwtAudience,
      },
    }),
    NatsModule,
    AuthModule,
  ],
})
export class AppModule {}
