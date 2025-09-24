import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as ping from 'ping';
import * as os from 'os';
import { promisify } from 'util';
import { exec } from 'child_process';
import * as net from 'net';
import * as dgram from 'dgram';
import NodeCache from 'node-cache';

const execAsync = promisify(exec);

export interface DiscoveredDevice {
  ip: string;
  hostname?: string;
  mac?: string;
  vendor?: string;
  os?: {
    name: string;
    version?: string;
    family: 'Windows' | 'Linux' | 'macOS' | 'iOS' | 'Android' | 'Unknown';
  };
  deviceType: 'router' | 'switch' | 'computer' | 'mobile' | 'iot' | 'printer' | 'camera' | 'unknown';
  openPorts: PortInfo[];
  services: ServiceInfo[];
  lastSeen: Date;
  firstSeen: Date;
  status: 'online' | 'offline' | 'unreachable';
  responseTime: number;
  reliability: number; // 0-100%
  security: {
    vulnerabilities: string[];
    openServices: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  };
}

export interface PortInfo {
  port: number;
  protocol: 'tcp' | 'udp';
  state: 'open' | 'closed' | 'filtered';
  service?: string;
  version?: string;
  banner?: string;
}

export interface ServiceInfo {
  name: string;
  port: number;
  protocol: 'tcp' | 'udp';
  version?: string;
  description?: string;
  vendor?: string;
  cpe?: string; // Common Platform Enumeration
}

export interface NetworkRange {
  network: string;
  cidr: number;
  gateway?: string;
  broadcast?: string;
  totalHosts: number;
  activeHosts: number;
}

export interface DiscoveryOptions {
  range?: string; // e.g., '192.168.1.0/24'
  timeout?: number;
  maxConcurrent?: number;
  portScan?: boolean;
  serviceScan?: boolean;
  osScan?: boolean;
  aggressive?: boolean;
}

@Injectable()
export class NetworkDiscoveryService {
  private readonly logger = new Logger(NetworkDiscoveryService.name);
  private readonly cache = new NodeCache({ stdTTL: 600 }); // 10 minutos
  private discoveredDevices = new Map<string, DiscoveredDevice>();
  private scanInProgress = false;
  private readonly commonPorts = [
    21, 22, 23, 25, 53, 80, 110, 143, 443, 993, 995, // Serviços comuns
    135, 139, 445, 3389, // Windows
    548, 631, 5353, // macOS
    1433, 3306, 5432, 6379, 27017, // Bancos de dados
    8080, 8443, 9000, 9090 // Serviços web alternativos
  ];

  constructor(private configService: ConfigService) {
    this.startPeriodicDiscovery();
  }

  /**
   * Iniciar descoberta periódica
   */
  private startPeriodicDiscovery(): void {
    const interval = this.configService.get<number>('NETWORK_DISCOVERY_INTERVAL', 300000); // 5 minutos
    
    setInterval(async () => {
      if (!this.scanInProgress) {
        try {
          await this.discoverNetwork();
        } catch (error) {
          this.logger.error('Erro na descoberta periódica:', error);
        }
      }
    }, interval);

    this.logger.log(`Descoberta periódica iniciada (intervalo: ${interval}ms)`);
  }

  /**
   * Descobrir dispositivos na rede
   */
  async discoverNetwork(options: DiscoveryOptions = {}): Promise<DiscoveredDevice[]> {
    if (this.scanInProgress) {
      this.logger.warn('Scan já em progresso, aguardando...');
      return Array.from(this.discoveredDevices.values());
    }

    this.scanInProgress = true;
    const startTime = Date.now();
    
    try {
      this.logger.log('Iniciando descoberta de rede...');
      
      // Determinar range de rede
      const networkRange = options.range || await this.detectNetworkRange();
      this.logger.debug(`Escaneando range: ${networkRange}`);
      
      // Descobrir hosts ativos
      const activeHosts = await this.scanActiveHosts(networkRange, options);
      this.logger.log(`Encontrados ${activeHosts.length} hosts ativos`);
      
      // Coletar informações detalhadas para cada host
      const devices = await this.gatherDeviceInfo(activeHosts, options);
      
      // Atualizar cache de dispositivos
      this.updateDeviceCache(devices);
      
      const duration = Date.now() - startTime;
      this.logger.log(`Descoberta concluída em ${duration}ms - ${devices.length} dispositivos`);
      
      return devices;
      
    } finally {
      this.scanInProgress = false;
    }
  }

