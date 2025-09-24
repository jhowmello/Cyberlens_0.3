import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import NodeCache from 'node-cache';
import Redis from 'ioredis';

export interface RateLimitRule {
  id: string;
  name: string;
  pattern: string; // IP pattern, user ID, etc.
  windowMs: number; // Janela de tempo em ms
  maxRequests: number; // Máximo de requests na janela
  blockDurationMs?: number; // Tempo de bloqueio após exceder limite
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: any) => string;
  onLimitReached?: (req: any, rateLimitInfo: RateLimitInfo) => void;
  whitelist?: string[]; // IPs ou padrões em whitelist
  blacklist?: string[]; // IPs ou padrões em blacklist
  enabled: boolean;
  priority: number; // Prioridade da regra (menor número = maior prioridade)
}

export interface RateLimitInfo {
  totalHits: number;
  totalHitsInWindow: number;
  remainingPoints: number;
  msBeforeNext: number;
  isBlocked: boolean;
  blockExpiresAt?: Date;
  rule: RateLimitRule;
}

export interface RateLimitStats {
  totalRequests: number;
  blockedRequests: number;
  activeBlocks: number;
  topBlockedIPs: Array<{ ip: string; blocks: number; lastBlock: Date }>;
  ruleStats: Array<{ ruleId: string; hits: number; blocks: number }>;
  averageResponseTime: number;
}

export interface AdaptiveRateLimitConfig {
  enabled: boolean;
  baseLimit: number;
  maxLimit: number;
  minLimit: number;
  adjustmentFactor: number; // 0.1 = 10% adjustment
  monitoringWindow: number; // ms
  errorThreshold: number; // % de erros para reduzir limite
  successThreshold: number; // % de sucesso para aumentar limite
}

export interface DDoSProtectionConfig {
  enabled: boolean;
  suspiciousThreshold: number; // requests/second
  attackThreshold: number; // requests/second
  blockDuration: number; // ms
  autoBlock: boolean;
  notifyOnAttack: boolean;
}

@Injectable()
export class RateLimitingService {
  private readonly logger = new Logger(RateLimitingService.name);
  private readonly cache = new NodeCache({ stdTTL: 3600 }); // 1 hora
  private redis: Redis | null = null;
  private rules = new Map<string, RateLimitRule>();
  private stats: RateLimitStats = {
    totalRequests: 0,
    blockedRequests: 0,
    activeBlocks: 0,
    topBlockedIPs: [],
    ruleStats: [],
    averageResponseTime: 0
  };
  private adaptiveConfig: AdaptiveRateLimitConfig;
  private ddosConfig: DDoSProtectionConfig;
  private requestTimes = new Map<string, number[]>();

  constructor(private configService: ConfigService) {
    this.initializeRedis();
    this.loadDefaultRules();
    this.loadConfigurations();
    this.startStatsCollection();
    this.startAdaptiveAdjustment();
  }

  /**
   * Inicializar conexão Redis
   */
  private async initializeRedis(): Promise<void> {
    try {
      const redisUrl = this.configService.get<string>('REDIS_URL');
      if (redisUrl) {
        this.redis = new Redis(redisUrl);
        this.logger.log('Redis conectado para rate limiting');
      } else {
        this.logger.warn('Redis não configurado, usando cache local');
      }
    } catch (error) {
      this.logger.error('Erro ao conectar Redis:', error);
    }
  }

