import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express'; 
import { join } from 'path'; 
import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as expressBasicAuth from 'express-basic-auth';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.setGlobalPrefix('api');
  app.use(cookieParser());

  const swaggerUser = process.env.SWAGGER_USER || 'admin';
  const swaggerPassword = process.env.SWAGGER_PASSWORD || 'dev-password';
  
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,            
    forbidNonWhitelisted: true, 
    transform: true,            
  }));
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/', 
  });

  
  const webOrigin = process.env.WEB_ORIGIN || 'http://localhost:3000';

  const allowOrigins = [
    ...webOrigin.split(',').map(origin => origin.trim()), 
    'http:192.168.103.8:8080',
  ];
  app.enableCors({
    origin: allowOrigins,
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.use(
    ['/api-docs', '/api-docs-json'],
    expressBasicAuth.default({
      challenge: true,
      users: {
        [swaggerUser]: swaggerPassword, 
      },
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('B-ACE CRM API')
    .setDescription('Tài liệu API dành cho Web và Hệ thống bên thứ 3')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  
  SwaggerModule.setup('api-docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
  
  await app.listen(3001);
}
bootstrap();