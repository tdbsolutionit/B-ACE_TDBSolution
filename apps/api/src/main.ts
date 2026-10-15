import 'reflect-metadata';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { NestFactory } from '@nestjs/core';

function loadRootEnv() {
  try {
    const text = readFileSync(resolve(__dirname, '../../../.env'), 'utf8');
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq < 1) continue;
      const key = trimmed.slice(0, eq);
      if (!process.env[key]) process.env[key] = trimmed.slice(eq + 1);
    }
  } catch {
    // Prisma and the shell can also provide env.
  }
}

loadRootEnv();
import { json, urlencoded } from 'express';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.use(json({ limit: '2mb' }));
  app.use(urlencoded({ extended: true, limit: '2mb' }));
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: true,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  const config = new DocumentBuilder()
    .setTitle('B-ACE CRM')
    .setDescription('Modular monolith API. Mọi query nghiệp vụ đều có tenant_id.')
    .setVersion('0.2.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));
  await app.listen(Number(process.env.API_PORT || 3001));
}

bootstrap();
