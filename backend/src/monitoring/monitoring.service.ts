import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MonitoringService {
  constructor(private prisma: PrismaService) {}

  async getNetworkStats(userId: string, networkId?: string) {
    const where = networkId 
      ? { userId, networkId }
      : { userId };

    return this.prisma.networkMonitoring.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: 100,
    });
  }

  async getDeviceStats(userId: string, deviceId?: string) {
    const where = deviceId 
      ? { userId, deviceId }
      : { userId };

    return this.prisma.deviceMonitoring.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: 100,
    });
  }

  async getAlerts(userId: string) {
    return this.prisma.alert.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async createAlert(data: any, userId: string) {
    return this.prisma.alert.create({
      data: {
        ...data,
        userId,
      },
    });
  }

  async markAlertAsRead(alertId: string, userId: string) {
    return this.prisma.alert.updateMany({
      where: { id: alertId, userId },
      data: { isRead: true },
    });
  }

  async getDevices(userId: string) {
    return this.prisma.device.findMany({
      where: { userId },
      orderBy: { lastSeen: 'desc' },
    });
  }

  async getSystemHealth(userId: string) {
    // Retorna informações básicas de saúde do sistema
    const [totalDevices, activeDevices, totalAlerts] = await Promise.all([
      this.prisma.device.count({ where: { userId } }),
      this.prisma.device.count({ where: { userId, isOnline: true } }),
      this.prisma.alert.count({ where: { userId, isRead: false } }),
    ]);

    return {
      status: 'healthy',
      totalDevices,
      activeDevices,
      totalAlerts,
      uptime: process.uptime(),
      timestamp: new Date(),
    };
  }

  async saveDeviceData(deviceData: any, userId: string) {
    try {
      // Se não há deviceId, gerar um baseado nas informações disponíveis
      let deviceId = deviceData.deviceId;
      if (!deviceId) {
        // Gerar deviceId baseado no tipo e nome do dispositivo
        const deviceType = deviceData.deviceInfo?.type || 'unknown';
        const deviceName = deviceData.deviceInfo?.name || 'Unknown Device';
        deviceId = `${deviceType}-${userId.substring(0, 8)}-${Date.now()}`;
        console.log(`Gerando deviceId: ${deviceId} para dispositivo ${deviceName}`);
      }

      // Verifica se o dispositivo existe, se não, cria um novo
      let device = await this.prisma.device.findFirst({
        where: {
          id: deviceId,
          userId: userId
        }
      });

      if (!device) {
        // Criar dispositivo automaticamente se não existir
        const deviceName = deviceData.deviceInfo?.name || deviceData.deviceName || `Dispositivo ${deviceId}`;
        const deviceTypeRaw = deviceData.deviceInfo?.type || deviceData.deviceType || 'unknown';
        
        // Mapear tipo de dispositivo para o enum DeviceType
        const deviceTypeMap: { [key: string]: string } = {
          'mobile': 'SMARTPHONE',
          'smartphone': 'SMARTPHONE',
          'computer': 'COMPUTER',
          'laptop': 'COMPUTER',
          'tablet': 'TABLET',
          'smart_tv': 'SMART_TV',
          'gaming_console': 'GAMING_CONSOLE',
          'iot_device': 'IOT_DEVICE',
          'router': 'ROUTER',
          'unknown': 'UNKNOWN'
        };
        
        const deviceType = deviceTypeMap[deviceTypeRaw.toLowerCase()] || 'UNKNOWN';
        
        // Primeiro, verificar se existe uma rede para o usuário ou criar uma padrão
        let network = await this.prisma.network.findFirst({
          where: { userId: userId }
        });
        
        if (!network) {
          // Criar rede padrão se não existir
          network = await this.prisma.network.create({
            data: {
              id: `network-${userId.substring(0, 8)}-${Date.now()}`,
              name: 'Rede Principal',
              ssid: 'Default Network',
              userId: userId,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          });
        }
        
        device = await this.prisma.device.create({
          data: {
            id: deviceId,
            userId: userId,
            name: deviceName,
            deviceType: deviceType as any,
            macAddress: deviceData.macAddress || `auto-${deviceId}`,
            ipAddress: deviceData.ipAddress,
            isOnline: true,
            lastSeen: new Date(),
            networkId: network.id,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
      }

      // Salva dados de monitoramento de dispositivo
      return this.prisma.deviceMonitoring.create({
        data: {
          userId,
          deviceId: deviceId,
          cpuUsage: deviceData.cpuUsage || 0,
          memoryUsage: deviceData.memoryUsage || 0,
          temperature: deviceData.temperature || 0,
          signalStrength: deviceData.signalStrength || 0,
          bytesIn: deviceData.bytesIn ? BigInt(deviceData.bytesIn) : BigInt(0),
          bytesOut: deviceData.bytesOut ? BigInt(deviceData.bytesOut) : BigInt(0),
          packetsIn: deviceData.packetsIn || 0,
          packetsOut: deviceData.packetsOut || 0,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      console.error('Erro ao salvar dados de monitoramento:', error);
      // Retornar sucesso mesmo com erro para não quebrar o fluxo
      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  async getDashboardData(userId: string) {
    const [networks, devices, alerts, recentActivity] = await Promise.all([
      this.prisma.network.count({ where: { userId } }),
      this.prisma.device.count({ where: { userId } }),
      this.prisma.alert.count({ where: { userId, isRead: false } }),
      this.prisma.networkMonitoring.findMany({
        where: { userId },
        orderBy: { timestamp: 'desc' },
        take: 10,
      }),
    ]);

    return {
      totalNetworks: networks,
      totalDevices: devices,
      unreadAlerts: alerts,
      recentActivity,
    };
  }
}