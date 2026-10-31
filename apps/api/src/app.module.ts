import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CustomersModule } from './customers/customers.module';
import { OpportunitiesModule } from './opportunities/opportunities.module';
import { QuotesModule } from './quotes/quotes.module';
import { UsersModule } from './users/users.module';
import { TasksModule } from './tasks/tasks.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { SearchModule } from './search/search.module';
import { ActivitiesModule } from './activities/activities.module';
import { FilesModule } from './files/files.module';
import { ChatModule } from './chat/chat.module';
import { HealthController } from './health.controller';
import { JwtAuthGuard } from './common/guards';
import { RealtimeModule } from './realtime/realtime.module';
import { SettingsModule } from './settings/settings.module';
import { RolesModule } from './roles/roles.module';
import { TeamsModule } from './teams/teams.module';
import { StagesModule } from './stages/stages.module';
import { TenantsModule } from './tenants/tenants.module';
import * as path from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: path.resolve(process.cwd(), '.env'),
    }),

    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): JwtModuleOptions => ({
        secret: configService.get<string>('JWT_SECRET') || 'fallback_secret',
        signOptions: { 
          expiresIn: (configService.get<string>('JWT_EXPIRES') || '8h') as any 
        },
      }),
    }),

    ThrottlerModule.forRoot([{
      ttl: 60000, 
      limit: 1000,
    }]),

    RealtimeModule,
    PrismaModule,
    AuthModule,
    CustomersModule,
    OpportunitiesModule,
    QuotesModule,
    UsersModule,
    TasksModule,
    DashboardModule,
    SearchModule,
    ActivitiesModule,
    FilesModule,
    ChatModule,
    SettingsModule,
    RolesModule,
    TeamsModule,
    StagesModule,
    TenantsModule,
  ],
  controllers: [HealthController],
  providers: [
    { 
      provide: APP_GUARD, 
      useClass: JwtAuthGuard 
    },
  ],
})
export class AppModule {}