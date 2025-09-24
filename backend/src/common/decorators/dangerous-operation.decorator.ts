import { SetMetadata } from '@nestjs/common';

export const DANGEROUS_OPERATION_KEY = 'dangerousOperation';

/**
 * Decorator para marcar operações perigosas que podem afetar múltiplos registros
 * ou realizar operações de limpeza no banco de dados.
 * 
 * @param options Opções de configuração da operação perigosa
 */
export const DangerousOperation = (options?: {
  /** Descrição da operação para logs */
  description?: string;
  /** Se true, requer token especial mesmo em desenvolvimento */
  requiresSpecialToken?: boolean;
  /** Se true, é completamente bloqueada em produção */
  blockedInProduction?: boolean;
  /** Nível de risco: 'low', 'medium', 'high', 'critical' */
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
}) => {
  const metadata = {
    description: options?.description || 'Dangerous database operation',
    requiresSpecialToken: options?.requiresSpecialToken || false,
    blockedInProduction: options?.blockedInProduction || true,
    riskLevel: options?.riskLevel || 'high',
  };
  
  return SetMetadata(DANGEROUS_OPERATION_KEY, metadata);
};

/**
 * Decorator específico para operações de limpeza de banco
 */
export const DatabaseCleanup = (description?: string) => 
  DangerousOperation({
    description: description || 'Database cleanup operation',
    requiresSpecialToken: true,
    blockedInProduction: true,
    riskLevel: 'critical'
  });

/**
 * Decorator para operações em massa (que afetam múltiplos registros)
 */
export const MassOperation = (description?: string) => 
  DangerousOperation({
    description: description || 'Mass database operation',
    requiresSpecialToken: false,
    blockedInProduction: false,
    riskLevel: 'medium'
  });

/**
 * Decorator para operações administrativas sensíveis
 */
export const AdminOperation = (description?: string) => 
  DangerousOperation({
    description: description || 'Administrative operation',
    requiresSpecialToken: false,
    blockedInProduction: false,
    riskLevel: 'low'
  });