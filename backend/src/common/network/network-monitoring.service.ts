import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as ping from 'ping';
import * as os from 'os';
import * as fs from 'fs';
import { promisify } from 'util';
import { exec } from 'child_process';
import NodeCache from 'node-cache';

const execAsync = promisify(exec);

export interface NetworkMetrics {
  timestamp: Date;
  latency: {
    min: number;
    max: number;
    avg: number;
    jitter: number;
  };
  throughput: {
    download: number; // Mbps
    upload: number;   // Mbps
  };
  packetLoss: number; // Percentage
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  networkLoad: {
    cpu: number;
    memory: number;
    bandwidth: number;
  };
  activeConnections: number;
  dnsResolutionTime: number;
  sslHandshakeTime: number;
}

export interface NetworkDevice {
  ip: string;
  hostname?: string;
  mac?: string;
  vendor?: string;
  os?: string;
  openPorts: number[];
  services: NetworkService[];
  lastSeen: Date;
  status: 'online' | 'offline' | 'unreachable';
  responseTime: number;
  reliability: number; // 0-100%
}

export interface NetworkService {
  port: number;
  protocol: 'tcp' | 'udp';
  service: string;
  version?: string;
  banner?: string;
}

export interface NetworkAnomaly {
  id: string;
  type: 'latency_spike' | 'packet_loss' | 'bandwidth_drop' | 'new_device' | 'port_scan' | 'dos_attack';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  timestamp: Date;
  affectedDevices: string[];
  metrics: Partial<NetworkMetrics>;
  resolved: boolean;
}

export interface NetworkTopology {
  gateway: string;
  subnet: string;
  devices: NetworkDevice[];
  connections: NetworkConnection[];
  lastScanned: Date;
}

export interface NetworkConnection {
  source: string;
  destination: string;
  protocol: string;
  port: number;
  state: 'established' | 'listening' | 'closed';
  bandwidth: number;
}

@Injectable()
export class NetworkMonitoringService {
  private readonly logger = new Logger(NetworkMonitoringService.name);
  private readonly cache = new NodeCache({ stdTTL: 300 });
  private monitoringInterval?: NodeJS.Timeout;
  private baselineMetrics: NetworkMetrics[] = [];
  private anomalies: NetworkAnomaly[] = [];
  private networkTopology?: NetworkTopology;

  constructor(private configService: ConfigService) {
    this.startContinuousMonitoring();
  }