  /**
   * Detectar range da rede local
   */
  private async detectNetworkRange(): Promise<string> {
    try {
      const interfaces = os.networkInterfaces();
      
      for (const [name, addrs] of Object.entries(interfaces)) {
        if (!addrs) continue;
        
        for (const addr of addrs) {
          if (addr.family === 'IPv4' && !addr.internal && addr.address.startsWith('192.168.')) {
            // Assumir /24 para redes 192.168.x.x
            const network = addr.address.substring(0, addr.address.lastIndexOf('.')) + '.0';
            return `${network}/24`;
          }
        }
      }
      
      // Fallback para range comum
      return '192.168.1.0/24';
      
    } catch (error) {
      this.logger.warn('Erro ao detectar range de rede:', error.message);
      return '192.168.1.0/24';
    }
  }

  /**
   * Escanear hosts ativos no range
   */
  private async scanActiveHosts(range: string, options: DiscoveryOptions): Promise<string[]> {
    const [network, cidr] = range.split('/');
    const [a, b, c, d] = network.split('.').map(Number);
    const hosts: string[] = [];
    const maxConcurrent = options.maxConcurrent || 50;
    const timeout = options.timeout || 3000;
    
    // Gerar lista de IPs para escanear
    const ipsToScan: string[] = [];
    if (parseInt(cidr) === 24) {
      for (let i = 1; i < 255; i++) {
        ipsToScan.push(`${a}.${b}.${c}.${i}`);
      }
    }
    
    // Escanear em lotes
    const batches = this.chunkArray(ipsToScan, maxConcurrent);
    
    for (const batch of batches) {
      const promises = batch.map(ip => this.pingHost(ip, timeout));
      const results = await Promise.allSettled(promises);
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.alive) {
          hosts.push(batch[index]);
        }
      });
    }
    
    return hosts;
  }

  /**
   * Fazer ping em um host
   */
  private async pingHost(ip: string, timeout: number = 3000): Promise<{ alive: boolean; time?: number }> {
    try {
      const result = await ping.promise.probe(ip, {
        timeout: timeout / 1000,
        extra: ['-c', '1']
      });
      
      const timeValue = result.time !== 'unknown' && typeof result.time === 'string' ? parseFloat(result.time) : result.time;
      return {
        alive: result.alive,
        time: typeof timeValue === 'number' && !isNaN(timeValue) ? timeValue : undefined
      };
    } catch (error) {
      return { alive: false };
    }
  }

  /**
   * Coletar informações detalhadas dos dispositivos
   */
  private async gatherDeviceInfo(hosts: string[], options: DiscoveryOptions): Promise<DiscoveredDevice[]> {
    const devices: DiscoveredDevice[] = [];
    const maxConcurrent = Math.min(options.maxConcurrent || 10, 10); // Limitar para não sobrecarregar
    
    const batches = this.chunkArray(hosts, maxConcurrent);
    
    for (const batch of batches) {
      const promises = batch.map(ip => this.analyzeDevice(ip, options));
      const results = await Promise.allSettled(promises);
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          devices.push(result.value);
        } else {
          this.logger.warn(`Falha ao analisar ${batch[index]}:`, 
            result.status === 'rejected' ? result.reason : 'Resultado vazio');
        }
      });
    }
    
    return devices;
  }

  /**
   * Analisar um dispositivo específico
   */
  private async analyzeDevice(ip: string, options: DiscoveryOptions): Promise<DiscoveredDevice | null> {
    try {
      const startTime = Date.now();
      
      // Informações básicas
      const pingResult = await this.pingHost(ip);
      if (!pingResult.alive) {
        return null;
      }
      
      const device: DiscoveredDevice = {
        ip,
        deviceType: 'unknown',
        openPorts: [],
        services: [],
        lastSeen: new Date(),
        firstSeen: new Date(),
        status: 'online',
        responseTime: pingResult.time || 0,
        reliability: 100,
        security: {
          vulnerabilities: [],
          openServices: 0,
          riskLevel: 'low'
        }
      };
      
      // Resolver hostname
      device.hostname = await this.resolveHostname(ip);
      
      // Obter MAC address (se possível)
      device.mac = await this.getMacAddress(ip);
      
      // Identificar vendor pelo MAC
      if (device.mac) {
        device.vendor = await this.identifyVendor(device.mac);
      }
      
      // Scan de portas se habilitado
      if (options.portScan !== false) {
        device.openPorts = await this.scanPorts(ip, options.aggressive ? this.commonPorts : this.commonPorts.slice(0, 10));
        device.security.openServices = device.openPorts.length;
      }
      
      // Identificar serviços
      if (options.serviceScan !== false && device.openPorts.length > 0) {
        device.services = await this.identifyServices(ip, device.openPorts);
      }
      
      // Detectar OS
      if (options.osScan !== false) {
        device.os = await this.detectOS(ip, device.openPorts);
      }
      
      // Classificar tipo de dispositivo
      device.deviceType = this.classifyDevice(device);
      
      // Avaliar segurança
      device.security = this.assessSecurity(device);
      
      // Verificar se é um dispositivo conhecido
      const existing = this.discoveredDevices.get(ip);
      if (existing) {
        device.firstSeen = existing.firstSeen;
        device.reliability = this.calculateReliability(existing, device);
      }
      
      return device;
      
    } catch (error) {
      this.logger.error(`Erro ao analisar dispositivo ${ip}:`, error);
      return null;
    }
  }

  /**
   * Resolver hostname de um IP
   */
  private async resolveHostname(ip: string): Promise<string | undefined> {
    try {
      const dns = require('dns').promises;
      const result = await dns.reverse(ip);
      return result[0];
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Obter MAC address (funciona apenas na rede local)
   */
  private async getMacAddress(ip: string): Promise<string | undefined> {
    try {
      if (process.platform === 'win32') {
        const { stdout } = await execAsync(`arp -a ${ip}`);
        const match = stdout.match(/([0-9a-f]{2}[:-]){5}[0-9a-f]{2}/i);
        return match ? match[0].replace(/-/g, ':').toLowerCase() : undefined;
      } else {
        const { stdout } = await execAsync(`arp -n ${ip}`);
        const lines = stdout.split('\n');
        for (const line of lines) {
          if (line.includes(ip)) {
            const match = line.match(/([0-9a-f]{2}:){5}[0-9a-f]{2}/i);
            return match ? match[0].toLowerCase() : undefined;
          }
        }
      }
    } catch (error) {
      // ARP pode falhar se o dispositivo não estiver na tabela
    }
    return undefined;
  }

  /**
   * Identificar vendor pelo MAC address
   */
  private async identifyVendor(mac: string): Promise<string | undefined> {
    try {
      // OUI (Organizationally Unique Identifier) lookup
      const oui = mac.substring(0, 8).replace(/:/g, '').toUpperCase();
      
      // Database básico de vendors comuns
      const vendors: Record<string, string> = {
        '00:50:56': 'VMware',
        '08:00:27': 'VirtualBox',
        '00:0C:29': 'VMware',
        '00:1B:21': 'Intel',
        '00:23:24': 'Apple',
        '28:CF:E9': 'Apple',
        'F0:18:98': 'Apple',
        '00:26:BB': 'Apple',
        '3C:07:54': 'Apple',
        '00:1F:F3': 'Apple'
      };
      
      return vendors[oui];
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Escanear portas de um host
   */
  private async scanPorts(ip: string, ports: number[]): Promise<PortInfo[]> {
    const openPorts: PortInfo[] = [];
    const timeout = 3000;
    
    // Escanear TCP ports
    const tcpPromises = ports.map(port => this.scanTcpPort(ip, port, timeout));
    const tcpResults = await Promise.allSettled(tcpPromises);
    
    tcpResults.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.open) {
        openPorts.push({
          port: ports[index],
          protocol: 'tcp',
          state: 'open',
          banner: result.value.banner
        });
      }
    });
    
    return openPorts;
  }

  /**
   * Escanear uma porta TCP específica
   */
  private async scanTcpPort(ip: string, port: number, timeout: number): Promise<{ open: boolean; banner?: string }> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      let banner = '';
      
      const timer = setTimeout(() => {
        socket.destroy();
        resolve({ open: false });
      }, timeout);
      
      socket.connect(port, ip, () => {
        clearTimeout(timer);
        
        // Tentar capturar banner
        socket.setTimeout(1000);
        socket.on('data', (data) => {
          banner = data.toString().trim();
          socket.destroy();
          resolve({ open: true, banner: banner || undefined });
        });
        
        socket.on('timeout', () => {
          socket.destroy();
          resolve({ open: true });
        });
      });
      
      socket.on('error', () => {
        clearTimeout(timer);
        resolve({ open: false });
      });
    });
  }

  /**
   * Identificar serviços nas portas abertas
   */
  private async identifyServices(ip: string, ports: PortInfo[]): Promise<ServiceInfo[]> {
    const services: ServiceInfo[] = [];
    
    // Database de serviços comuns
    const serviceMap: Record<number, { name: string; description: string }> = {
      21: { name: 'FTP', description: 'File Transfer Protocol' },
      22: { name: 'SSH', description: 'Secure Shell' },
      23: { name: 'Telnet', description: 'Telnet Protocol' },
      25: { name: 'SMTP', description: 'Simple Mail Transfer Protocol' },
      53: { name: 'DNS', description: 'Domain Name System' },
      80: { name: 'HTTP', description: 'Hypertext Transfer Protocol' },
      110: { name: 'POP3', description: 'Post Office Protocol v3' },
      143: { name: 'IMAP', description: 'Internet Message Access Protocol' },
      443: { name: 'HTTPS', description: 'HTTP Secure' },
      993: { name: 'IMAPS', description: 'IMAP Secure' },
      995: { name: 'POP3S', description: 'POP3 Secure' },
      135: { name: 'RPC', description: 'Microsoft RPC' },
      139: { name: 'NetBIOS', description: 'NetBIOS Session Service' },
      445: { name: 'SMB', description: 'Server Message Block' },
      3389: { name: 'RDP', description: 'Remote Desktop Protocol' },
      1433: { name: 'MSSQL', description: 'Microsoft SQL Server' },
      3306: { name: 'MySQL', description: 'MySQL Database' },
      5432: { name: 'PostgreSQL', description: 'PostgreSQL Database' },
      6379: { name: 'Redis', description: 'Redis Database' },
      27017: { name: 'MongoDB', description: 'MongoDB Database' }
    };
    
    for (const port of ports) {
      const serviceInfo = serviceMap[port.port];
      if (serviceInfo) {
        services.push({
          name: serviceInfo.name,
          port: port.port,
          protocol: port.protocol,
          description: serviceInfo.description,
          version: this.extractVersionFromBanner(port.banner)
        });
      }
    }
    
    return services;
  }

  /**
   * Extrair versão do banner do serviço
   */
  private extractVersionFromBanner(banner?: string): string | undefined {
    if (!banner) return undefined;
    
    // Padrões comuns de versão
    const patterns = [
      /version\s+([\d\.]+)/i,
      /v([\d\.]+)/i,
      /([\d\.]+)/
    ];
    
    for (const pattern of patterns) {
      const match = banner.match(pattern);
      if (match) {
        return match[1];
      }
    }
    
    return undefined;
  }

  /**
   * Detectar sistema operacional
   */
  private async detectOS(ip: string, ports: PortInfo[]): Promise<DiscoveredDevice['os'] | undefined> {
    // Heurísticas simples baseadas em portas abertas
    const portNumbers = ports.map(p => p.port);
    
    if (portNumbers.includes(3389) || portNumbers.includes(135) || portNumbers.includes(445)) {
      return { name: 'Windows', family: 'Windows' };
    }
    
    if (portNumbers.includes(22) && !portNumbers.includes(3389)) {
      return { name: 'Linux', family: 'Linux' };
    }
    
    if (portNumbers.includes(548) || portNumbers.includes(5353)) {
      return { name: 'macOS', family: 'macOS' };
    }
    
    return { name: 'Unknown', family: 'Unknown' };
  }

  /**
   * Classificar tipo de dispositivo
   */
  private classifyDevice(device: DiscoveredDevice): DiscoveredDevice['deviceType'] {
    const ports = device.openPorts.map(p => p.port);
    const services = device.services.map(s => s.name.toLowerCase());
    
    // Router/Gateway
    if (device.ip.endsWith('.1') && (ports.includes(80) || ports.includes(443))) {
      return 'router';
    }
    
    // Printer
    if (ports.includes(631) || ports.includes(9100)) {
      return 'printer';
    }
    
    // Camera/IoT
    if (ports.includes(554) || ports.includes(8080)) {
      return 'camera';
    }
    
    // Computer/Server
    if (ports.includes(22) || ports.includes(3389) || services.includes('ssh') || services.includes('rdp')) {
      return 'computer';
    }
    
    // Mobile (difícil de detectar, baseado em padrões)
    if (device.vendor && ['Apple', 'Samsung'].includes(device.vendor)) {
      return 'mobile';
    }
    
    return 'unknown';
  }

  /**
   * Avaliar segurança do dispositivo
   */
  private assessSecurity(device: DiscoveredDevice): DiscoveredDevice['security'] {
    const vulnerabilities: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    
    // Verificar serviços inseguros
    const insecureServices = ['telnet', 'ftp', 'http'];
    const deviceServices = device.services.map(s => s.name.toLowerCase());
    
    for (const service of insecureServices) {
      if (deviceServices.includes(service)) {
        vulnerabilities.push(`Serviço inseguro: ${service}`);
        riskLevel = 'medium';
      }
    }
    
    // Muitas portas abertas
    if (device.openPorts.length > 10) {
      vulnerabilities.push('Muitas portas abertas');
      riskLevel = 'high';
    }
    
    // Serviços de administração expostos
    const adminPorts = [22, 23, 3389, 5900];
    const hasAdminPorts = device.openPorts.some(p => adminPorts.includes(p.port));
    if (hasAdminPorts) {
      vulnerabilities.push('Serviços de administração expostos');
      if (riskLevel === 'low') riskLevel = 'medium';
    }
    
    return {
      vulnerabilities,
      openServices: device.openPorts.length,
      riskLevel
    };
  }

  /**
   * Calcular confiabilidade do dispositivo
   */
  private calculateReliability(existing: DiscoveredDevice, current: DiscoveredDevice): number {
    // Baseado na consistência das informações ao longo do tempo
    let reliability = existing.reliability;
    
    // Se o dispositivo respondeu, aumentar confiabilidade
    if (current.status === 'online') {
      reliability = Math.min(100, reliability + 5);
    } else {
      reliability = Math.max(0, reliability - 10);
    }
    
    return reliability;
  }

  /**
   * Atualizar cache de dispositivos
   */
  private updateDeviceCache(devices: DiscoveredDevice[]): void {
    for (const device of devices) {
      this.discoveredDevices.set(device.ip, device);
    }
    
    // Marcar dispositivos não encontrados como offline
    const currentIps = new Set(devices.map(d => d.ip));
    for (const [ip, device] of this.discoveredDevices.entries()) {
      if (!currentIps.has(ip)) {
        device.status = 'offline';
        device.reliability = Math.max(0, device.reliability - 20);
      }
    }
    
    // Cache para API
    this.cache.set('discovered_devices', Array.from(this.discoveredDevices.values()));
  }

  /**
   * Utilitário para dividir array em chunks
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Obter dispositivos descobertos
   */
  getDiscoveredDevices(): DiscoveredDevice[] {
    return this.cache.get<DiscoveredDevice[]>('discovered_devices') || [];
  }

  /**
   * Obter dispositivo específico
   */
  getDevice(ip: string): DiscoveredDevice | undefined {
    return this.discoveredDevices.get(ip);
  }

  /**
   * Forçar scan de um dispositivo específico
   */
  async scanDevice(ip: string, options: DiscoveryOptions = {}): Promise<DiscoveredDevice | null> {
    return await this.analyzeDevice(ip, { ...options, portScan: true, serviceScan: true, osScan: true });
  }

  /**
   * Obter estatísticas da descoberta
   */
  getDiscoveryStats(): {
    totalDevices: number;
    onlineDevices: number;
    deviceTypes: Record<string, number>;
    securityRisks: Record<string, number>;
    lastScan: Date | null;
  } {
    const devices = this.getDiscoveredDevices();
    const deviceTypes: Record<string, number> = {};
    const securityRisks: Record<string, number> = {};
    
    let onlineDevices = 0;
    
    for (const device of devices) {
      if (device.status === 'online') onlineDevices++;
      
      deviceTypes[device.deviceType] = (deviceTypes[device.deviceType] || 0) + 1;
      securityRisks[device.security.riskLevel] = (securityRisks[device.security.riskLevel] || 0) + 1;
    }
    
    return {
      totalDevices: devices.length,
      onlineDevices,
      deviceTypes,
      securityRisks,
      lastScan: devices.length > 0 ? new Date(Math.max(...devices.map(d => d.lastSeen.getTime()))) : null
    };
  }
}