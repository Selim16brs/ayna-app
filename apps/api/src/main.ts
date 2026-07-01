import 'reflect-metadata';
import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { loadEnv } from '@ayna/config/env';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { requestIdMiddleware } from './common/middleware/request-id.middleware';

async function bootstrap(): Promise<void> {
  const env = loadEnv();
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

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

  await app.listen(env.API_PORT);
  Logger.log(`AYNA API http://localhost:${env.API_PORT}/${env.API_GLOBAL_PREFIX}`, 'Bootstrap');
}

void bootstrap();
