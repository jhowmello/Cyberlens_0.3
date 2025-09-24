import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { NetworksModule } from './networks/networks.module';
import { RulesModule } from './rules/rules.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { RouterModule } from './router/router.module';
import { SecurityModule } from './security/security.module';
import { PerformanceModule } from './common/performance/performance.module';
import { CacheInterceptor } from './common/interceptors/cache.interceptor';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { CorsMiddleware } from './common/middleware/cors.middleware';
import { DatabaseProtectionMiddleware } from './common/middleware/database-protection.middleware';
import { DatabaseProtectionGuard } from './common/guards/database-protection.guard';
import { AuditService } from './common/services/audit.service';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    // Configuration module
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: parseInt(process.env.RATE_LIMIT_TTL) || 60000,
        limit: parseInt(process.env.RATE_LIMIT_LIMIT) || 100,
      },
    ]),

    // Database
    PrismaModule,

    // Feature modules
    AuthModule,
    UsersModule,
    NetworksModule,
    RulesModule,
    MonitoringModule,
    RouterModule,
    SecurityModule,
    PerformanceModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    AuditService,
    {
      provide: APP_INTERCEPTOR,
      useClass: CacheInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: DatabaseProtectionGuard,
    },
  ],
  exports: [AuditService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware, CorsMiddleware, DatabaseProtectionMiddleware)
      .forRoutes('*');
  }
}