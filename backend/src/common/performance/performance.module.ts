import { Module } from '@nestjs/common';
import { PerformanceService } from './performance.service';
import { PerformanceController } from './performance.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { CacheInterceptor } from '../interceptors/cache.interceptor';

@Module({
  imports: [PrismaModule],
  providers: [PerformanceService, CacheInterceptor],
  controllers: [PerformanceController],
  exports: [PerformanceService, CacheInterceptor],
})
export class PerformanceModule {}