import { Test, TestingModule } from '@nestjs/testing';
import { MonitoringService } from './monitoring.service';
import { PrismaService } from '../prisma/prisma.service';

describe('MonitoringService', () => {
  let service: MonitoringService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockNetworkStats = [
    {
      id: 'net-stat-1',
      networkId: 'network-1',
      userId: 'user-1',
      timestamp: new Date('2024-01-01T10:00:00Z'),
      bytesIn: 1024000,
      bytesOut: 512000,
      packetsIn: 1500,
      packetsOut: 800,
      activeConnections: 25,
      bandwidth: 100000000, // 100 Mbps
      latency: 15.5,
      packetLoss: 0.1,
      createdAt: new Date('2024-01-01T10:00:00Z'),
      updatedAt: new Date('2024-01-01T10:00:00Z'),
    },
    {
      id: 'net-stat-2',
      networkId: 'network-1',
      userId: 'user-1',
      timestamp: new Date('2024-01-01T09:00:00Z'),
      bytesIn: 950000,
      bytesOut: 480000,
      packetsIn: 1400,
      packetsOut: 750,
      activeConnections: 22,
      bandwidth: 100000000,
      latency: 18.2,
      packetLoss: 0.2,
      createdAt: new Date('2024-01-01T09:00:00Z'),
      updatedAt: new Date('2024-01-01T09:00:00Z'),
    },
  ];

  const mockDeviceStats = [
    {
      id: 'dev-stat-1',
      deviceId: 'device-1',
      userId: 'user-1',
      timestamp: new Date('2024-01-01T10:00:00Z'),
      bytesIn: BigInt(1024000),
      bytesOut: BigInt(1024000),
      packetsIn: 1500,
      packetsOut: 1500,
      cpuUsage: 65.5,
      memoryUsage: 78.2,
      temperature: 42.5,
      signalStrength: -45,
    },
    {
      id: 'dev-stat-2',
      deviceId: 'device-2',
      userId: 'user-1',
      timestamp: new Date('2024-01-01T09:30:00Z'),
      bytesIn: BigInt(0),
      bytesOut: BigInt(0),
      packetsIn: 0,
      packetsOut: 0,
      cpuUsage: null,
      memoryUsage: null,
      temperature: null,
      signalStrength: null,
    },
  ];

  const mockAlerts = [
    {
      id: 'alert-1',
      title: 'High Bandwidth Usage',
      message: 'Network bandwidth usage exceeded 80% threshold',
      alertType: 'NETWORK' as const,
      severity: 'MEDIUM' as const,
      isRead: false,
      isResolved: false,
      sourceIp: null,
      targetIp: null,
      affectedDevices: JSON.stringify(['device-1', 'device-2']),
      userId: 'user-1',
      networkId: 'network-1',
      deviceId: null,
      metadata: JSON.stringify({
        threshold: 80,
        currentUsage: 85,
        duration: '5 minutes',
      }),
      createdAt: new Date('2024-01-01T10:00:00Z'),
      updatedAt: new Date('2024-01-01T10:00:00Z'),
    },
    {
      id: 'alert-2',
      title: 'Device Offline',
      message: 'Device "Smart TV" has been offline for more than 30 minutes',
      alertType: 'DEVICE' as const,
      severity: 'HIGH' as const,
      isRead: true,
      isResolved: false,
      sourceIp: null,
      targetIp: null,
      affectedDevices: JSON.stringify(['device-2']),
      userId: 'user-1',
      networkId: null,
      deviceId: 'device-2',
      metadata: JSON.stringify({
        deviceName: 'Smart TV',
        offlineDuration: '45 minutes',
        lastSeen: '2024-01-01T08:00:00Z',
      }),
      createdAt: new Date('2024-01-01T09:30:00Z'),
      updatedAt: new Date('2024-01-01T09:35:00Z'),
    },
    {
      id: 'alert-3',
      title: 'Security Threat Detected',
      message: 'Suspicious activity detected from IP 192.168.1.100',
      alertType: 'SECURITY' as const,
      severity: 'CRITICAL' as const,
      isRead: false,
      isResolved: false,
      sourceIp: '192.168.1.100',
      targetIp: null,
      affectedDevices: JSON.stringify(['device-1']),
      userId: 'user-1',
      networkId: 'network-1',
      deviceId: 'device-1',
      metadata: JSON.stringify({
        sourceIP: '192.168.1.100',
        threatType: 'port_scan',
        blockedConnections: 15,
      }),
      createdAt: new Date('2024-01-01T09:45:00Z'),
      updatedAt: new Date('2024-01-01T09:45:00Z'),
    },
  ];

  const createAlertDto = {
    title: 'New Security Alert',
    message: 'Unauthorized access attempt detected',
    alertType: 'SECURITY',
    severity: 'HIGH',
    networkId: 'network-1',
    metadata: JSON.stringify({
      sourceIP: '10.0.0.50',
      attemptCount: 5,
      protocol: 'SSH',
    }),
  };

  beforeEach(async () => {
    const mockPrismaService = {
      networkMonitoring: {
        findMany: jest.fn(),
      create: jest.fn(),
      },
      deviceMonitoring: {
        findMany: jest.fn(),
      create: jest.fn(),
      },
      alert: {
        findMany: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
      },
      network: {
        count: jest.fn(),
      },
      device: {
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MonitoringService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<MonitoringService>(MonitoringService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getNetworkStats', () => {
    it('should return network statistics for a user', async () => {
      (prismaService.networkMonitoring.findMany as jest.Mock).mockResolvedValueOnce(mockNetworkStats);

      const result = await service.getNetworkStats('user-1');

      expect(result).toEqual(mockNetworkStats);
      expect(prismaService.networkMonitoring.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { timestamp: 'desc' },
        take: 100,
      });
    });

    it('should return network statistics for a specific network', async () => {
      const filteredStats = [mockNetworkStats[0]];
      (prismaService.networkMonitoring.findMany as jest.Mock).mockResolvedValueOnce(filteredStats);

      const result = await service.getNetworkStats('user-1', 'network-1');

      expect(result).toEqual(filteredStats);
      expect(prismaService.networkMonitoring.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', networkId: 'network-1' },
        orderBy: { timestamp: 'desc' },
        take: 100,
      });
    });

    it('should return empty array when no network stats exist', async () => {
      (prismaService.networkMonitoring.findMany as jest.Mock).mockResolvedValueOnce([]);

      const result = await service.getNetworkStats('user-without-stats');

      expect(result).toEqual([]);
      expect(prismaService.networkMonitoring.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-without-stats' },
        orderBy: { timestamp: 'desc' },
        take: 100,
      });
    });

    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      (prismaService.networkMonitoring.findMany as jest.Mock).mockRejectedValueOnce(dbError);

      await expect(service.getNetworkStats('user-1')).rejects.toThrow(
        'Database connection failed'
      );
    });
  });

  describe('getDeviceStats', () => {
    it('should return device statistics for a user', async () => {
      (prismaService.deviceMonitoring.findMany as jest.Mock).mockResolvedValueOnce(mockDeviceStats);

      const result = await service.getDeviceStats('user-1');

      expect(result).toEqual(mockDeviceStats);
      expect(prismaService.deviceMonitoring.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { timestamp: 'desc' },
        take: 100,
      });
    });

    it('should return device statistics for a specific device', async () => {
      const filteredStats = [mockDeviceStats[0]];
      (prismaService.deviceMonitoring.findMany as jest.Mock).mockResolvedValueOnce(filteredStats);

      const result = await service.getDeviceStats('user-1', 'device-1');

      expect(result).toEqual(filteredStats);
      expect(prismaService.deviceMonitoring.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', deviceId: 'device-1' },
        orderBy: { timestamp: 'desc' },
        take: 100,
      });
    });

    it('should handle online and offline devices', async () => {
      (prismaService.deviceMonitoring.findMany as jest.Mock).mockResolvedValueOnce(mockDeviceStats);

      const result = await service.getDeviceStats('user-1');

      expect(result).toHaveLength(2);
      expect(result[0].signalStrength).toBe(-45);
      expect(result[1].signalStrength).toBeNull();
    });

    it('should return empty array when no device stats exist', async () => {
      (prismaService.deviceMonitoring.findMany as jest.Mock).mockResolvedValueOnce([]);

      const result = await service.getDeviceStats('user-without-devices');

      expect(result).toEqual([]);
    });
  });

  describe('getAlerts', () => {
    it('should return alerts for a user ordered by creation date', async () => {
      (prismaService.alert.findMany as jest.Mock).mockResolvedValueOnce(mockAlerts);

      const result = await service.getAlerts('user-1');

      expect(result).toEqual(mockAlerts);
      expect(prismaService.alert.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    });

    it('should handle different alert types and severities', async () => {
      (prismaService.alert.findMany as jest.Mock).mockResolvedValueOnce(mockAlerts);

      const result = await service.getAlerts('user-1');

      expect(result).toHaveLength(3);
      expect(result.some(alert => alert.alertType === 'NETWORK')).toBe(true);
      expect(result.some(alert => alert.alertType === 'SECURITY')).toBe(true);
      expect(result.some(alert => alert.severity === 'CRITICAL')).toBe(true);
      expect(result.some(alert => alert.severity === 'MEDIUM')).toBe(true);
    });

    it('should handle read and unread alerts', async () => {
      (prismaService.alert.findMany as jest.Mock).mockResolvedValueOnce(mockAlerts);

      const result = await service.getAlerts('user-1');

      const readAlerts = result.filter(alert => alert.isRead);
      const unreadAlerts = result.filter(alert => !alert.isRead);

      expect(readAlerts).toHaveLength(1);
      expect(unreadAlerts).toHaveLength(2);
    });

    it('should return empty array when no alerts exist', async () => {
      (prismaService.alert.findMany as jest.Mock).mockResolvedValueOnce([]);

      const result = await service.getAlerts('user-without-alerts');

      expect(result).toEqual([]);
    });
  });

  describe('createAlert', () => {
    it('should create a new alert with user association', async () => {
      const expectedAlert = {
        ...createAlertDto,
        id: 'new-alert-id',
        userId: 'user-1',
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prismaService.alert.create as jest.Mock).mockResolvedValueOnce(expectedAlert);

      const result = await service.createAlert(createAlertDto, 'user-1');

      expect(result).toEqual(expectedAlert);
      expect(prismaService.alert.create).toHaveBeenCalledWith({
        data: {
          ...createAlertDto,
          userId: 'user-1',
        },
      });
    });

    it('should handle security alerts', async () => {
      const securityAlert = {
        title: 'Intrusion Detected',
        message: 'Multiple failed login attempts from external IP',
        alertType: 'SECURITY',
        severity: 'CRITICAL',
        metadata: JSON.stringify({
          sourceIP: '203.0.113.1',
          failedAttempts: 10,
          timeWindow: '5 minutes',
        }),
      };

      const expectedAlert = {
        ...securityAlert,
        id: 'security-alert-id',
        userId: 'user-1',
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prismaService.alert.create as jest.Mock).mockResolvedValueOnce(expectedAlert);

      const result = await service.createAlert(securityAlert, 'user-1');

      expect(result).toEqual(expectedAlert);
      expect(result.alertType).toBe('SECURITY');
      expect(result.severity).toBe('CRITICAL');
    });

    it('should handle performance alerts', async () => {
      const performanceAlert = {
        title: 'High CPU Usage',
        message: 'Router CPU usage has exceeded 90% for 10 minutes',
        alertType: 'PERFORMANCE',
        severity: 'MEDIUM',
        deviceId: 'router-1',
        metadata: JSON.stringify({
          cpuUsage: 92.5,
          duration: '10 minutes',
          threshold: 90,
        }),
      };

      const expectedAlert = {
        ...performanceAlert,
        id: 'performance-alert-id',
        userId: 'user-1',
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prismaService.alert.create as jest.Mock).mockResolvedValueOnce(expectedAlert);

      const result = await service.createAlert(performanceAlert, 'user-1');

      expect(result).toEqual(expectedAlert);
    });
  });

  describe('markAlertAsRead', () => {
    it('should mark an alert as read for the specified user', async () => {
      const updateResult = { count: 1 };
      (prismaService.alert.updateMany as jest.Mock).mockResolvedValueOnce(updateResult);

      const result = await service.markAlertAsRead('alert-1', 'user-1');

      expect(result).toEqual(updateResult);
      expect(prismaService.alert.updateMany).toHaveBeenCalledWith({
        where: { id: 'alert-1', userId: 'user-1' },
        data: { isRead: true },
      });
    });

    it('should return count 0 when alert does not exist or belongs to different user', async () => {
      const updateResult = { count: 0 };
      (prismaService.alert.updateMany as jest.Mock).mockResolvedValueOnce(updateResult);

      const result = await service.markAlertAsRead('non-existent-alert', 'user-1');

      expect(result).toEqual(updateResult);
      expect(prismaService.alert.updateMany).toHaveBeenCalledWith({
        where: { id: 'non-existent-alert', userId: 'user-1' },
        data: { isRead: true },
      });
    });

    it('should handle marking alert as read for different user', async () => {
      const updateResult = { count: 0 };
      (prismaService.alert.updateMany as jest.Mock).mockResolvedValueOnce(updateResult);

      const result = await service.markAlertAsRead('alert-1', 'different-user');

      expect(result).toEqual(updateResult);
      expect(prismaService.alert.updateMany).toHaveBeenCalledWith({
        where: { id: 'alert-1', userId: 'different-user' },
        data: { isRead: true },
      });
    });
  });

  describe('getDashboardData', () => {
    it('should return comprehensive dashboard data', async () => {
      const mockCounts = {
        networks: 3,
        devices: 8,
        unreadAlerts: 2,
      };

      const mockRecentActivity = mockNetworkStats.slice(0, 2);

      (prismaService.network.count as jest.Mock).mockResolvedValueOnce(mockCounts.networks);
      (prismaService.device.count as jest.Mock).mockResolvedValueOnce(mockCounts.devices);
      (prismaService.alert.count as jest.Mock).mockResolvedValueOnce(mockCounts.unreadAlerts);
      (prismaService.networkMonitoring.findMany as jest.Mock).mockResolvedValueOnce(mockRecentActivity);

      const result = await service.getDashboardData('user-1');

      expect(result).toEqual({
        totalNetworks: mockCounts.networks,
        totalDevices: mockCounts.devices,
        unreadAlerts: mockCounts.unreadAlerts,
        recentActivity: mockRecentActivity,
      });

      expect(prismaService.network.count).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      expect(prismaService.device.count).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      expect(prismaService.alert.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRead: false },
      });
      expect(prismaService.networkMonitoring.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { timestamp: 'desc' },
        take: 10,
      });
    });

    it('should handle user with no data', async () => {
      (prismaService.network.count as jest.Mock).mockResolvedValueOnce(0);
      (prismaService.device.count as jest.Mock).mockResolvedValueOnce(0);
      (prismaService.alert.count as jest.Mock).mockResolvedValueOnce(0);
      (prismaService.networkMonitoring.findMany as jest.Mock).mockResolvedValueOnce([]);

      const result = await service.getDashboardData('new-user');

      expect(result).toEqual({
        totalNetworks: 0,
        totalDevices: 0,
        unreadAlerts: 0,
        recentActivity: [],
      });
    });

    it('should handle dashboard data with high activity', async () => {
      const highActivityStats = Array.from({ length: 10 }, (_, i) => ({
        ...mockNetworkStats[0],
        id: `stat-${i + 1}`,
        timestamp: new Date(Date.now() - i * 3600000), // Each hour back
      }));

      (prismaService.network.count as jest.Mock).mockResolvedValueOnce(5);
      (prismaService.device.count as jest.Mock).mockResolvedValueOnce(25);
      (prismaService.alert.count as jest.Mock).mockResolvedValueOnce(15);
      (prismaService.networkMonitoring.findMany as jest.Mock).mockResolvedValueOnce(highActivityStats);

      const result = await service.getDashboardData('active-user');

      expect(result.totalNetworks).toBe(5);
      expect(result.totalDevices).toBe(25);
      expect(result.unreadAlerts).toBe(15);
      expect(result.recentActivity).toHaveLength(10);
    });

    it('should handle partial data failures gracefully', async () => {
      // Simulate some queries succeeding and others failing
      (prismaService.network.count as jest.Mock).mockResolvedValueOnce(2);
      (prismaService.device.count as jest.Mock).mockRejectedValueOnce(new Error('Device query failed'));
      (prismaService.alert.count as jest.Mock).mockResolvedValueOnce(1);
      (prismaService.networkMonitoring.findMany as jest.Mock).mockResolvedValueOnce([]);

      await expect(service.getDashboardData('user-1')).rejects.toThrow(
        'Device query failed'
      );
    });
  });

  describe('error handling', () => {
    it('should propagate database errors in getNetworkStats', async () => {
      const dbError = new Error('Network monitoring table not found');
      (prismaService.networkMonitoring.findMany as jest.Mock).mockRejectedValueOnce(dbError);

      await expect(service.getNetworkStats('user-1')).rejects.toThrow(
        'Network monitoring table not found'
      );
    });

    it('should propagate database errors in createAlert', async () => {
      const dbError = new Error('Alert creation failed');
      (prismaService.alert.create as jest.Mock).mockRejectedValueOnce(dbError);

      await expect(service.createAlert(createAlertDto, 'user-1')).rejects.toThrow(
        'Alert creation failed'
      );
    });

    it('should handle concurrent alert updates', async () => {
      const concurrencyError = new Error('Concurrent modification detected');
      (prismaService.alert.updateMany as jest.Mock).mockRejectedValueOnce(concurrencyError);

      await expect(service.markAlertAsRead('alert-1', 'user-1')).rejects.toThrow(
        'Concurrent modification detected'
      );
    });
  });

  describe('data validation scenarios', () => {
    it('should handle alerts with complex metadata', async () => {
      const complexAlert = {
        title: 'Advanced Threat Detection',
        message: 'Multi-stage attack pattern detected',
        alertType: 'SECURITY',
        severity: 'CRITICAL',
        metadata: JSON.stringify({
          attackVector: 'network_scan_followed_by_brute_force',
          sourceIPs: ['203.0.113.1', '203.0.113.2', '203.0.113.3'],
          targetPorts: [22, 23, 80, 443, 3389],
          timeline: {
            scanStart: '2024-01-01T10:00:00Z',
            bruteForceStart: '2024-01-01T10:15:00Z',
            blocked: '2024-01-01T10:17:30Z',
          },
          confidence: 0.95,
        }),
      };

      const expectedAlert = {
        ...complexAlert,
        id: 'complex-alert-id',
        userId: 'user-1',
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prismaService.alert.create as jest.Mock).mockResolvedValueOnce(expectedAlert);

      const result = await service.createAlert(complexAlert, 'user-1');

      expect(result).toEqual(expectedAlert);
      expect(JSON.parse(result.metadata)).toEqual(
        JSON.parse(complexAlert.metadata)
      );
    });

    it('should handle network stats with extreme values', async () => {
      const extremeStats = [
        {
          ...mockNetworkStats[0],
          bytesIn: 999999999999, // Very high traffic
          bytesOut: 0, // No outbound traffic
          activeConnections: 10000, // Many connections
          latency: 500.5, // High latency
          packetLoss: 15.8, // High packet loss
        },
      ];

      (prismaService.networkMonitoring.findMany as jest.Mock).mockResolvedValueOnce(extremeStats);

      const result = await service.getNetworkStats('user-1');

      expect(result[0].bytesIn).toBe(999999999999);
      expect(result[0].bytesOut).toBe(0);
      expect(result[0].latency).toBe(500.5);
    });
  });
});