  /**
   * Carregar regras padrão
   */
  private loadDefaultRules(): void {
    const defaultRules: RateLimitRule[] = [
      {
        id: 'global',
        name: 'Global Rate Limit',
        pattern: '*',
        windowMs: 60000, // 1 minuto
        maxRequests: 100,
        blockDurationMs: 300000, // 5 minutos
        enabled: true,
        priority: 100
      },
      {
        id: 'api',
        name: 'API Rate Limit',
        pattern: '/api/*',
        windowMs: 60000,
        maxRequests: 60,
        blockDurationMs: 600000, // 10 minutos
        enabled: true,
        priority: 50
      },
      {
        id: 'auth',
        name: 'Authentication Rate Limit',
        pattern: '/auth/*',
        windowMs: 300000, // 5 minutos
        maxRequests: 5,
        blockDurationMs: 900000, // 15 minutos
        enabled: true,
        priority: 10
      },
      {
        id: 'upload',
        name: 'Upload Rate Limit',
        pattern: '/upload/*',
        windowMs: 3600000, // 1 hora
        maxRequests: 10,
        blockDurationMs: 1800000, // 30 minutos
        enabled: true,
        priority: 20
      },
      {
        id: 'ddos-protection',
        name: 'DDoS Protection',
        pattern: '*',
        windowMs: 1000, // 1 segundo
        maxRequests: 10,
        blockDurationMs: 3600000, // 1 hora
        enabled: true,
        priority: 1
      }
    ];

    for (const rule of defaultRules) {
      this.rules.set(rule.id, rule);
    }

    this.logger.log(`${defaultRules.length} regras de rate limiting carregadas`);
  }

  /**
   * Carregar configurações
   */
  private loadConfigurations(): void {
    this.adaptiveConfig = {
      enabled: this.configService.get<boolean>('ADAPTIVE_RATE_LIMIT_ENABLED', true),
      baseLimit: this.configService.get<number>('ADAPTIVE_BASE_LIMIT', 100),
      maxLimit: this.configService.get<number>('ADAPTIVE_MAX_LIMIT', 1000),
      minLimit: this.configService.get<number>('ADAPTIVE_MIN_LIMIT', 10),
      adjustmentFactor: this.configService.get<number>('ADAPTIVE_ADJUSTMENT_FACTOR', 0.1),
      monitoringWindow: this.configService.get<number>('ADAPTIVE_MONITORING_WINDOW', 300000),
      errorThreshold: this.configService.get<number>('ADAPTIVE_ERROR_THRESHOLD', 10),
      successThreshold: this.configService.get<number>('ADAPTIVE_SUCCESS_THRESHOLD', 95)
    };

    this.ddosConfig = {
      enabled: this.configService.get<boolean>('DDOS_PROTECTION_ENABLED', true),
      suspiciousThreshold: this.configService.get<number>('DDOS_SUSPICIOUS_THRESHOLD', 50),
      attackThreshold: this.configService.get<number>('DDOS_ATTACK_THRESHOLD', 100),
      blockDuration: this.configService.get<number>('DDOS_BLOCK_DURATION', 3600000),
      autoBlock: this.configService.get<boolean>('DDOS_AUTO_BLOCK', true),
      notifyOnAttack: this.configService.get<boolean>('DDOS_NOTIFY_ON_ATTACK', true)
    };
  }

  /**
   * Verificar rate limit para uma requisição
   */
  async checkRateLimit(key: string, path: string, ip: string): Promise<RateLimitInfo> {
    const startTime = Date.now();
    this.stats.totalRequests++;

    try {
      // Encontrar regras aplicáveis
      const applicableRules = this.getApplicableRules(path, ip);
      
      // Verificar cada regra (ordem de prioridade)
      for (const rule of applicableRules) {
        const rateLimitInfo = await this.checkRule(key, rule, ip);
        
        if (rateLimitInfo.isBlocked) {
          this.stats.blockedRequests++;
          this.updateBlockedIPStats(ip);
          this.updateRuleStats(rule.id, false);
          
          // Verificar se é um possível ataque DDoS
          if (this.ddosConfig.enabled) {
            await this.checkDDoSPattern(ip);
          }
          
          return rateLimitInfo;
        }
      }

      // Se chegou aqui, não foi bloqueado
      const defaultRule = this.rules.get('global')!;
      const rateLimitInfo = await this.checkRule(key, defaultRule, ip);
      
      this.updateRuleStats(defaultRule.id, true);
      this.recordRequestTime(ip, Date.now() - startTime);
      
      return rateLimitInfo;
      
    } catch (error) {
      this.logger.error('Erro ao verificar rate limit:', error);
      
      // Em caso de erro, permitir a requisição mas logar
      return {
        totalHits: 0,
        totalHitsInWindow: 0,
        remainingPoints: 1,
        msBeforeNext: 0,
        isBlocked: false,
        rule: this.rules.get('global')!
      };
    }
  }

