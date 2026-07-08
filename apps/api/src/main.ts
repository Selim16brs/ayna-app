import 'reflect-metadata';
import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { loadEnv } from '@ayna/config/env';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { requestIdMiddleware } from './common/middleware/request-id.middleware';

async function bootstrap(): Promise<void> {
  const env = loadEnv();
  // §5.1.1 — cut-out için telefon fotoğrafı base64 gövdesi MB'larca olabilir; Express varsayılan
  // ~100KB limiti bu istekleri 500 ile düşürüyordu. Varsayılan parser'ı kapat, 15MB'lık kendimizinkini
  // kaydet (schema tavanı ~12M karakter). Böylece çakışma olmaz.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    bodyParser: false,
  });
  app.useBodyParser('json', { limit: '15mb' });
  app.useBodyParser('urlencoded', { limit: '15mb', extended: true });

  app.setGlobalPrefix(env.API_GLOBAL_PREFIX);
  // Admin web paneli + mobil için CORS (dev: tüm origin'ler)
  app.enableCors({ origin: true, credentials: true });
  app.use(requestIdMiddleware);
  app.useGlobalFilters(new AllExceptionsFilter());
  // Not: Girdi doğrulama Zod ile yapılır (packages/validation). NestJS'in
  // class-validator tabanlı ValidationPipe'ı kullanılmaz; Zod pipe EPIC 2'de eklenir.

  const swaggerConfig = new DocumentBuilder()
    .setTitle('AYNA API')
    .setDescription('AYNA backend API — docs/planning/07-api-conventions.md')
    .setVersion('v1')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  // Bulut sağlayıcıları (Railway vb.) PORT enjekte eder; yoksa yerel API_PORT.
  // 0.0.0.0 bind → konteyner dışından erişilebilir.
  const port = process.env.PORT ? Number(process.env.PORT) : env.API_PORT;
  await app.listen(port, '0.0.0.0');
  Logger.log(`AYNA API listening on :${port}/${env.API_GLOBAL_PREFIX}`, 'Bootstrap');
}

void bootstrap();
