import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

export interface AuditLog {
  id?: string;
  timestamp: Date;
  operation: string;
  operationType: 'DATABASE_CLEANUP' | 'MASS_OPERATION' | 'ADMIN_OPERATION' | 'SUSPICIOUS_ACTIVITY';
  userId?: string;
  userEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  details: Record<string, any>;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  environment: string;
  success: boolean;
  errorMessage?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  private readonly auditLogPath: string;
  
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    // Configurar caminho do arquivo de auditoria
    this.auditLogPath = path.join(process.cwd(), 'logs', 'audit.log');
    this.ensureLogDirectory();
  }
  
  /**
   * Registra uma operação perigosa no sistema de auditoria
   */
  async logDangerousOperation(auditData: Omit<AuditLog, 'id' | 'timestamp' | 'environment'>) {
    const logEntry: AuditLog = {
      ...auditData,
      timestamp: new Date(),
      environment: this.configService.get('NODE_ENV', 'development'),
    };
    
    // Log no console/arquivo
    this.logToConsole(logEntry);
    await this.logToFile(logEntry);
    
    // Tentar salvar no banco (se disponível)
    try {
      await this.logToDatabase(logEntry);
    } catch (error) {
      this.logger.warn('Failed to save audit log to database:', error.message);
    }
    
    // Alertas para operações críticas
    if (logEntry.riskLevel === 'critical') {
      await this.sendCriticalAlert(logEntry);
    }
  }
  
  /**
   * Registra tentativa de operação de limpeza do banco
   */
  async logDatabaseCleanupAttempt(
    operation: string,
    success: boolean,
    details: Record<string, any>,
    userInfo?: { userId?: string; userEmail?: string; ipAddress?: string; userAgent?: string },
    errorMessage?: string
  ) {
    await this.logDangerousOperation({
      operation,
      operationType: 'DATABASE_CLEANUP',
      riskLevel: 'critical',
      success,
      details,
      errorMessage,
      ...userInfo,
    });
  }
  
  /**
   * Registra operação em massa
   */
  async logMassOperation(
    operation: string,
    affectedRecords: number,
    success: boolean,
    details: Record<string, any>,
    userInfo?: { userId?: string; userEmail?: string; ipAddress?: string; userAgent?: string },
    errorMessage?: string
  ) {
    await this.logDangerousOperation({
      operation,
      operationType: 'MASS_OPERATION',
      riskLevel: affectedRecords > 1000 ? 'high' : affectedRecords > 100 ? 'medium' : 'low',
      success,
      details: { ...details, affectedRecords },
      errorMessage,
      ...userInfo,
    });
  }
  
  /**
   * Registra atividade suspeita
   */
  async logSuspiciousActivity(
    operation: string,
    reason: string,
    details: Record<string, any>,
    userInfo?: { userId?: string; userEmail?: string; ipAddress?: string; userAgent?: string }
  ) {
    await this.logDangerousOperation({
      operation,
      operationType: 'SUSPICIOUS_ACTIVITY',
      riskLevel: 'high',
      success: false,
      details: { ...details, reason },
      ...userInfo,
    });
  }
  
  /**
   * Obtém logs de auditoria recentes
   */
  async getRecentAuditLogs(limit: number = 100): Promise<AuditLog[]> {
    try {
      // Tentar buscar do banco primeiro
      const logs = await this.prisma.$queryRaw`
        SELECT * FROM audit_logs 
        ORDER BY timestamp DESC 
        LIMIT ${limit}
      ` as AuditLog[];
      
      return logs;
    } catch (error) {
      this.logger.warn('Failed to fetch audit logs from database, reading from file');
      return this.readLogsFromFile(limit);
    }
  }
  
  /**
   * Obtém estatísticas de segurança
   */
  async getSecurityStats(): Promise<{
    totalOperations: number;
    criticalOperations: number;
    failedOperations: number;
    suspiciousActivities: number;
    lastCriticalOperation?: Date;
  }> {
    try {
      const stats = await this.prisma.$queryRaw`
        SELECT 
          COUNT(*) as total_operations,
          COUNT(CASE WHEN risk_level = 'critical' THEN 1 END) as critical_operations,
          COUNT(CASE WHEN success = false THEN 1 END) as failed_operations,
          COUNT(CASE WHEN operation_type = 'SUSPICIOUS_ACTIVITY' THEN 1 END) as suspicious_activities,
          MAX(CASE WHEN risk_level = 'critical' THEN timestamp END) as last_critical_operation
        FROM audit_logs 
        WHERE timestamp >= NOW() - INTERVAL '30 days'
      ` as any[];
      
      const result = stats[0];
      return {
        totalOperations: parseInt(result.total_operations) || 0,
        criticalOperations: parseInt(result.critical_operations) || 0,
        failedOperations: parseInt(result.failed_operations) || 0,
        suspiciousActivities: parseInt(result.suspicious_activities) || 0,
        lastCriticalOperation: result.last_critical_operation,
      };
    } catch (error) {
      this.logger.warn('Failed to get security stats from database');
      return {
        totalOperations: 0,
        criticalOperations: 0,
        failedOperations: 0,
        suspiciousActivities: 0,
      };
    }
  }
  
  private logToConsole(logEntry: AuditLog) {
    const logLevel = this.getLogLevel(logEntry.riskLevel);
    const message = `[AUDIT] ${logEntry.operationType}: ${logEntry.operation}`;
    const context = {
      timestamp: logEntry.timestamp.toISOString(),
      riskLevel: logEntry.riskLevel,
      success: logEntry.success,
      userId: logEntry.userId,
      ipAddress: logEntry.ipAddress,
      details: logEntry.details,
    };
    
    switch (logLevel) {
      case 'error':
        this.logger.error(message, context);
        break;
      case 'warn':
        this.logger.warn(message, context);
        break;
      default:
        this.logger.log(message, context);
    }
  }
  
  private async logToFile(logEntry: AuditLog) {
    try {
      const logLine = JSON.stringify(logEntry) + '\n';
      await fs.promises.appendFile(this.auditLogPath, logLine, 'utf8');
    } catch (error) {
      this.logger.error('Failed to write audit log to file:', error);
    }
  }
  
  private async logToDatabase(logEntry: AuditLog) {
    // Tentar criar a tabela se não existir
    try {
      await this.prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
          timestamp DATETIME NOT NULL,
          operation TEXT NOT NULL,
          operation_type TEXT NOT NULL,
          user_id TEXT,
          user_email TEXT,
          ip_address TEXT,
          user_agent TEXT,
          details TEXT,
          risk_level TEXT NOT NULL,
          environment TEXT NOT NULL,
          success BOOLEAN NOT NULL,
          error_message TEXT
        )
      `;
      
      await this.prisma.$executeRaw`
        INSERT INTO audit_logs (
          timestamp, operation, operation_type, user_id, user_email,
          ip_address, user_agent, details, risk_level, environment,
          success, error_message
        ) VALUES (
          ${logEntry.timestamp},
          ${logEntry.operation},
          ${logEntry.operationType},
          ${logEntry.userId || null},
          ${logEntry.userEmail || null},
          ${logEntry.ipAddress || null},
          ${logEntry.userAgent || null},
          ${JSON.stringify(logEntry.details)},
          ${logEntry.riskLevel},
          ${logEntry.environment},
          ${logEntry.success},
          ${logEntry.errorMessage || null}
        )
      `;
    } catch (error) {
      throw new Error(`Failed to save audit log to database: ${error.message}`);
    }
  }
  
  private async sendCriticalAlert(logEntry: AuditLog) {
    // Implementar alertas críticos (email, webhook, etc.)
    this.logger.error('🚨 CRITICAL SECURITY ALERT 🚨', {
      operation: logEntry.operation,
      timestamp: logEntry.timestamp,
      environment: logEntry.environment,
      userId: logEntry.userId,
      ipAddress: logEntry.ipAddress,
      details: logEntry.details,
    });
    
    // TODO: Implementar notificações por email/webhook
  }
  
  private readLogsFromFile(limit: number): AuditLog[] {
    try {
      const content = fs.readFileSync(this.auditLogPath, 'utf8');
      const lines = content.trim().split('\n').slice(-limit);
      return lines.map(line => JSON.parse(line)).reverse();
    } catch (error) {
      this.logger.warn('Failed to read audit logs from file:', error.message);
      return [];
    }
  }
  
  private ensureLogDirectory() {
    const logDir = path.dirname(this.auditLogPath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }
  
  private getLogLevel(riskLevel: string): 'log' | 'warn' | 'error' {
    switch (riskLevel) {
      case 'critical':
      case 'high':
        return 'error';
      case 'medium':
        return 'warn';
      default:
        return 'log';
    }
  }
}