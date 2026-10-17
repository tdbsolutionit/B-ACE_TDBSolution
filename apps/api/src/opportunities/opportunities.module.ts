import { Module } from '@nestjs/common';
import { OpportunitiesController } from './opportunities.controller';
import { OpportunitiesService } from './opportunities.service';
import { PrismaModule } from '../prisma/prisma.module'; 
import { RealtimeModule } from '../realtime/realtime.module'; 

@Module({
  imports: [PrismaModule, RealtimeModule],
  controllers: [OpportunitiesController],
  providers: [OpportunitiesService],
  exports: [OpportunitiesService],
})
export class OpportunitiesModule {}