  /**
   * Obter regras aplicáveis para um path e IP
   */
  private getApplicableRules(path: string, ip: string): RateLimitRule[] {
    const rules: RateLimitRule[] = [];
    
    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;
      
      // Verificar whitelist
      if (rule.whitelist && this.matchesPatterns(ip, rule.whitelist)) {
        continue;
      }
      
      // Verificar blacklist
      if (rule.blacklist && this.matchesPatterns(ip, rule.blacklist)) {
        rules.push(rule);
        continue;
      }
      
      // Verificar padrão de path
      if (this.matchesPattern(path, rule.pattern)) {
        rules.push(rule);
      }
    }
    
    // Ordenar por prioridade (menor número = maior prioridade)
    return rules.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Verificar se um valor corresponde a um padrão
   */
  private matchesPattern(value: string, pattern: string): boolean {
    if (pattern === '*') return true;
    
    // Converter padrão para regex
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    
    const regex = new RegExp(`^${regexPattern}$`, 'i');
    return regex.test(value);
  }

  /**
   * Verificar se um valor corresponde a algum dos padrões
   */
  private matchesPatterns(value: string, patterns: string[]): boolean {
    return patterns.some(pattern => this.matchesPattern(value, pattern));
  }

  /**
   * Verificar regra específica
   */
  private async checkRule(key: string, rule: RateLimitRule, ip: string): Promise<RateLimitInfo> {
    const ruleKey = `${rule.id}:${key}`;
    const now = Date.now();
    const windowStart = now - rule.windowMs;
    
    // Verificar se está bloqueado
    const blockKey = `block:${ruleKey}`;
    const blockInfo = await this.getFromStorage(blockKey);
    
    if (blockInfo && blockInfo.expiresAt > now) {
      return {
        totalHits: blockInfo.totalHits || 0,
        totalHitsInWindow: rule.maxRequests,
        remainingPoints: 0,
        msBeforeNext: blockInfo.expiresAt - now,
        isBlocked: true,
        blockExpiresAt: new Date(blockInfo.expiresAt),
        rule
      };
    }
    
    // Obter histórico de requests
    const requestHistory = await this.getFromStorage(ruleKey) || { requests: [], totalHits: 0 };
    
    // Filtrar requests dentro da janela
    const requestsInWindow = requestHistory.requests.filter((timestamp: number) => timestamp > windowStart);
    
    // Adicionar request atual
    requestsInWindow.push(now);
    requestHistory.totalHits = (requestHistory.totalHits || 0) + 1;
    
    // Verificar se excedeu o limite
    if (requestsInWindow.length > rule.maxRequests) {
      // Bloquear se configurado
      if (rule.blockDurationMs) {
        const blockExpiresAt = now + rule.blockDurationMs;
        await this.setInStorage(blockKey, {
          expiresAt: blockExpiresAt,
          totalHits: requestHistory.totalHits
        }, rule.blockDurationMs);
        
        // Callback se configurado
        if (rule.onLimitReached) {
          rule.onLimitReached({ ip, path: key }, {
            totalHits: requestHistory.totalHits,
            totalHitsInWindow: requestsInWindow.length,
            remainingPoints: 0,
            msBeforeNext: rule.blockDurationMs,
            isBlocked: true,
            blockExpiresAt: new Date(blockExpiresAt),
            rule
          });
        }
      }
      
      return {
        totalHits: requestHistory.totalHits,
        totalHitsInWindow: requestsInWindow.length,
        remainingPoints: 0,
        msBeforeNext: rule.blockDurationMs || rule.windowMs,
        isBlocked: true,
        rule
      };
    }
    
    // Salvar histórico atualizado
    requestHistory.requests = requestsInWindow;
    await this.setInStorage(ruleKey, requestHistory, rule.windowMs);
    
    return {
      totalHits: requestHistory.totalHits,
      totalHitsInWindow: requestsInWindow.length,
      remainingPoints: rule.maxRequests - requestsInWindow.length,
      msBeforeNext: rule.windowMs - (now - Math.min(...requestsInWindow)),
      isBlocked: false,
      rule
    };
  }

