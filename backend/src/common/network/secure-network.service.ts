import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as https from 'https';
import * as http2 from 'http2';
import WebSocket from 'ws';
import * as tls from 'tls';
import * as fs from 'fs';
import * as path from 'path';
import NodeCache from 'node-cache';
import Redis from 'ioredis';

export interface SecureConnectionOptions {
  protocol: 'https' | 'http2' | 'wss';
  host: string;
  port: number;
  timeout?: number;
  retries?: number;
  tlsVersion?: 'TLSv1.2' | 'TLSv1.3';
  cipherSuites?: string[];
  compression?: boolean;
  keepAlive?: boolean;
  poolSize?: number;
}

export interface NetworkResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
  headers?: Record<string, string>;
  responseTime?: number;
  timing: {
    dns?: number;
    tcp?: number;
    tls?: number;
    request?: number;
    total: number;
  };
}

export interface ConnectionPool {
  protocol: string;
  host: string;
  port: number;
  connections: any[];
  activeConnections: number;
  maxConnections: number;
  created: Date;
  lastUsed: Date;
}

@Injectable()
export class SecureNetworkService {
  private readonly logger = new Logger(SecureNetworkService.name);
  private readonly cache: NodeCache;
  private redis?: Redis;
  private connectionPools = new Map<string, ConnectionPool>();
  private readonly defaultTlsOptions: tls.SecureContextOptions;

  constructor(private configService: ConfigService) {
    // Configurar cache local
    this.cache = new NodeCache({
      stdTTL: 300, // 5 minutos
      checkperiod: 60, // Verificar expiração a cada minuto
      useClones: false
    });

    // Configurar Redis se disponível
    this.initializeRedis();

    // Configurações TLS seguras
    this.defaultTlsOptions = {
      minVersion: 'TLSv1.2',
      maxVersion: 'TLSv1.3',
      ciphers: [
        'ECDHE-RSA-AES256-GCM-SHA384',
        'ECDHE-RSA-AES128-GCM-SHA256',
        'ECDHE-RSA-AES256-SHA384',
        'ECDHE-RSA-AES128-SHA256',
        'AES256-GCM-SHA384',
        'AES128-GCM-SHA256'
      ].join(':'),
      honorCipherOrder: true,
      secureProtocol: 'TLS_method'
    };
  }

  private async initializeRedis(): Promise<void> {
    try {
      const redisUrl = this.configService.get<string>('REDIS_URL');
      if (redisUrl) {
        this.redis = new Redis(redisUrl, {
          enableReadyCheck: false,
          maxRetriesPerRequest: 3,
          lazyConnect: true,
          tls: redisUrl.startsWith('rediss://') ? {} : undefined
        });
        
        await this.redis.connect();
        this.logger.log('Redis conectado com sucesso');
      }
    } catch (error) {
      this.logger.warn('Redis não disponível, usando cache local', error.message);
    }
  }

  /**
   * Realizar requisição segura (alias para secureHttpsRequest)
   */
  async makeSecureRequest<T = any>(
    options: {
      url: string;
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
      headers?: Record<string, string>;
      body?: any;
      timeout?: number;
      retries?: number;
      cache?: boolean;
      cacheTTL?: number;
      compression?: boolean;
    }
  ): Promise<NetworkResponse<T>> {
    const { url, ...requestOptions } = options;
    return this.secureHttpsRequest<T>(url, requestOptions);
  }

  /**
   * Realizar requisição HTTP/2 segura
   */
  async makeHttp2Request<T = any>(
    options: {
      url: string;
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
      headers?: Record<string, string>;
      body?: any;
      timeout?: number;
    }
  ): Promise<NetworkResponse<T>> {
    const { url, ...requestOptions } = options;
    return await this.executeHttpsRequest<T>(url, requestOptions, Date.now());
  }

