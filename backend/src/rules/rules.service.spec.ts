import { Test, TestingModule } from '@nestjs/testing';
import { RulesService } from './rules.service';
import { PrismaService } from '../prisma/prisma.service';
import { RuleType, RuleAction } from '@prisma/client';

describe('RulesService', () => {
  let service: RulesService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockRule = {
    id: 'rule-1',
    name: 'Block Social Media',
    description: 'Block access to social media sites',
    ruleType: RuleType.FIREWALL,
    action: RuleAction.BLOCK,
    priority: 1,
    isActive: true,
    conditions: JSON.stringify({
      sourceIP: '192.168.1.0/24',
      destinationDomain: 'facebook.com,instagram.com',
      ports: [80, 443],
    }),
    schedule: JSON.stringify({
      days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      startTime: '09:00',
      endTime: '17:00',
    }),
    source: '192.168.1.0/24',
    destination: 'facebook.com',
    port: 443,
    protocol: 'tcp',
    userId: 'user-1',
    networkId: 'network-1',
    deviceId: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockRules = [
    mockRule,
    {
      id: 'rule-2',
      name: 'Allow DNS',
      description: 'Allow DNS queries',
      ruleType: RuleType.FIREWALL,
      action: RuleAction.ALLOW,
      priority: 2,
      isActive: true,
      conditions: JSON.stringify({
        protocol: 'udp',
        port: 53,
      }),
      schedule: null,
      source: 'any',
      destination: '8.8.8.8',
      port: 53,
      protocol: 'udp',
      userId: 'user-1',
      networkId: 'network-1',
      deviceId: null,
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02'),
    },
    {
      id: 'rule-3',
      name: 'QoS Gaming Priority',
      description: 'Prioritize gaming traffic',
      ruleType: RuleType.QOS,
      action: RuleAction.ALLOW,
      priority: 3,
      isActive: false,
      conditions: JSON.stringify({
        applications: ['steam', 'battlenet', 'origin'],
        bandwidth: { min: '10Mbps', max: '50Mbps' },
      }),
      schedule: null,
      source: null,
      destination: null,
      port: null,
      protocol: null,
      userId: 'user-1',
      networkId: null,
      deviceId: 'device-1',
      createdAt: new Date('2024-01-03'),
      updatedAt: new Date('2024-01-03'),
    },
  ];

  const createRuleDto = {
    name: 'New Firewall Rule',
    description: 'Block malicious traffic',
    ruleType: RuleType.FIREWALL,
    action: RuleAction.BLOCK,
    priority: 1,
    isActive: true,
    conditions: JSON.stringify({
      sourceIP: '10.0.0.0/8',
      ports: [22, 23, 3389],
    }),
    source: '10.0.0.0/8',
    protocol: 'tcp',
  };

  beforeEach(async () => {
    const mockPrismaService = {
      rule: {
        findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RulesService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<RulesService>(RulesService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all rules for a user ordered by priority', async () => {
      (prismaService.rule.findMany as jest.Mock).mockResolvedValueOnce(mockRules);

      const result = await service.findAll('user-1');

      expect(result).toEqual(mockRules);
      expect(prismaService.rule.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { priority: 'desc' },
      });
    });

    it('should return empty array when user has no rules', async () => {
      (prismaService.rule.findMany as jest.Mock).mockResolvedValueOnce([]);

      const result = await service.findAll('user-without-rules');

      expect(result).toEqual([]);
      expect(prismaService.rule.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-without-rules' },
        orderBy: { priority: 'desc' },
      });
    });

    it('should handle different rule types', async () => {
      const mixedRules = [
        { ...mockRule, ruleType: RuleType.FIREWALL },
        { ...mockRule, id: 'rule-qos', ruleType: RuleType.QOS },
        { ...mockRule, id: 'rule-parental', ruleType: RuleType.PARENTAL_CONTROL },
      ];
      (prismaService.rule.findMany as jest.Mock).mockResolvedValueOnce(mixedRules);

      const result = await service.findAll('user-1');

      expect(result).toEqual(mixedRules);
      expect(result).toHaveLength(3);
      expect(result.some(rule => rule.ruleType === RuleType.FIREWALL)).toBe(true);
      expect(result.some(rule => rule.ruleType === RuleType.QOS)).toBe(true);
      expect(result.some(rule => rule.ruleType === RuleType.PARENTAL_CONTROL)).toBe(true);
    });
  });

  describe('findOne', () => {
    it('should return a specific rule for a user', async () => {
      (prismaService.rule.findFirst as jest.Mock).mockResolvedValueOnce(mockRule);

      const result = await service.findOne('rule-1', 'user-1');

      expect(result).toEqual(mockRule);
      expect(prismaService.rule.findFirst).toHaveBeenCalledWith({
        where: { id: 'rule-1', userId: 'user-1' },
      });
    });

    it('should return null when rule is not found', async () => {
      (prismaService.rule.findFirst as jest.Mock).mockResolvedValueOnce(null);

      const result = await service.findOne('non-existent-rule', 'user-1');

      expect(result).toBeNull();
      expect(prismaService.rule.findFirst).toHaveBeenCalledWith({
        where: { id: 'non-existent-rule', userId: 'user-1' },
      });
    });

    it('should return null when rule belongs to different user', async () => {
      (prismaService.rule.findFirst as jest.Mock).mockResolvedValueOnce(null);

      const result = await service.findOne('rule-1', 'different-user');

      expect(result).toBeNull();
      expect(prismaService.rule.findFirst).toHaveBeenCalledWith({
        where: { id: 'rule-1', userId: 'different-user' },
      });
    });
  });

  describe('create', () => {
    it('should create a new rule with user association', async () => {
      const expectedRule = {
        ...createRuleDto,
        id: 'new-rule-id',
        userId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prismaService.rule.create as jest.Mock).mockResolvedValueOnce(expectedRule);

      const result = await service.create(createRuleDto, 'user-1');

      expect(result).toEqual(expectedRule);
      expect(prismaService.rule.create).toHaveBeenCalledWith({
        data: {
          ...createRuleDto,
          userId: 'user-1',
        },
      });
    });

    it('should handle firewall rule creation', async () => {
      const firewallRule = {
        name: 'Block SSH',
        ruleType: RuleType.FIREWALL,
        action: RuleAction.BLOCK,
        source: 'any',
        destination: 'any',
        port: 22,
        protocol: 'tcp',
      };

      const expectedRule = {
        ...firewallRule,
        id: 'firewall-rule-id',
        userId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prismaService.rule.create as jest.Mock).mockResolvedValueOnce(expectedRule);

      const result = await service.create(firewallRule, 'user-1');

      expect(result).toEqual(expectedRule);
      expect(prismaService.rule.create).toHaveBeenCalledWith({
        data: {
          ...firewallRule,
          userId: 'user-1',
        },
      });
    });

    it('should handle QoS rule creation', async () => {
      const qosRule = {
        name: 'Gaming Priority',
        ruleType: RuleType.QOS,
        action: RuleAction.ALLOW,
        priority: 5,
        conditions: JSON.stringify({
          bandwidth: { guaranteed: '10Mbps', max: '100Mbps' },
          applications: ['gaming'],
        }),
      };

      const expectedRule = {
        ...qosRule,
        id: 'qos-rule-id',
        userId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prismaService.rule.create as jest.Mock).mockResolvedValueOnce(expectedRule);

      const result = await service.create(qosRule, 'user-1');

      expect(result).toEqual(expectedRule);
      expect(prismaService.rule.create).toHaveBeenCalledWith({
        data: {
          ...qosRule,
          userId: 'user-1',
        },
      });
    });
  });

  describe('update', () => {
    it('should update a rule for the specified user', async () => {
      const updateData = {
        name: 'Updated Rule Name',
        description: 'Updated description',
        isActive: false,
        priority: 10,
      };

      const updateResult = { count: 1 };
      (prismaService.rule.updateMany as jest.Mock).mockResolvedValueOnce(updateResult);

      const result = await service.update('rule-1', updateData, 'user-1');

      expect(result).toEqual(updateResult);
      expect(prismaService.rule.updateMany).toHaveBeenCalledWith({
        where: { id: 'rule-1', userId: 'user-1' },
        data: updateData,
      });
    });

    it('should return count 0 when rule does not exist or belongs to different user', async () => {
      const updateData = { name: 'Updated Name' };
      const updateResult = { count: 0 };
      (prismaService.rule.updateMany as jest.Mock).mockResolvedValueOnce(updateResult);

      const result = await service.update('non-existent-rule', updateData, 'user-1');

      expect(result).toEqual(updateResult);
      expect(prismaService.rule.updateMany).toHaveBeenCalledWith({
        where: { id: 'non-existent-rule', userId: 'user-1' },
        data: updateData,
      });
    });

    it('should handle rule activation/deactivation', async () => {
      const activationUpdate = { isActive: true };
      const updateResult = { count: 1 };
      (prismaService.rule.updateMany as jest.Mock).mockResolvedValueOnce(updateResult);

      const result = await service.update('rule-1', activationUpdate, 'user-1');

      expect(result).toEqual(updateResult);
      expect(prismaService.rule.updateMany).toHaveBeenCalledWith({
        where: { id: 'rule-1', userId: 'user-1' },
        data: activationUpdate,
      });
    });

    it('should handle priority updates', async () => {
      const priorityUpdate = { priority: 100 };
      const updateResult = { count: 1 };
      (prismaService.rule.updateMany as jest.Mock).mockResolvedValueOnce(updateResult);

      const result = await service.update('rule-1', priorityUpdate, 'user-1');

      expect(result).toEqual(updateResult);
      expect(prismaService.rule.updateMany).toHaveBeenCalledWith({
        where: { id: 'rule-1', userId: 'user-1' },
        data: priorityUpdate,
      });
    });

    it('should handle conditions updates', async () => {
      const conditionsUpdate = {
        conditions: JSON.stringify({
          sourceIP: '192.168.0.0/16',
          destinationPorts: [80, 443, 8080],
          protocols: ['tcp', 'udp'],
        }),
      };
      const updateResult = { count: 1 };
      (prismaService.rule.updateMany as jest.Mock).mockResolvedValueOnce(updateResult);

      const result = await service.update('rule-1', conditionsUpdate, 'user-1');

      expect(result).toEqual(updateResult);
      expect(prismaService.rule.updateMany).toHaveBeenCalledWith({
        where: { id: 'rule-1', userId: 'user-1' },
        data: conditionsUpdate,
      });
    });
  });

  describe('remove', () => {
    it('should delete a rule for the specified user', async () => {
      const deleteResult = { count: 1 };
      (prismaService.rule.deleteMany as jest.Mock).mockResolvedValueOnce(deleteResult);

      const result = await service.remove('rule-1', 'user-1');

      expect(result).toEqual(deleteResult);
      expect(prismaService.rule.deleteMany).toHaveBeenCalledWith({
        where: { id: 'rule-1', userId: 'user-1' },
      });
    });

    it('should return count 0 when rule does not exist or belongs to different user', async () => {
      const deleteResult = { count: 0 };
      (prismaService.rule.deleteMany as jest.Mock).mockResolvedValueOnce(deleteResult);

      const result = await service.remove('non-existent-rule', 'user-1');

      expect(result).toEqual(deleteResult);
      expect(prismaService.rule.deleteMany).toHaveBeenCalledWith({
        where: { id: 'non-existent-rule', userId: 'user-1' },
      });
    });

    it('should handle deletion with different user ID', async () => {
      const deleteResult = { count: 0 };
      (prismaService.rule.deleteMany as jest.Mock).mockResolvedValueOnce(deleteResult);

      const result = await service.remove('rule-1', 'different-user');

      expect(result).toEqual(deleteResult);
      expect(prismaService.rule.deleteMany).toHaveBeenCalledWith({
        where: { id: 'rule-1', userId: 'different-user' },
      });
    });
  });

  describe('error handling', () => {
    it('should propagate database errors in findAll', async () => {
      const dbError = new Error('Database connection failed');
      (prismaService.rule.findMany as jest.Mock).mockRejectedValueOnce(dbError);

      await expect(service.findAll('user-1')).rejects.toThrow('Database connection failed');
    });

    it('should propagate database errors in create', async () => {
      const dbError = new Error('Constraint violation');
      (prismaService.rule.create as jest.Mock).mockRejectedValueOnce(dbError);

      await expect(service.create(createRuleDto, 'user-1')).rejects.toThrow(
        'Constraint violation'
      );
    });

    it('should propagate database errors in update', async () => {
      const dbError = new Error('Update failed');
      (prismaService.rule.updateMany as jest.Mock).mockRejectedValueOnce(dbError);

      await expect(service.update('rule-1', { name: 'New Name' }, 'user-1')).rejects.toThrow(
        'Update failed'
      );
    });

    it('should propagate database errors in remove', async () => {
      const dbError = new Error('Delete failed');
      (prismaService.rule.deleteMany as jest.Mock).mockRejectedValueOnce(dbError);

      await expect(service.remove('rule-1', 'user-1')).rejects.toThrow('Delete failed');
    });
  });

  describe('rule validation scenarios', () => {
    it('should handle rules with complex conditions', async () => {
      const complexRule = {
        name: 'Complex Firewall Rule',
        ruleType: RuleType.FIREWALL,
        action: RuleAction.BLOCK,
        conditions: JSON.stringify({
          sourceNetworks: ['192.168.1.0/24', '10.0.0.0/8'],
          destinationDomains: ['*.malware.com', '*.phishing.net'],
          timeRestrictions: {
            days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
            hours: { start: '09:00', end: '17:00' },
          },
          protocols: ['tcp', 'udp'],
          ports: { ranges: [{ start: 1024, end: 65535 }] },
        }),
      };

      const expectedRule = {
        ...complexRule,
        id: 'complex-rule-id',
        userId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prismaService.rule.create as jest.Mock).mockResolvedValueOnce(expectedRule);

      const result = await service.create(complexRule, 'user-1');

      expect(result).toEqual(expectedRule);
      expect(JSON.parse(result.conditions)).toEqual(
        JSON.parse(complexRule.conditions)
      );
    });

    it('should handle parental control rules', async () => {
      const parentalRule = {
        name: 'Kids Internet Access',
        ruleType: RuleType.PARENTAL_CONTROL,
        action: RuleAction.BLOCK,
        conditions: JSON.stringify({
          devices: ['kids-tablet', 'kids-laptop'],
          blockedCategories: ['adult', 'gambling', 'violence'],
          allowedSites: ['education.com', 'kids-games.com'],
          timeRestrictions: {
            schoolDays: { start: '15:00', end: '20:00' },
            weekends: { start: '08:00', end: '21:00' },
          },
        }),
      };

      const expectedRule = {
        ...parentalRule,
        id: 'parental-rule-id',
        userId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prismaService.rule.create as jest.Mock).mockResolvedValueOnce(expectedRule);

      const result = await service.create(parentalRule, 'user-1');

      expect(result).toEqual(expectedRule);
      expect(result.ruleType).toBe(RuleType.PARENTAL_CONTROL);
    });
  });
});