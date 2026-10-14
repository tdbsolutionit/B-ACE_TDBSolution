import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
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

@Module({
  imports: [
    RealtimeModule,
    PrismaModule,
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'dev-secret-change-me',
      signOptions: { expiresIn: '8h' },
    }),
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
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
