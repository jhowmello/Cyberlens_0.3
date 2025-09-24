import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class DatabaseProtectionGuard implements CanActivate {
  private readonly logger = new Logger(DatabaseProtectionGuard.name);
  private readonly dangerousOperations = [
    'cleanDatabase',
    'deleteMany',
    'truncate',
    'drop',
    'clear',
    'reset',
    'cleanup'
  ];

  constructor(
    private reflector: Reflector,
    private configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const handler = context.getHandler();
    const className = context.getClass();
    
    // Verificar se é ambiente de produção
    const nodeEnv = this.configService.get('NODE_ENV');
    if (nodeEnv === 'production') {
      this.blockDangerousOperations(request, handler, className);
    }
    
    // Verificar se há flag de proteção ativa
    const protectionEnabled = this.configService.get('DATABASE_PROTECTION_ENABLED', 'true');
    if (protectionEnabled === 'true') {
      this.checkOperationSafety(request, handler, className);
    }
    
    // Log de operações sensíveis
    this.logSensitiveOperation(request, handler, className);
    
    return true;
  }
  
  private blockDangerousOperations(
    request: Request,
    handler: Function,
    className: Function
  ) {
    const handlerName = handler.name;
    const classNameStr = className.name;
    const url = request.url;
    const method = request.method;
    
    // Verificar nome do método/handler
    if (this.dangerousOperations.some(op => 
      handlerName.toLowerCase().includes(op.toLowerCase())
    )) {
      this.logger.error(`Blocked dangerous operation in production: ${classNameStr}.${handlerName}`, {
        url,
        method,
        ip: request.ip,
        userAgent: request.get('User-Agent')
      });
      
      throw new ForbiddenException(
        'This operation is not allowed in production environment'
      );
    }
    
    // Verificar URL
    if (this.dangerousOperations.some(op => 
      url.toLowerCase().includes(op.toLowerCase())
    )) {
      this.logger.error(`Blocked dangerous URL in production: ${url}`, {
        method,
        ip: request.ip,
        userAgent: request.get('User-Agent')
      });
      
      throw new ForbiddenException(
        'This endpoint is not available in production environment'
      );
    }
  }
  
  private checkOperationSafety(
    request: Request,
    handler: Function,
    className: Function
  ) {
    const handlerName = handler.name;
    const classNameStr = className.name;
    
    // Verificar se é uma operação que requer autorização especial
    const requiresSpecialAuth = this.dangerousOperations.some(op => 
      handlerName.toLowerCase().includes(op.toLowerCase()) ||
      request.url.toLowerCase().includes(op.toLowerCase())
    );
    
    if (requiresSpecialAuth) {
      // Verificar se há token de autorização especial
      const specialToken = request.headers['x-database-operation-token'];
      const expectedToken = this.configService.get('DATABASE_OPERATION_TOKEN');
      
      if (!specialToken || specialToken !== expectedToken) {
        this.logger.warn(`Unauthorized database operation attempt: ${classNameStr}.${handlerName}`, {
          url: request.url,
          method: request.method,
          ip: request.ip,
          userAgent: request.get('User-Agent'),
          hasSpecialToken: !!specialToken
        });
        
        throw new ForbiddenException(
          'Special authorization required for this database operation'
        );
      }
    }
  }
  
  private logSensitiveOperation(
    request: Request,
    handler: Function,
    className: Function
  ) {
    const handlerName = handler.name;
    const classNameStr = className.name;
    
    // Log operações que envolvem múltiplos registros
    const massOperationKeywords = ['many', 'all', 'bulk', 'batch'];
    const isMassOperation = massOperationKeywords.some(keyword => 
      handlerName.toLowerCase().includes(keyword) ||
      request.url.toLowerCase().includes(keyword)
    );
    
    if (isMassOperation) {
      this.logger.warn(`Mass operation detected: ${classNameStr}.${handlerName}`, {
        url: request.url,
        method: request.method,
        ip: request.ip,
        userAgent: request.get('User-Agent'),
        timestamp: new Date().toISOString()
      });
    }
    
    // Log operações administrativas
    const adminKeywords = ['admin', 'manage', 'control', 'system'];
    const isAdminOperation = adminKeywords.some(keyword => 
      classNameStr.toLowerCase().includes(keyword) ||
      request.url.toLowerCase().includes(keyword)
    );
    
    if (isAdminOperation) {
      this.logger.log(`Admin operation: ${classNameStr}.${handlerName}`, {
        url: request.url,
        method: request.method,
        ip: request.ip,
        timestamp: new Date().toISOString()
      });
    }
  }
}