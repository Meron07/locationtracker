import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as fs from 'fs';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersModule } from '../users/users.module';
import { RefreshToken } from './entities/refresh-token.entity';

@Module({
  imports: [
    PassportModule,
    UsersModule,
    TypeOrmModule.forFeature([RefreshToken]),

    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        privateKey: fs.readFileSync(config.getOrThrow('JWT_PRIVATE_KEY_PATH')),
        publicKey: fs.readFileSync(config.getOrThrow('JWT_PUBLIC_KEY_PATH')),
        signOptions: {
          algorithm: 'RS256',
          expiresIn: config.get<number>('JWT_ACCESS_TOKEN_TTL', 900),
          issuer: 'safecircle.app',
          audience: 'safecircle-api',
        },
      }),
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
