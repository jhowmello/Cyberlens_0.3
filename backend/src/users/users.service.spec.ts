import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

describe('UsersService', () => {
  let service: UsersService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockUser = {
    id: '1',
    email: 'test@example.com',
    username: 'testuser',
    name: 'Test User',
    firstName: 'Test',
    lastName: 'User',
    password: 'hashedPassword',
    role: Role.USER,
    isActive: true,
    isEmailVerified: true,
    avatar: null,
    lastLogin: new Date('2024-01-01'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockUserWithoutPassword = {
    id: '1',
    email: 'test@example.com',
    username: 'testuser',
    name: 'Test User',
    avatar: null,
    role: Role.USER,
    isActive: true,
    isEmailVerified: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    lastLogin: new Date('2024-01-01'),
  };

  const mockUserWithRelations = {
    ...mockUser,
    networks: [
      {
        id: 'net1',
        name: 'Test Network',
        description: 'Test network description',
        isActive: true,
        createdAt: new Date('2024-01-01'),
      },
    ],
    rules: [
      {
        id: 'rule1',
        name: 'Test Rule',
        ruleType: 'FIREWALL',
        isActive: true,
        createdAt: new Date('2024-01-01'),
      },
    ],
    devices: [
      {
        id: 'device1',
        name: 'Test Device',
        macAddress: '00:11:22:33:44:55',
        ipAddress: '192.168.1.100',
        isOnline: true,
        lastSeen: new Date('2024-01-01'),
      },
    ],
  };

  beforeEach(async () => {
    const mockPrismaService = {
      user: {
        findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValueOnce(mockUser);

      const result = await service.findById('1');

      expect(result).toEqual(mockUser);
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('should return null when user not found', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValueOnce(null);

      const result = await service.findById('999');

      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should return user when found by email', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValueOnce(mockUser);

      const result = await service.findByEmail('test@example.com');

      expect(result).toEqual(mockUser);
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should return null when user not found by email', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValueOnce(null);

      const result = await service.findByEmail('notfound@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findByUsername', () => {
    it('should return user when found by username', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValueOnce(mockUser);

      const result = await service.findByUsername('testuser');

      expect(result).toEqual(mockUser);
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { username: 'testuser' },
      });
    });

    it('should return null when username is empty', async () => {
      const result = await service.findByUsername('');

      expect(result).toBeNull();
      expect(prismaService.user.findUnique).not.toHaveBeenCalled();
    });

    it('should return null when username is null', async () => {
      const result = await service.findByUsername(null);

      expect(result).toBeNull();
      expect(prismaService.user.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return users without password field', async () => {
      const mockUsers = [mockUserWithoutPassword];
      (prismaService.user.findMany as jest.Mock).mockResolvedValueOnce(mockUsers);

      const params = {
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' as const },
      };

      const result = await service.findAll(params);

      expect(result).toEqual(mockUsers);
      expect(prismaService.user.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        cursor: undefined,
        where: undefined,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          avatar: true,
          role: true,
          isActive: true,
          isEmailVerified: true,
          createdAt: true,
          updatedAt: true,
          lastLogin: true,
          password: false,
        },
      });
    });

    it('should handle empty parameters', async () => {
      (prismaService.user.findMany as jest.Mock).mockResolvedValueOnce([]);

      const result = await service.findAll({});

      expect(result).toEqual([]);
      expect(prismaService.user.findMany).toHaveBeenCalledWith({
        skip: undefined,
        take: undefined,
        cursor: undefined,
        where: undefined,
        orderBy: undefined,
        select: expect.any(Object),
      });
    });
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const createData = {
        email: 'newuser@example.com',
        username: 'newuser',
        name: 'New User',
        password: 'hashedPassword',
      };

      (prismaService.user.create as jest.Mock).mockResolvedValueOnce(mockUser);

      const result = await service.create(createData);

      expect(result).toEqual(mockUser);
      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: createData,
      });
    });
  });

  describe('update', () => {
    it('should update user when user exists', async () => {
      const updateData = { name: 'Updated Name' };
      const updatedUser = { ...mockUser, name: 'Updated Name' };

      (prismaService.user.findUnique as jest.Mock).mockResolvedValueOnce(mockUser);
      (prismaService.user.update as jest.Mock).mockResolvedValueOnce(updatedUser);

      const result = await service.update({
        where: { id: '1' },
        data: updateData,
      });

      expect(result).toEqual(updatedUser);
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
      });
      expect(prismaService.user.update).toHaveBeenCalledWith({
        data: updateData,
        where: { id: '1' },
      });
    });

    it('should throw NotFoundException when user does not exist', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValueOnce(null);

      await expect(
        service.update({
          where: { id: '999' },
          data: { name: 'Updated Name' },
        })
      ).rejects.toThrow(new NotFoundException('Usuário não encontrado'));

      expect(prismaService.user.update).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete user when user exists', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValueOnce(mockUser);
      (prismaService.user.delete as jest.Mock).mockResolvedValueOnce(mockUser);

      const result = await service.delete({ id: '1' });

      expect(result).toEqual(mockUser);
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
      });
      expect(prismaService.user.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('should throw NotFoundException when user does not exist', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValueOnce(null);

      await expect(service.delete({ id: '999' })).rejects.toThrow(
        new NotFoundException('Usuário não encontrado')
      );

      expect(prismaService.user.delete).not.toHaveBeenCalled();
    });
  });

  describe('count', () => {
    it('should return user count', async () => {
      (prismaService.user.count as jest.Mock).mockResolvedValueOnce(5);

      const result = await service.count();

      expect(result).toBe(5);
      expect(prismaService.user.count).toHaveBeenCalledWith({ where: undefined });
    });

    it('should return user count with where condition', async () => {
      const whereCondition = { isActive: true };
      (prismaService.user.count as jest.Mock).mockResolvedValueOnce(3);

      const result = await service.count(whereCondition);

      expect(result).toBe(3);
      expect(prismaService.user.count).toHaveBeenCalledWith({ where: whereCondition });
    });
  });

  describe('getUserWithRelations', () => {
    it('should return user with relations excluding password', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValueOnce(mockUserWithRelations);

      const result = await service.getUserWithRelations('1');

      const { password, ...expectedResult } = mockUserWithRelations;
      expect(result).toEqual(expectedResult);
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        include: {
          networks: {
            select: {
              id: true,
              name: true,
              description: true,
              isActive: true,
              createdAt: true,
            },
          },
          rules: {
            select: {
              id: true,
              name: true,
              ruleType: true,
              isActive: true,
              createdAt: true,
            },
          },
          devices: {
            select: {
              id: true,
              name: true,
              macAddress: true,
              ipAddress: true,
              isOnline: true,
              lastSeen: true,
            },
          },
        },
      });
    });

    it('should throw NotFoundException when user does not exist', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValueOnce(null);

      await expect(service.getUserWithRelations('999')).rejects.toThrow(
        new NotFoundException('Usuário não encontrado')
      );
    });
  });
});