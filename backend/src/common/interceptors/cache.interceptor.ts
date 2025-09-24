import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';

// Cache decorator
export const Cache = (ttl: number = 300) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata('cache_ttl', ttl, descriptor.value);
    return descriptor;
  };
};

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheInterceptor.name);
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private readonly maxCacheSize = 1000;

  constructor(private reflector: Reflector) {
    // Clean expired cache entries every 5 minutes
    setInterval(() => this.cleanExpiredCache(), 5 * 60 * 1000);
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ttl = this.reflector.get<number>('cache_ttl', context.getHandler());
    
    if (!ttl) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const cacheKey = this.generateCacheKey(request);
    
    // Check if we have cached data
    const cachedData = this.getCachedData(cacheKey);
    if (cachedData) {
      this.logger.debug(`Cache hit for key: ${cacheKey}`);
      return of(cachedData);
    }

    // Execute the handler and cache the result
    return next.handle().pipe(
      tap((data) => {
        this.setCachedData(cacheKey, data, ttl);
        this.logger.debug(`Cached data for key: ${cacheKey}`);
      })
    );
  }

  private generateCacheKey(request: any): string {
    const { method, url, query, params, user } = request;
    const userId = user?.id || 'anonymous';
    return `${method}:${url}:${JSON.stringify(query)}:${JSON.stringify(params)}:${userId}`;
  }

  private getCachedData(key: string): any | null {
    const cached = this.cache.get(key);
    
    if (!cached) {
      return null;
    }

    const now = Date.now();
    if (now - cached.timestamp > cached.ttl * 1000) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCachedData(key: string, data: any, ttl: number): void {
    // Prevent cache from growing too large
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  private cleanExpiredCache(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp > cached.ttl * 1000) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug(`Cleaned ${cleanedCount} expired cache entries`);
    }
  }

  // Manual cache management methods
  clearCache(): void {
    this.cache.clear();
    this.logger.log('Cache cleared manually');
  }

  invalidatePattern(pattern: string): void {
    let invalidatedCount = 0;
    
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        invalidatedCount++;
      }
    }

    this.logger.debug(`Invalidated ${invalidatedCount} cache entries matching pattern: ${pattern}`);
  }

  getCacheStats(): { size: number; maxSize: number; hitRate?: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
    };
  }
}