  /**
   * Realizar requisição HTTPS segura com retry e cache
   */
  async secureHttpsRequest<T = any>(
    url: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
      headers?: Record<string, string>;
      body?: any;
      timeout?: number;
      retries?: number;
      cache?: boolean;
      cacheTTL?: number;
    } = {}
  ): Promise<NetworkResponse<T>> {
    const startTime = Date.now();
    const cacheKey = `https:${url}:${JSON.stringify(options)}`;
    
    // Verificar cache
    if (options.cache !== false) {
      const cached = await this.getFromCache<NetworkResponse<T>>(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit para ${url}`);
        return cached;
      }
    }

    const maxRetries = options.retries || 3;
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.executeHttpsRequest<T>(url, options, startTime);
        
        // Salvar no cache se bem-sucedido
        if (response.success && options.cache !== false) {
          await this.setCache(cacheKey, response, options.cacheTTL || 300);
        }
        
        return response;
      } catch (error) {
        lastError = error;
        this.logger.warn(`Tentativa ${attempt + 1} falhou para ${url}:`, error.message);
        
        if (attempt < maxRetries) {
          // Backoff exponencial
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          await this.sleep(delay);
        }
      }
    }

    return {
      success: false,
      error: `Falha após ${maxRetries + 1} tentativas: ${lastError.message}`,
      timing: { total: Date.now() - startTime }
    };
  }

  private async executeHttpsRequest<T>(
    url: string,
    options: any,
    startTime: number
  ): Promise<NetworkResponse<T>> {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const isSecure = urlObj.protocol === 'https:';
      
      const requestOptions: https.RequestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || (isSecure ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: options.method || 'GET',
        headers: {
          'User-Agent': 'CyberLens/1.0',
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          ...options.headers
        },
        timeout: options.timeout || 30000,
        ...this.defaultTlsOptions
      };

      if (options.body) {
        const bodyStr = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
        requestOptions.headers['Content-Length'] = Buffer.byteLength(bodyStr);
        if (!requestOptions.headers['Content-Type']) {
          requestOptions.headers['Content-Type'] = 'application/json';
        }
      }

      const client = isSecure ? https : require('http');
      const req = client.request(requestOptions, (res) => {
        let data = '';
        const timing = {
          dns: 0,
          tcp: 0,
          tls: 0,
          request: Date.now() - startTime,
          total: 0
        };

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          timing.total = Date.now() - startTime;
          
          try {
            const parsedData = data ? JSON.parse(data) : null;
            resolve({
              success: res.statusCode >= 200 && res.statusCode < 300,
              data: parsedData,
              statusCode: res.statusCode,
              headers: res.headers as Record<string, string>,
              timing
            });
          } catch (parseError) {
            resolve({
              success: res.statusCode >= 200 && res.statusCode < 300,
              data: data as any,
              statusCode: res.statusCode,
              headers: res.headers as Record<string, string>,
              timing
            });
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Erro de requisição: ${error.message}`));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Timeout da requisição'));
      });

      if (options.body) {
        const bodyStr = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
        req.write(bodyStr);
      }

      req.end();
    });
  }

  /**
   * Criar conexão HTTP/2 segura
   */
  async createHttp2Session(url: string, options: SecureConnectionOptions = {} as any): Promise<http2.ClientHttp2Session> {
    const urlObj = new URL(url);
    const sessionOptions = {
      ...this.defaultTlsOptions,
      timeout: options.timeout || 30000,
      settings: {
        enablePush: false,
        initialWindowSize: 65535,
        maxFrameSize: 16384
      }
    };

    return new Promise((resolve, reject) => {
      const session = http2.connect(url, sessionOptions);
      
      session.on('connect', () => {
        this.logger.debug(`Sessão HTTP/2 estabelecida com ${urlObj.hostname}`);
        resolve(session);
      });

      session.on('error', (error) => {
        this.logger.error(`Erro na sessão HTTP/2 com ${urlObj.hostname}:`, error);
        reject(error);
      });

      // Timeout de conexão
      setTimeout(() => {
        if (!session.destroyed) {
          session.destroy();
          reject(new Error('Timeout na conexão HTTP/2'));
        }
      }, options.timeout || 30000);
    });
  }

  /**
   * Criar WebSocket seguro
   */
  async createSecureWebSocket(
    url: string,
    options: SecureConnectionOptions & { protocols?: string[] } = {} as any
  ): Promise<WebSocket> {
    const wsOptions = {
      ...this.defaultTlsOptions,
      handshakeTimeout: options.timeout || 30000,
      protocols: options.protocols,
      headers: {
        'User-Agent': 'CyberLens/1.0'
      }
    };

    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url, wsOptions);
      
      ws.on('open', () => {
        this.logger.debug(`WebSocket seguro conectado: ${url}`);
        resolve(ws);
      });

      ws.on('error', (error) => {
        this.logger.error(`Erro no WebSocket: ${url}`, error);
        reject(error);
      });

      // Timeout de conexão
      setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          ws.terminate();
          reject(new Error('Timeout na conexão WebSocket'));
        }
      }, options.timeout || 30000);
    });
  }

  /**
   * Gerenciar pool de conexões
   */
  private getConnectionPool(protocol: string, host: string, port: number): ConnectionPool {
    const key = `${protocol}://${host}:${port}`;
    
    if (!this.connectionPools.has(key)) {
      this.connectionPools.set(key, {
        protocol,
        host,
        port,
        connections: [],
        activeConnections: 0,
        maxConnections: 10,
        created: new Date(),
        lastUsed: new Date()
      });
    }
    
    const pool = this.connectionPools.get(key);
    pool.lastUsed = new Date();
    return pool;
  }

  /**
   * Cache helpers
   */
  private async getFromCache<T>(key: string): Promise<T | null> {
    try {
      // Tentar Redis primeiro
      if (this.redis) {
        const cached = await this.redis.get(key);
        if (cached) {
          return JSON.parse(cached);
        }
      }
      
      // Fallback para cache local
      return this.cache.get<T>(key) || null;
    } catch (error) {
      this.logger.warn('Erro ao acessar cache:', error.message);
      return null;
    }
  }

  private async setCache(key: string, value: any, ttl: number = 300): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      
      // Salvar no Redis se disponível
      if (this.redis) {
        await this.redis.setex(key, ttl, serialized);
      }
      
      // Salvar no cache local
      this.cache.set(key, value, ttl);
    } catch (error) {
      this.logger.warn('Erro ao salvar no cache:', error.message);
    }
  }

  /**
   * Utilitários
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Limpar pools de conexão inativos
   */
  cleanupConnectionPools(): void {
    const now = new Date();
    const maxAge = 5 * 60 * 1000; // 5 minutos
    
    for (const [key, pool] of this.connectionPools.entries()) {
      if (now.getTime() - pool.lastUsed.getTime() > maxAge) {
        // Fechar conexões do pool
        pool.connections.forEach(conn => {
          if (conn && typeof conn.destroy === 'function') {
            conn.destroy();
          }
        });
        
        this.connectionPools.delete(key);
        this.logger.debug(`Pool de conexão removido: ${key}`);
      }
    }
  }

  /**
   * Obter estatísticas das conexões
   */
  getConnectionStats(): {
    pools: number;
    totalConnections: number;
    activeConnections: number;
    cacheSize: number;
  } {
    let totalConnections = 0;
    let activeConnections = 0;
    
    for (const pool of this.connectionPools.values()) {
      totalConnections += pool.connections.length;
      activeConnections += pool.activeConnections;
    }
    
    return {
      pools: this.connectionPools.size,
      totalConnections,
      activeConnections,
      cacheSize: this.cache.keys().length
    };
  }

  /**
   * Cleanup ao destruir o serviço
   */
  async onModuleDestroy(): Promise<void> {
    // Limpar pools de conexão
    this.cleanupConnectionPools();
    
    // Fechar Redis
    if (this.redis) {
      await this.redis.quit();
    }
    
    // Limpar cache
    this.cache.flushAll();
    
    this.logger.log('SecureNetworkService finalizado');
  }
}