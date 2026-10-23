import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express'; 
import { join } from 'path'; 
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/', 
  });

  app.setGlobalPrefix('api');
  app.use(cookieParser());
  // Nhớ bật CORS để nhận cookie từ Frontend
  app.enableCors({ origin: 'http://localhost:3000', credentials: true });
  
  await app.listen(3001);
}
bootstrap();