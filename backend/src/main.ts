import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  // ── Security headers ──────────────────────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https://cdn.safecircle.app'],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    }),
  );

  // ── CORS: only allow known origins ────────────────────────────────────────
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3001',
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // ── Global validation pipe ────────────────────────────────────────────────
  // Strips unknown properties and validates all DTOs automatically.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,        // strip unknown properties
      forbidNonWhitelisted: true,
      transform: true,        // auto-transform DTOs (string → number, etc.)
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ── API prefix ────────────────────────────────────────────────────────────
  app.setGlobalPrefix('v1');

  // ── Sentry error monitoring (optional — only if @sentry/node is installed) ──
  if (process.env.SENTRY_DSN) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Sentry = require('@sentry/node');
      Sentry.init({ dsn: process.env.SENTRY_DSN, environment: process.env.NODE_ENV });
      app.use(Sentry.Handlers.requestHandler());
    } catch {
      // @sentry/node not installed — monitoring disabled
    }
  }

  await app.listen(process.env.PORT ?? 3000);
  console.log(`SafeCircle backend running on port ${process.env.PORT ?? 3000}`);
}

bootstrap();
