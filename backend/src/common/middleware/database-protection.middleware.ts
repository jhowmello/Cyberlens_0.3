import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DatabaseProtectionMiddleware implements NestMiddleware {
  private readonly logger = new Logger(DatabaseProtectionMiddleware.name);
  private suspiciousOperations = new Set([
    'deleteMany',
    'drop',
    'truncate',
    'clear',
    'cleanup',
    'reset'
  ]);

  constructor(private configService: ConfigService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const originalSend = res.send;
    const originalJson = res.json;
    
    // Interceptar requisições que podem conter operações perigosas
    if (req.body && typeof req.body === 'object') {
      this.checkForSuspiciousOperations(req);
    }
    
    // Interceptar query parameters
    if (req.query && typeof req.query === 'object') {
      this.checkQueryParams(req);
    }
    
    // Log de operações administrativas
    if (this.isAdminOperation(req)) {
      this.logAdminOperation(req);
    }
    
    // Interceptar respostas para detectar operações de limpeza
    res.send = function(body) {
      if (typeof body === 'string') {
        try {
          const parsed = JSON.parse(body);
          if (parsed && typeof parsed === 'object') {
            // Verificar se a resposta indica operação de limpeza
            if (parsed.deletedCount || parsed.affected || parsed.count) {
              const logger = new Logger('DatabaseProtection');
              logger.warn(`Mass operation detected: ${JSON.stringify({
                url: req.url,
                method: req.method,
                userAgent: req.get('User-Agent'),
                ip: req.ip,
                response: parsed
              })}`);
            }
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }
      return originalSend.call(res, body);
    };
    
    res.json = function(obj) {
      if (obj && typeof obj === 'object') {
        // Verificar se a resposta indica operação de limpeza
        if (obj.deletedCount || obj.affected || obj.count) {
          const logger = new Logger('DatabaseProtection');
          logger.warn(`Mass operation detected: ${JSON.stringify({
            url: req.url,
            method: req.method,
            userAgent: req.get('User-Agent'),
            ip: req.ip,
            response: obj
          })}`);
        }
      }
      return originalJson.call(res, obj);
    };
    
    next();
  }
  
  private checkForSuspiciousOperations(req: Request) {
    const bodyStr = JSON.stringify(req.body).toLowerCase();
    
    for (const operation of this.suspiciousOperations) {
      if (bodyStr.includes(operation)) {
        this.logger.warn(`Suspicious operation detected in request body: ${operation}`, {
          url: req.url,
          method: req.method,
          userAgent: req.get('User-Agent'),
          ip: req.ip,
          operation
        });
      }
    }
  }
  
  private checkQueryParams(req: Request) {
    const queryStr = JSON.stringify(req.query).toLowerCase();
    
    for (const operation of this.suspiciousOperations) {
      if (queryStr.includes(operation)) {
        this.logger.warn(`Suspicious operation detected in query params: ${operation}`, {
          url: req.url,
          method: req.method,
          userAgent: req.get('User-Agent'),
          ip: req.ip,
          operation
        });
      }
    }
  }
  
  private isAdminOperation(req: Request): boolean {
    const adminPaths = [
      '/admin',
      '/database',
      '/cleanup',
      '/reset',
      '/maintenance'
    ];
    
    return adminPaths.some(path => req.url.includes(path));
  }
  
  private logAdminOperation(req: Request) {
    this.logger.warn(`Admin operation accessed: ${req.method} ${req.url}`, {
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      timestamp: new Date().toISOString(),
      headers: req.headers
    });
  }
}