  /**
   * Verificar padrão de DDoS
   */
  private async checkDDoSPattern(ip: string): Promise<void> {
    const now = Date.now();
    const windowStart = now - 1000; // 1 segundo
    
    // Obter requests do IP na última janela
    const requestTimes = this.requestTimes.get(ip) || [];
    const recentRequests = requestTimes.filter(time => time > windowStart);
    
    if (recentRequests.length > this.ddosConfig.suspiciousThreshold) {
      this.logger.warn(`Atividade suspeita detectada do IP ${ip}: ${recentRequests.length} requests/segundo`);
      
      if (recentRequests.length > this.ddosConfig.attackThreshold) {
        this.logger.error(`Possível ataque DDoS detectado do IP ${ip}: ${recentRequests.length} requests/segundo`);
        
        if (this.ddosConfig.autoBlock) {
          await this.blockIP(ip, this.ddosConfig.blockDuration, 'DDoS Protection');
        }
        
        if (this.ddosConfig.notifyOnAttack) {
          // Aqui você pode implementar notificação (email, webhook, etc.)
          this.logger.error(`ALERTA: Ataque DDoS em andamento do IP ${ip}`);
        }
      }
    }
  }

  /**
   * Bloquear IP específico
   */
  async blockIP(ip: string, durationMs: number, reason: string): Promise<void> {
    const blockKey = `ip_block:${ip}`;
    const expiresAt = Date.now() + durationMs;
    
    await this.setInStorage(blockKey, {
      ip,
      reason,
      blockedAt: new Date(),
      expiresAt,
      duration: durationMs
    }, durationMs);
    
    this.logger.warn(`IP ${ip} bloqueado por ${durationMs}ms. Motivo: ${reason}`);
  }

  /**
   * Desbloquear IP específico
   */
  async unblockIP(ip: string): Promise<void> {
    const blockKey = `ip_block:${ip}`;
    await this.removeFromStorage(blockKey);
    this.logger.log(`IP ${ip} desbloqueado manualmente`);
  }

  /**
   * Verificar se IP está bloqueado
   */
  async isIPBlocked(ip: string): Promise<boolean> {
    const blockKey = `ip_block:${ip}`;
    const blockInfo = await this.getFromStorage(blockKey);
    return blockInfo && blockInfo.expiresAt > Date.now();
  }

  /**
   * Armazenar dados (Redis ou cache local)
   */
  private async setInStorage(key: string, value: any, ttlMs?: number): Promise<void> {
    if (this.redis) {
      const ttlSeconds = ttlMs ? Math.ceil(ttlMs / 1000) : undefined;
      if (ttlSeconds) {
        await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
      } else {
        await this.redis.set(key, JSON.stringify(value));
      }
    } else {
      const ttlSeconds = ttlMs ? Math.ceil(ttlMs / 1000) : 3600;
      this.cache.set(key, value, ttlSeconds);
    }
  }

  /**
   * Obter dados do armazenamento
   */
  private async getFromStorage(key: string): Promise<any> {
    if (this.redis) {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } else {
      return this.cache.get(key) || null;
    }
  }

  /**
   * Remover dados do armazenamento
   */
  private async removeFromStorage(key: string): Promise<void> {
    if (this.redis) {
      await this.redis.del(key);
    } else {
      this.cache.del(key);
    }
  }

