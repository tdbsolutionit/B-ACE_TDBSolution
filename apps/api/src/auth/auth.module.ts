import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { IntegrationAuthController } from './integration-auth.controller';

@Module({
  controllers: [AuthController, IntegrationAuthController],
  providers: [AuthService],
})
export class AuthModule {}