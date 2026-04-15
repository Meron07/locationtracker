import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import Joi from 'joi';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CirclesModule } from './modules/circles/circles.module';
import { LocationModule } from './modules/location/location.module';
import { GeofenceModule } from './modules/geofence/geofence.module';
import { SosModule } from './modules/sos/sos.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PrivacyModule } from './modules/privacy/privacy.module';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    // ── Config: validate all env vars on startup ──────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
        PORT: Joi.number().default(3000),
        DB_HOST: Joi.string().required(),
        DB_PORT: Joi.number().default(5432),
        DB_NAME: Joi.string().required(),
        DB_USER: Joi.string().required(),
        DB_PASSWORD: Joi.string().required(),
        REDIS_URL: Joi.string().required(),
        JWT_PRIVATE_KEY_PATH: Joi.string().required(),
        JWT_PUBLIC_KEY_PATH: Joi.string().required(),
        FIREBASE_PROJECT_ID: Joi.string().required(),
        LOCATION_ENCRYPTION_KEY: Joi.string().length(64).required(),
      }),
    }),

    // ── Database ──────────────────────────────────────────────────────────
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        database: config.get('DB_NAME'),
        username: config.get('DB_USER'),
        password: config.get('DB_PASSWORD'),
        ssl: config.get('DB_SSL') === 'true' ? { rejectUnauthorized: true } : false,
        autoLoadEntities: true,
        synchronize: false,     // NEVER true in production; use migrations
        logging: config.get('NODE_ENV') === 'development',
      }),
    }),

    // ── Rate limiting: global defaults, overridden per route ─────────────
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 100,
      },
    ]),

    // ── Feature modules ───────────────────────────────────────────────────
    AuthModule,
    UsersModule,
    CirclesModule,
    LocationModule,
    GeofenceModule,
    SosModule,
    NotificationsModule,
    PrivacyModule,
    AdminModule,
  ],
})
export class AppModule {}
