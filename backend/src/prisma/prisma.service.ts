import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { DatabaseCleanup } from '../common/decorators/dangerous-operation.decorator';
import { AuditService } from '../common/services/audit.service';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private retryAttempts = 3;
  private retryDelay = 1000;

  private auditService: AuditService;

  constructor(private configService: ConfigService) {
    const isProduction = configService.get('NODE_ENV') === 'production';
    
    super({
      datasources: {
        db: {
          url: configService.get('DATABASE_URL'),
        },
      },
      log: isProduction 
        ? [{ emit: 'event', level: 'error' }] 
        : [{ emit: 'event', level: 'query' }, { emit: 'event', level: 'error' }, { emit: 'event', level: 'info' }, { emit: 'event', level: 'warn' }],
      errorFormat: 'pretty',
    });

    // Enhanced logging for development
    if (!isProduction) {
      this.$on('query', (e) => {
        this.logger.debug(`Query: ${e.query}`);
        this.logger.debug(`Duration: ${e.duration}ms`);
      });
    }

    this.$on('error', (e) => {
      this.logger.error('Database error:', e);
    });

    this.$on('warn', (e) => {
      this.logger.warn('Database warning:', e);
    });
  }

  setAuditService(auditService: AuditService) {
    this.auditService = auditService;
  }

  async onModuleInit() {
    await this.connectWithRetry();
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
      this.logger.log('🔌 Database disconnected successfully');
    } catch (error) {
      this.logger.error('Error disconnecting from database:', error);
    }
  }

  private async connectWithRetry(): Promise<void> {
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        await this.$connect();
        this.logger.log('✅ Database connected successfully');
        return;
      } catch (error) {
        this.logger.error(`❌ Database connection attempt ${attempt}/${this.retryAttempts} failed:`, error.message);
        
        if (attempt === this.retryAttempts) {
          this.logger.error('❌ All database connection attempts failed');
          throw error;
        }
        
        this.logger.log(`⏳ Retrying in ${this.retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        this.retryDelay *= 2; // Exponential backoff
      }
    }
  }

  @DatabaseCleanup('Complete database cleanup - removes all data')
  async cleanDatabase() {
    const nodeEnv = this.configService.get('NODE_ENV');
    const startTime = new Date();
    let success = false;
    let errorMessage: string | undefined;
    
    try {
      // Múltiplas verificações de segurança
      if (nodeEnv === 'production') {
        const error = 'Cannot clean database in production environment';
        await this.logCleanupAttempt('cleanDatabase', false, { nodeEnv }, error);
        throw new Error(error);
      }
      
      if (nodeEnv !== 'test' && nodeEnv !== 'development') {
        const error = 'Database cleanup only allowed in test or development environments';
        await this.logCleanupAttempt('cleanDatabase', false, { nodeEnv }, error);
        throw new Error(error);
      }
      
      // Verificar se há uma flag específica para permitir limpeza
      const allowCleanup = this.configService.get('ALLOW_DATABASE_CLEANUP');
      if (!allowCleanup || allowCleanup !== 'true') {
        const error = 'Database cleanup not explicitly allowed. Set ALLOW_DATABASE_CLEANUP=true in environment';
        await this.logCleanupAttempt('cleanDatabase', false, { allowCleanup, nodeEnv }, error);
        throw new Error(error);
      }
      
      // Log da operação para auditoria
      this.logger.warn('⚠️ DATABASE CLEANUP INITIATED - This will delete all data!');
      this.logger.warn(`Environment: ${nodeEnv}`);
      this.logger.warn(`Timestamp: ${startTime.toISOString()}`);
      
      const models = Reflect.ownKeys(this).filter((key) => key[0] !== '_');
      const cleanedModels: string[] = [];

      const results = await Promise.all(
        models.map(async (modelKey) => {
          const model = this[modelKey as string];
          if (model && typeof model.deleteMany === 'function') {
            this.logger.warn(`Cleaning model: ${modelKey as string}`);
            cleanedModels.push(modelKey as string);
            return model.deleteMany();
          }
        }),
      );
      
      success = true;
      await this.logCleanupAttempt('cleanDatabase', true, {
        nodeEnv,
        cleanedModels,
        duration: Date.now() - startTime.getTime()
      });
      
      return results;
    } catch (error) {
      errorMessage = error.message;
      await this.logCleanupAttempt('cleanDatabase', false, { nodeEnv }, errorMessage);
      throw error;
    }
  }
  
  private async logCleanupAttempt(
    operation: string,
    success: boolean,
    details: Record<string, any>,
    errorMessage?: string
  ) {
    if (this.auditService) {
      try {
        await this.auditService.logDatabaseCleanupAttempt(
          operation,
          success,
          details,
          undefined, // userInfo não disponível no contexto do serviço
          errorMessage
        );
      } catch (auditError) {
        this.logger.error('Failed to log cleanup attempt to audit service:', auditError);
      }
    }
  }

  // Optimized transaction wrapper with retry logic
  async executeTransaction<T>(fn: (prisma: PrismaService) => Promise<T>, maxRetries = 3): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.$transaction(async (prisma) => {
          return await fn(prisma as PrismaService);
        }, {
          maxWait: 5000, // 5 seconds
          timeout: 10000, // 10 seconds
        });
      } catch (error) {
        this.logger.error(`Transaction attempt ${attempt}/${maxRetries} failed:`, error.message);
        
        if (attempt === maxRetries) {
          throw error;
        }
        
        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
      }
    }
  }

  // Health check method
  async healthCheck(): Promise<{ status: string; timestamp: Date; latency?: number }> {
    try {
      const start = Date.now();
      await this.$queryRaw`SELECT 1`;
      const latency = Date.now() - start;
      
      return {
        status: 'healthy',
        timestamp: new Date(),
        latency,
      };
    } catch (error) {
      this.logger.error('Database health check failed:', error);
      return {
        status: 'unhealthy',
        timestamp: new Date(),
      };
    }
  }

  // Optimized batch operations
  async batchCreate<T>(model: any, data: T[], batchSize = 100): Promise<void> {
    const batches = [];
    for (let i = 0; i < data.length; i += batchSize) {
      batches.push(data.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      await model.createMany({
        data: batch,
        skipDuplicates: true,
      });
    }
  }

  // Connection pool status
  getConnectionInfo(): any {
    return {
      url: this.configService.get('DATABASE_URL')?.replace(/\/\/.*:.*@/, '//***:***@'),
      provider: 'postgresql',
      status: 'connected',
    };
  }
}