  /**
   * Atualizar estatísticas de IPs bloqueados
   */
  private updateBlockedIPStats(ip: string): void {
    const existing = this.stats.topBlockedIPs.find(item => item.ip === ip);
    
    if (existing) {
      existing.blocks++;
      existing.lastBlock = new Date();
    } else {
      this.stats.topBlockedIPs.push({
        ip,
        blocks: 1,
        lastBlock: new Date()
      });
    }
    
    // Manter apenas top 10
    this.stats.topBlockedIPs.sort((a, b) => b.blocks - a.blocks);
    this.stats.topBlockedIPs = this.stats.topBlockedIPs.slice(0, 10);
  }

  /**
   * Atualizar estatísticas de regras
   */
  private updateRuleStats(ruleId: string, success: boolean): void {
    let ruleStat = this.stats.ruleStats.find(stat => stat.ruleId === ruleId);
    
    if (!ruleStat) {
      ruleStat = { ruleId, hits: 0, blocks: 0 };
      this.stats.ruleStats.push(ruleStat);
    }
    
    ruleStat.hits++;
    if (!success) {
      ruleStat.blocks++;
    }
  }

  /**
   * Registrar tempo de resposta
   */
  private recordRequestTime(ip: string, responseTime: number): void {
    const times = this.requestTimes.get(ip) || [];
    times.push(Date.now());
    
    // Manter apenas últimos 100 requests por IP
    if (times.length > 100) {
      times.shift();
    }
    
    this.requestTimes.set(ip, times);
    
    // Atualizar média global
    const totalTime = this.stats.averageResponseTime * (this.stats.totalRequests - 1) + responseTime;
    this.stats.averageResponseTime = totalTime / this.stats.totalRequests;
  }

  /**
   * Iniciar coleta de estatísticas
   */
  private startStatsCollection(): void {
    setInterval(() => {
      this.collectStats();
    }, 60000); // A cada minuto
  }

  /**
   * Coletar estatísticas
   */
  private async collectStats(): Promise<void> {
    try {
      // Contar bloqueios ativos
      let activeBlocks = 0;
      
      if (this.redis) {
        const blockKeys = await this.redis.keys('block:*');
        const ipBlockKeys = await this.redis.keys('ip_block:*');
        activeBlocks = blockKeys.length + ipBlockKeys.length;
      } else {
        // Para cache local, seria necessário iterar sobre as chaves
        activeBlocks = this.cache.keys().filter(key => key.startsWith('block:') || key.startsWith('ip_block:')).length;
      }
      
      this.stats.activeBlocks = activeBlocks;
      
    } catch (error) {
      this.logger.error('Erro ao coletar estatísticas:', error);
    }
  }

  /**
   * Iniciar ajuste adaptativo
   */
  private startAdaptiveAdjustment(): void {
    if (!this.adaptiveConfig.enabled) return;
    
    setInterval(() => {
      this.adjustRateLimits();
    }, this.adaptiveConfig.monitoringWindow);
  }

  /**
   * Ajustar limites adaptativamente
   */
  private adjustRateLimits(): void {
    try {
      const errorRate = (this.stats.blockedRequests / this.stats.totalRequests) * 100;
      const successRate = 100 - errorRate;
      
      for (const rule of this.rules.values()) {
        if (rule.id === 'ddos-protection') continue; // Não ajustar regra de DDoS
        
        let adjustment = 0;
        
        if (errorRate > this.adaptiveConfig.errorThreshold) {
          // Muitos erros, reduzir limite
          adjustment = -Math.ceil(rule.maxRequests * this.adaptiveConfig.adjustmentFactor);
        } else if (successRate > this.adaptiveConfig.successThreshold) {
          // Alta taxa de sucesso, aumentar limite
          adjustment = Math.ceil(rule.maxRequests * this.adaptiveConfig.adjustmentFactor);
        }
        
        if (adjustment !== 0) {
          const newLimit = Math.max(
            this.adaptiveConfig.minLimit,
            Math.min(this.adaptiveConfig.maxLimit, rule.maxRequests + adjustment)
          );
          
          if (newLimit !== rule.maxRequests) {
            this.logger.log(`Ajustando limite da regra ${rule.id}: ${rule.maxRequests} -> ${newLimit}`);
            rule.maxRequests = newLimit;
          }
        }
      }
      
      // Reset stats para próximo período
      this.stats.totalRequests = 0;
      this.stats.blockedRequests = 0;
      
    } catch (error) {
      this.logger.error('Erro no ajuste adaptativo:', error);
    }
  }

