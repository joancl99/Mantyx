// Env overrides must be in place before AppModule's ConfigModule validates
// process.env, so this import has to stay first.
import './env';

import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
// E2E intentionally boots the real API application module to exercise actual
// guards, pipes, filters, and persistence.
// eslint-disable-next-line @nx/enforce-module-boundaries
import { AppModule } from '../../../api/src/app/app.module';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { GlobalExceptionFilter } from '../../../api/src/common/filters/http-exception.filter';

export interface E2eApp {
  app: INestApplication;
  baseURL: string;
}

/**
 * Boots the full AppModule in-process on a dynamic port, replicating the
 * pieces of `main.ts` that affect API behavior (cookie parsing, global
 * prefix, exception filter, validation pipe). Helmet/CORS/Swagger/static
 * assets are deliberately left out — they don't change endpoint semantics.
 */
export async function createE2eApp(): Promise<E2eApp> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication<NestExpressApplication>();
  // Mirrors main.ts: req.ip must resolve through X-Forwarded-For (throttler
  // buckets and auth audit IPs) — the spec asserts the forwarded IP lands in
  // the audit trail.
  app.set('trust proxy', 1);
  app.useWebSocketAdapter(new IoAdapter(app));
  app.use(cookieParser());
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(0);
  return { app, baseURL: await app.getUrl() };
}
