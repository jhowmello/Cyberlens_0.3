import { Test, TestingModule } from '@nestjs/testing';
import { NetworksService } from './networks.service';
import { PrismaService } from '../prisma/prisma.service';

describe('NetworksService', () => {
  let service: NetworksService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockNetwork = {
    id: 'network-1',
    name: 'Test Network',
    description: 'Test network description',
    ssid: 'TestSSID',
    type: 'WIFI',
    isActive: true,
    userId: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockNetworks = [
    mockNetwork,
    {
      id: 'network-2',
      name: 'Test Network 2',
      description: 'Second test network',
      ssid: 'TestSSID2',
      type: 'ETHERNET',
      isActive: false,
      userId: 'user-1',
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02'),
    },
  ];

  const createNetworkDto = {
    name: 'New Network',
    description: 'New network description',
    ssid: 'NewSSID',
    type: 'WIFI',
    isActive: true,
  };

  beforeEach(async () => {
    const mockPrismaService = {
      network: {
        findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NetworksService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<NetworksService>(NetworksService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all networks for a user ordered by creation date', async () => {
      (prismaService.network.findMany as jest.Mock).mockResolvedValueOnce(mockNetworks);

      const result = await service.findAll('user-1');

      expect(result).toEqual(mockNetworks);
      expect(prismaService.network.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array when user has no networks', async () => {
      (prismaService.network.findMany as jest.Mock).mockResolvedValueOnce([]);

      const result = await service.findAll('user-without-networks');

      expect(result).toEqual([]);
      expect(prismaService.network.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-without-networks' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findOne', () => {
    it('should return a specific network for a user', async () => {
      (prismaService.network.findFirst as jest.Mock).mockResolvedValueOnce(mockNetwork);

      const result = await service.findOne('network-1', 'user-1');

      expect(result).toEqual(mockNetwork);
      expect(prismaService.network.findFirst).toHaveBeenCalledWith({
        where: { id: 'network-1', userId: 'user-1' },
      });
    });

    it('should return null when network is not found', async () => {
      (prismaService.network.findFirst as jest.Mock).mockResolvedValueOnce(null);

      const result = await service.findOne('non-existent-network', 'user-1');

      expect(result).toBeNull();
      expect(prismaService.network.findFirst).toHaveBeenCalledWith({
        where: { id: 'non-existent-network', userId: 'user-1' },
      });
    });

    it('should return null when network belongs to different user', async () => {
      (prismaService.network.findFirst as jest.Mock).mockResolvedValueOnce(null);

      const result = await service.findOne('network-1', 'different-user');

      expect(result).toBeNull();
      expect(prismaService.network.findFirst).toHaveBeenCalledWith({
        where: { id: 'network-1', userId: 'different-user' },
      });
    });
  });

  describe('create', () => {
    it('should create a new network with user association', async () => {
      const expectedNetwork = {
        ...createNetworkDto,
        id: 'new-network-id',
        userId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prismaService.network.create as jest.Mock).mockResolvedValueOnce(expectedNetwork);

      const result = await service.create(createNetworkDto, 'user-1');

      expect(result).toEqual(expectedNetwork);
      expect(prismaService.network.create).toHaveBeenCalledWith({
        data: {
          ...createNetworkDto,
          userId: 'user-1',
        },
      });
    });

    it('should handle network creation with minimal data', async () => {
      const minimalData = {
        name: 'Minimal Network',
      };

      const expectedNetwork = {
        ...minimalData,
        id: 'minimal-network-id',
        userId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prismaService.network.create as jest.Mock).mockResolvedValueOnce(expectedNetwork);

      const result = await service.create(minimalData, 'user-1');

      expect(result).toEqual(expectedNetwork);
      expect(prismaService.network.create).toHaveBeenCalledWith({
        data: {
          ...minimalData,
          userId: 'user-1',
        },
      });
    });
  });

  describe('update', () => {
    it('should update a network for the specified user', async () => {
      const updateData = {
        name: 'Updated Network Name',
        description: 'Updated description',
        isActive: false,
      };

      const updateResult = { count: 1 };
      (prismaService.network.updateMany as jest.Mock).mockResolvedValueOnce(updateResult);

      const result = await service.update('network-1', updateData, 'user-1');

      expect(result).toEqual(updateResult);
      expect(prismaService.network.updateMany).toHaveBeenCalledWith({
        where: { id: 'network-1', userId: 'user-1' },
        data: updateData,
      });
    });

    it('should return count 0 when network does not exist or belongs to different user', async () => {
      const updateData = { name: 'Updated Name' };
      const updateResult = { count: 0 };
      (prismaService.network.updateMany as jest.Mock).mockResolvedValueOnce(updateResult);

      const result = await service.update('non-existent-network', updateData, 'user-1');

      expect(result).toEqual(updateResult);
      expect(prismaService.network.updateMany).toHaveBeenCalledWith({
        where: { id: 'non-existent-network', userId: 'user-1' },
        data: updateData,
      });
    });

    it('should handle partial updates', async () => {
      const partialUpdate = { isActive: true };
      const updateResult = { count: 1 };
      (prismaService.network.updateMany as jest.Mock).mockResolvedValueOnce(updateResult);

      const result = await service.update('network-1', partialUpdate, 'user-1');

      expect(result).toEqual(updateResult);
      expect(prismaService.network.updateMany).toHaveBeenCalledWith({
        where: { id: 'network-1', userId: 'user-1' },
        data: partialUpdate,
      });
    });
  });

  describe('remove', () => {
    it('should delete a network for the specified user', async () => {
      const deleteResult = { count: 1 };
      (prismaService.network.deleteMany as jest.Mock).mockResolvedValueOnce(deleteResult);

      const result = await service.remove('network-1', 'user-1');

      expect(result).toEqual(deleteResult);
      expect(prismaService.network.deleteMany).toHaveBeenCalledWith({
        where: { id: 'network-1', userId: 'user-1' },
      });
    });

    it('should return count 0 when network does not exist or belongs to different user', async () => {
      const deleteResult = { count: 0 };
      (prismaService.network.deleteMany as jest.Mock).mockResolvedValueOnce(deleteResult);

      const result = await service.remove('non-existent-network', 'user-1');

      expect(result).toEqual(deleteResult);
      expect(prismaService.network.deleteMany).toHaveBeenCalledWith({
        where: { id: 'non-existent-network', userId: 'user-1' },
      });
    });

    it('should handle deletion with different user ID', async () => {
      const deleteResult = { count: 0 };
      (prismaService.network.deleteMany as jest.Mock).mockResolvedValueOnce(deleteResult);

      const result = await service.remove('network-1', 'different-user');

      expect(result).toEqual(deleteResult);
      expect(prismaService.network.deleteMany).toHaveBeenCalledWith({
        where: { id: 'network-1', userId: 'different-user' },
      });
    });
  });

  describe('error handling', () => {
    it('should propagate database errors in findAll', async () => {
      const dbError = new Error('Database connection failed');
      (prismaService.network.findMany as jest.Mock).mockRejectedValueOnce(dbError);

      await expect(service.findAll('user-1')).rejects.toThrow('Database connection failed');
    });

    it('should propagate database errors in create', async () => {
      const dbError = new Error('Unique constraint violation');
      (prismaService.network.create as jest.Mock).mockRejectedValueOnce(dbError);

      await expect(service.create(createNetworkDto, 'user-1')).rejects.toThrow(
        'Unique constraint violation'
      );
    });

    it('should propagate database errors in update', async () => {
      const dbError = new Error('Update failed');
      (prismaService.network.updateMany as jest.Mock).mockRejectedValueOnce(dbError);

      await expect(service.update('network-1', { name: 'New Name' }, 'user-1')).rejects.toThrow(
        'Update failed'
      );
    });

    it('should propagate database errors in remove', async () => {
      const dbError = new Error('Delete failed');
      (prismaService.network.deleteMany as jest.Mock).mockRejectedValueOnce(dbError);

      await expect(service.remove('network-1', 'user-1')).rejects.toThrow('Delete failed');
    });
  });
});