  /**
   * Adicionar nova regra
   */
  addRule(rule: RateLimitRule): void {
    this.rules.set(rule.id, rule);
    this.logger.log(`Nova regra adicionada: ${rule.name}`);
  }

  /**
   * Remover regra
   */
  removeRule(ruleId: string): boolean {
    const removed = this.rules.delete(ruleId);
    if (removed) {
      this.logger.log(`Regra removida: ${ruleId}`);
    }
    return removed;
  }

  /**
   * Atualizar regra
   */
  updateRule(ruleId: string, updates: Partial<RateLimitRule>): boolean {
    const rule = this.rules.get(ruleId);
    if (rule) {
      Object.assign(rule, updates);
      this.logger.log(`Regra atualizada: ${ruleId}`);
      return true;
    }
    return false;
  }

  /**
   * Obter todas as regras
   */
  getRules(): RateLimitRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Obter regra específica
   */
  getRule(ruleId: string): RateLimitRule | undefined {
    return this.rules.get(ruleId);
  }

  /**
   * Obter estatísticas
   */
  getStats(): RateLimitStats {
    return { ...this.stats };
  }

  /**
   * Resetar estatísticas
   */
  resetStats(): void {
    this.stats = {
      totalRequests: 0,
      blockedRequests: 0,
      activeBlocks: 0,
      topBlockedIPs: [],
      ruleStats: [],
      averageResponseTime: 0
    };
    this.requestTimes.clear();
    this.logger.log('Estatísticas resetadas');
  }

  /**
   * Limpar todos os bloqueios
   */
  async clearAllBlocks(): Promise<void> {
    try {
      if (this.redis) {
        const blockKeys = await this.redis.keys('block:*');
        const ipBlockKeys = await this.redis.keys('ip_block:*');
        const allKeys = [...blockKeys, ...ipBlockKeys];
        
        if (allKeys.length > 0) {
          await this.redis.del(...allKeys);
        }
      } else {
        const keysToDelete = this.cache.keys().filter(key => 
          key.startsWith('block:') || key.startsWith('ip_block:')
        );
        
        for (const key of keysToDelete) {
          this.cache.del(key);
        }
      }
      
      this.logger.log('Todos os bloqueios foram removidos');
    } catch (error) {
      this.logger.error('Erro ao limpar bloqueios:', error);
    }
  }

  /**
   * Obter configuração adaptativa
   */
  getAdaptiveConfig(): AdaptiveRateLimitConfig {
    return { ...this.adaptiveConfig };
  }

  /**
   * Atualizar configuração adaptativa
   */
  updateAdaptiveConfig(config: Partial<AdaptiveRateLimitConfig>): void {
    Object.assign(this.adaptiveConfig, config);
    this.logger.log('Configuração adaptativa atualizada');
  }

  /**
   * Obter configuração DDoS
   */
  getDDoSConfig(): DDoSProtectionConfig {
    return { ...this.ddosConfig };
  }

  /**
   * Atualizar configuração DDoS
   */
  updateDDoSConfig(config: Partial<DDoSProtectionConfig>): void {
    Object.assign(this.ddosConfig, config);
    this.logger.log('Configuração DDoS atualizada');
  }
}