  /**
   * Iniciar monitoramento contínuo
   */
  private startContinuousMonitoring(): void {
    const interval = this.configService.get<number>('NETWORK_MONITORING_INTERVAL', 30000);
    
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.collectNetworkMetrics();
        await this.detectAnomalies();
        await this.updateNetworkTopology();
      } catch (error) {
        this.logger.error('Erro no monitoramento contínuo:', error);
      }
    }, interval);

    this.logger.log(`Monitoramento contínuo iniciado (intervalo: ${interval}ms)`);
  }

  /**
   * Coletar métricas de rede abrangentes
   */
  async collectNetworkMetrics(targets: string[] = ['8.8.8.8', '1.1.1.1']): Promise<NetworkMetrics> {
    const startTime = Date.now();
    
    try {
      // Coletar latência e packet loss
      const latencyResults = await this.measureLatency(targets);
      
      // Coletar throughput
      const throughputResults = await this.measureThroughput();
      
      // Coletar carga do sistema
      const systemLoad = await this.getSystemLoad();
      
      // Coletar informações de conexões
      const connectionInfo = await this.getConnectionInfo();
      
      // Medir tempo de resolução DNS
      const dnsTime = await this.measureDnsResolution('google.com');
      
      // Medir tempo de handshake SSL
      const sslTime = await this.measureSslHandshake('https://google.com');
      
      const metrics: NetworkMetrics = {
        timestamp: new Date(),
        latency: latencyResults,
        throughput: throughputResults,
        packetLoss: latencyResults.packetLoss || 0,
        connectionQuality: this.calculateConnectionQuality(latencyResults, throughputResults),
        networkLoad: systemLoad,
        activeConnections: connectionInfo.active,
        dnsResolutionTime: dnsTime,
        sslHandshakeTime: sslTime
      };
      
      // Armazenar para baseline
      this.baselineMetrics.push(metrics);
      if (this.baselineMetrics.length > 100) {
        this.baselineMetrics.shift();
      }
      
      // Cache das métricas
      this.cache.set('latest_metrics', metrics);
      
      this.logger.debug(`Métricas coletadas em ${Date.now() - startTime}ms`);
      return metrics;
      
    } catch (error) {
      this.logger.error('Erro ao coletar métricas:', error);
      throw error;
    }
  }

  /**
   * Medir latência para múltiplos alvos
   */
  private async measureLatency(targets: string[]): Promise<{
    min: number;
    max: number;
    avg: number;
    jitter: number;
    packetLoss?: number;
  }> {
    const results = [];
    let totalPacketLoss = 0;
    
    for (const target of targets) {
      try {
        const pingResults = [];
        
        // Fazer 5 pings para cada alvo
        for (let i = 0; i < 5; i++) {
          const result = await ping.promise.probe(target, {
            timeout: 5,
            extra: ['-c', '1']
          });
          
          if (result.alive && result.time !== 'unknown') {
            const timeValue = typeof result.time === 'string' ? parseFloat(result.time) : result.time;
            if (typeof timeValue === 'number' && !isNaN(timeValue)) {
              pingResults.push(timeValue);
            }
          } else {
            totalPacketLoss += 20; // 20% por ping perdido
          }
        }
        
        if (pingResults.length > 0) {
          results.push(...pingResults);
        }
        
      } catch (error) {
        this.logger.warn(`Erro ao fazer ping para ${target}:`, error.message);
        totalPacketLoss += 100; // 100% de perda para este alvo
      }
    }
    
    if (results.length === 0) {
      return { min: 0, max: 0, avg: 0, jitter: 0, packetLoss: 100 };
    }
    
    const min = Math.min(...results);
    const max = Math.max(...results);
    const avg = results.reduce((a, b) => a + b, 0) / results.length;
    
    // Calcular jitter (variação da latência)
    const jitter = results.length > 1 ? 
      Math.sqrt(results.reduce((sum, time) => sum + Math.pow(time - avg, 2), 0) / results.length) : 0;
    
    const packetLoss = totalPacketLoss / (targets.length * 5);
    
    return { min, max, avg, jitter, packetLoss };
  }

  /**
   * Medir throughput da rede
   */
  private async measureThroughput(): Promise<{ download: number; upload: number }> {
    try {
      // Usar speedtest-cli se disponível
      const { stdout } = await execAsync('speedtest-cli --json', { timeout: 30000 });
      const result = JSON.parse(stdout);
      
      return {
        download: (result.download / 1000000) * 8, // Converter para Mbps
        upload: (result.upload / 1000000) * 8
      };
    } catch (error) {
      // Fallback: medir throughput básico
      return await this.measureBasicThroughput();
    }
  }

  /**
   * Medição básica de throughput
   */
  private async measureBasicThroughput(): Promise<{ download: number; upload: number }> {
    try {
      const testUrl = 'https://httpbin.org/bytes/1048576'; // 1MB
      const startTime = Date.now();
      
      const response = await fetch(testUrl);
      const data = await response.arrayBuffer();
      
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000; // segundos
      const sizeInMB = data.byteLength / (1024 * 1024);
      const downloadSpeed = (sizeInMB * 8) / duration; // Mbps
      
      // Upload test seria mais complexo, retornando estimativa
      const uploadSpeed = downloadSpeed * 0.1; // Estimativa conservadora
      
      return {
        download: downloadSpeed,
        upload: uploadSpeed
      };
    } catch (error) {
      this.logger.warn('Erro na medição de throughput:', error.message);
      return { download: 0, upload: 0 };
    }
  }

  /**
   * Obter carga do sistema
   */
  private async getSystemLoad(): Promise<{ cpu: number; memory: number; bandwidth: number }> {
    const cpuUsage = os.loadavg()[0] / os.cpus().length * 100;
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const memoryUsage = ((totalMem - freeMem) / totalMem) * 100;
    
    // Bandwidth usage seria mais complexo de medir, usando estimativa
    const bandwidthUsage = Math.random() * 30; // Placeholder
    
    return {
      cpu: Math.min(cpuUsage, 100),
      memory: memoryUsage,
      bandwidth: bandwidthUsage
    };
  }

  /**
   * Obter informações de conexões ativas
   */
  private async getConnectionInfo(): Promise<{ active: number; listening: number }> {
    try {
      if (process.platform === 'win32') {
        const { stdout } = await execAsync('netstat -an');
        const lines = stdout.split('\n');
        
        let active = 0;
        let listening = 0;
        
        for (const line of lines) {
          if (line.includes('ESTABLISHED')) active++;
          if (line.includes('LISTENING')) listening++;
        }
        
        return { active, listening };
      } else {
        const { stdout } = await execAsync('ss -tuln');
        const lines = stdout.split('\n');
        
        return {
          active: lines.filter(line => line.includes('ESTAB')).length,
          listening: lines.filter(line => line.includes('LISTEN')).length
        };
      }
    } catch (error) {
      this.logger.warn('Erro ao obter informações de conexão:', error.message);
      return { active: 0, listening: 0 };
    }
  }

  /**
   * Medir tempo de resolução DNS
   */
  private async measureDnsResolution(hostname: string): Promise<number> {
    const startTime = Date.now();
    
    try {
      const dns = require('dns').promises;
      await dns.lookup(hostname);
      return Date.now() - startTime;
    } catch (error) {
      return -1; // Erro na resolução
    }
  }

  /**
   * Medir tempo de handshake SSL
   */
  private async measureSslHandshake(url: string): Promise<number> {
    const startTime = Date.now();
    
    try {
      const https = require('https');
      const urlObj = new URL(url);
      
      return new Promise((resolve) => {
        const req = https.request({
          hostname: urlObj.hostname,
          port: 443,
          method: 'HEAD',
          timeout: 5000
        }, () => {
          resolve(Date.now() - startTime);
        });
        
        req.on('error', () => resolve(-1));
        req.on('timeout', () => resolve(-1));
        req.end();
      });
    } catch (error) {
      return -1;
    }
  }

  /**
   * Calcular qualidade da conexão
   */
  private calculateConnectionQuality(
    latency: { avg: number; jitter: number; packetLoss?: number },
    throughput: { download: number; upload: number }
  ): 'excellent' | 'good' | 'fair' | 'poor' | 'critical' {
    const packetLoss = latency.packetLoss || 0;
    
    // Critérios para qualidade
    if (latency.avg < 20 && packetLoss < 0.1 && throughput.download > 100) {
      return 'excellent';
    } else if (latency.avg < 50 && packetLoss < 0.5 && throughput.download > 50) {
      return 'good';
    } else if (latency.avg < 100 && packetLoss < 1 && throughput.download > 25) {
      return 'fair';
    } else if (latency.avg < 200 && packetLoss < 3 && throughput.download > 10) {
      return 'poor';
    } else {
      return 'critical';
    }
  }

  /**
   * Detectar anomalias na rede
   */
  private async detectAnomalies(): Promise<NetworkAnomaly[]> {
    if (this.baselineMetrics.length < 10) {
      return []; // Não há dados suficientes para baseline
    }
    
    const currentMetrics = this.cache.get<NetworkMetrics>('latest_metrics');
    if (!currentMetrics) return [];
    
    const newAnomalies: NetworkAnomaly[] = [];
    
    // Calcular médias da baseline
    const avgLatency = this.baselineMetrics.reduce((sum, m) => sum + m.latency.avg, 0) / this.baselineMetrics.length;
    const avgThroughput = this.baselineMetrics.reduce((sum, m) => sum + m.throughput.download, 0) / this.baselineMetrics.length;
    const avgPacketLoss = this.baselineMetrics.reduce((sum, m) => sum + m.packetLoss, 0) / this.baselineMetrics.length;
    
    // Detectar pico de latência
    if (currentMetrics.latency.avg > avgLatency * 2) {
      newAnomalies.push({
        id: `latency_${Date.now()}`,
        type: 'latency_spike',
        severity: currentMetrics.latency.avg > avgLatency * 3 ? 'high' : 'medium',
        description: `Pico de latência detectado: ${currentMetrics.latency.avg.toFixed(2)}ms (baseline: ${avgLatency.toFixed(2)}ms)`,
        timestamp: new Date(),
        affectedDevices: [],
        metrics: { latency: currentMetrics.latency },
        resolved: false
      });
    }
    
    // Detectar queda de throughput
    if (currentMetrics.throughput.download < avgThroughput * 0.5) {
      newAnomalies.push({
        id: `bandwidth_${Date.now()}`,
        type: 'bandwidth_drop',
        severity: currentMetrics.throughput.download < avgThroughput * 0.3 ? 'high' : 'medium',
        description: `Queda de throughput detectada: ${currentMetrics.throughput.download.toFixed(2)}Mbps (baseline: ${avgThroughput.toFixed(2)}Mbps)`,
        timestamp: new Date(),
        affectedDevices: [],
        metrics: { throughput: currentMetrics.throughput },
        resolved: false
      });
    }
    
    // Detectar packet loss elevado
    if (currentMetrics.packetLoss > avgPacketLoss + 2) {
      newAnomalies.push({
        id: `packet_loss_${Date.now()}`,
        type: 'packet_loss',
        severity: currentMetrics.packetLoss > 5 ? 'critical' : 'high',
        description: `Packet loss elevado: ${currentMetrics.packetLoss.toFixed(2)}% (baseline: ${avgPacketLoss.toFixed(2)}%)`,
        timestamp: new Date(),
        affectedDevices: [],
        metrics: { packetLoss: currentMetrics.packetLoss },
        resolved: false
      });
    }
    
    // Adicionar novas anomalias
    this.anomalies.push(...newAnomalies);
    
    // Limitar histórico de anomalias
    if (this.anomalies.length > 1000) {
      this.anomalies = this.anomalies.slice(-1000);
    }
    
    return newAnomalies;
  }

  /**
   * Atualizar topologia da rede
   */
  private async updateNetworkTopology(): Promise<void> {
    try {
      // Esta seria uma implementação mais complexa
      // Por agora, apenas um placeholder
      this.networkTopology = {
        gateway: '192.168.1.1',
        subnet: '192.168.1.0/24',
        devices: [],
        connections: [],
        lastScanned: new Date()
      };
    } catch (error) {
      this.logger.error('Erro ao atualizar topologia:', error);
    }
  }

  /**
   * Obter métricas atuais
   */
  getCurrentMetrics(): NetworkMetrics | null {
    return this.cache.get<NetworkMetrics>('latest_metrics') || null;
  }

  /**
   * Obter anomalias recentes
   */
  getRecentAnomalies(hours: number = 24): NetworkAnomaly[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.anomalies.filter(anomaly => anomaly.timestamp > cutoff);
  }

  /**
   * Obter histórico de métricas
   */
  getMetricsHistory(): NetworkMetrics[] {
    return [...this.baselineMetrics];
  }

  /**
   * Resolver anomalia
   */
  resolveAnomaly(anomalyId: string): boolean {
    const anomaly = this.anomalies.find(a => a.id === anomalyId);
    if (anomaly) {
      anomaly.resolved = true;
      return true;
    }
    return false;
  }

  /**
   * Cleanup ao destruir o serviço
   */
  onModuleDestroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    this.logger.log('NetworkMonitoringService finalizado');
  }
}