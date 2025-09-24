import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Role } from '@prisma/client';

// Mock bcrypt
jest.mock('bcryptjs');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: jest.Mocked<PrismaService>;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

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
    lastLogin: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUserWithoutPassword = {
    id: '1',
    email: 'test@example.com',
    username: 'testuser',
    name: 'Test User',
    firstName: 'Test',
    lastName: 'User',
    role: Role.USER,
    isActive: true,
    isEmailVerified: true,
    avatar: null,
    lastLogin: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockPrismaService = {
      user: {
        create: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
    updateMany: jest.fn(),
      },
    };

    const mockUsersService = {
      findByEmail: jest.fn(),
    findByUsername: jest.fn(),
    create: jest.fn(),
    };

    const mockJwtService = {
      sign: jest.fn().mockReturnValue('mock-token'),
      verify: jest.fn().mockReturnValue({}),
    };

    const mockConfigService = {
      get: jest.fn().mockReturnValue('mock-value'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get(PrismaService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('should return user without password when credentials are valid', async () => {
      (usersService.findByEmail as jest.Mock).mockResolvedValueOnce(mockUser);
      mockedBcrypt.compare.mockResolvedValue(true as never);

      const result = await service.validateUser('test@example.com', 'password');

      expect(result).toEqual(mockUserWithoutPassword);
      expect(usersService.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockedBcrypt.compare).toHaveBeenCalledWith('password', 'hashedPassword');
    });

    it('should return null when user is not found', async () => {
      (usersService.findByEmail as jest.Mock).mockResolvedValueOnce(null);

      const result = await service.validateUser('test@example.com', 'password');

      expect(result).toBeNull();
    });

    it('should return null when password is invalid', async () => {
      (usersService.findByEmail as jest.Mock).mockResolvedValueOnce(mockUser);
      mockedBcrypt.compare.mockResolvedValue(false as never);

      const result = await service.validateUser('test@example.com', 'wrongpassword');

      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'password',
    };

    it('should return access token and user data when login is successful', async () => {
      const mockTokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };

      jest.spyOn(service, 'validateUser').mockResolvedValueOnce(mockUserWithoutPassword);
      jwtService.sign.mockReturnValueOnce(mockTokens.accessToken);
      jest.spyOn(service as any, 'generateRefreshToken').mockReturnValue(mockTokens.refreshToken);
      jest.spyOn(service as any, 'saveRefreshToken').mockResolvedValueOnce(undefined);
      (prismaService.user.update as jest.Mock).mockResolvedValueOnce(mockUser);

      const result = await service.login(loginDto);

      expect(result).toEqual({
        access_token: mockTokens.accessToken,
        refresh_token: mockTokens.refreshToken,
        user: {
          id: mockUser.id,
          email: mockUser.email,
          username: mockUser.username,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
          role: mockUser.role,
          avatar: mockUser.avatar,
        },
      });
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { lastLogin: expect.any(Date) },
      });
    });

    it('should throw UnauthorizedException when credentials are invalid', async () => {
      jest.spyOn(service, 'validateUser').mockResolvedValueOnce(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        new UnauthorizedException('Credenciais inválidas')
      );
    });

    it('should throw UnauthorizedException when user is not active', async () => {
      const inactiveUser = { ...mockUserWithoutPassword, isActive: false };
      jest.spyOn(service, 'validateUser').mockResolvedValueOnce(inactiveUser);

      await expect(service.login(loginDto)).rejects.toThrow(
        new UnauthorizedException('Conta não está ativa')
      );
    });
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      email: 'newuser@example.com',
      username: 'newuser',
      firstName: 'New',
      lastName: 'User',
      password: 'password123',
    };

    it('should create a new user successfully', async () => {
      const hashedPassword = 'hashedPassword123';
      const newUser = {
        ...mockUser,
        email: registerDto.email,
        username: registerDto.username,
        password: hashedPassword,
        isActive: false,
      };

      (usersService.findByEmail as jest.Mock).mockResolvedValueOnce(null);
      (usersService.findByUsername as jest.Mock).mockResolvedValueOnce(null);
      configService.get.mockReturnValue('12');
      mockedBcrypt.hash.mockResolvedValue(hashedPassword as never);
      (prismaService.user.create as jest.Mock).mockResolvedValueOnce(newUser);
      jest.spyOn(service as any, 'generateEmailVerificationToken').mockReturnValue('verification-token');
      jest.spyOn(service as any, 'saveEmailVerificationToken').mockResolvedValueOnce(undefined);

      const result = await service.register(registerDto);

      expect(result).toEqual({
        user: { ...newUser, password: undefined },
        message: 'Usuário criado com sucesso. Verifique seu email para ativar a conta.',
      });
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(registerDto.password, 12);
      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: {
          email: registerDto.email,
          username: registerDto.username,
          name: `${registerDto.firstName} ${registerDto.lastName}`,
          password: hashedPassword,
          isActive: false,
        },
      });
    });

    it('should throw ConflictException when email already exists', async () => {
      (usersService.findByEmail as jest.Mock).mockResolvedValueOnce(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(
        new ConflictException('Email já está em uso')
      );
    });

    it('should throw ConflictException when username already exists', async () => {
      (usersService.findByEmail as jest.Mock).mockResolvedValueOnce(null);
      (usersService.findByUsername as jest.Mock).mockResolvedValueOnce(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(
        new ConflictException('Nome de usuário já está em uso')
      );
    });
  });

  describe('googleLogin', () => {
    const googleUser = {
      email: 'google@example.com',
      name: 'Google User',
      picture: 'https://example.com/avatar.jpg',
    };

    it('should create new user and return tokens when user does not exist', async () => {
      const newUser = {
        ...mockUser,
        email: googleUser.email,
        name: googleUser.name,
        avatar: googleUser.picture,
        isActive: true,
        isEmailVerified: true,
      };

      (usersService.findByEmail as jest.Mock).mockResolvedValueOnce(null);
      (prismaService.user.create as jest.Mock).mockResolvedValueOnce(newUser);
      jwtService.sign.mockReturnValueOnce('access-token');
      jest.spyOn(service as any, 'generateRefreshToken').mockReturnValue('refresh-token');
      jest.spyOn(service as any, 'saveRefreshToken').mockResolvedValueOnce(undefined);

      const result = await service.googleLogin(googleUser);

      expect(result).toEqual({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        user: {
          id: newUser.id,
          email: newUser.email,
          username: newUser.username,
          name: newUser.name,
          role: newUser.role,
          avatar: newUser.avatar,
        },
      });
      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: {
          email: googleUser.email,
          name: googleUser.name,
          avatar: googleUser.picture,
          isActive: true,
          isEmailVerified: true,
        },
      });
    });

    it('should update existing user and return tokens', async () => {
      (usersService.findByEmail as jest.Mock).mockResolvedValueOnce(mockUser);
      (prismaService.user.update as jest.Mock).mockResolvedValueOnce(mockUser);
      jwtService.sign.mockReturnValueOnce('access-token');
      jest.spyOn(service as any, 'generateRefreshToken').mockReturnValue('refresh-token');
      jest.spyOn(service as any, 'saveRefreshToken').mockResolvedValueOnce(undefined);

      const result = await service.googleLogin(googleUser);

      expect(result).toHaveProperty('access_token', 'access-token');
      expect(result).toHaveProperty('refresh_token', 'refresh-token');
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: {
          avatar: googleUser.picture,
          lastLogin: expect.any(Date),
        },
      });
    });

    it('should throw BadRequestException when user data is invalid', async () => {
      await expect(service.googleLogin(null)).rejects.toThrow(
        new BadRequestException('Dados do Google inválidos')
      );
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully with valid refresh token', async () => {
      const refreshToken = 'valid-refresh-token';
      const mockRefreshTokenRecord = {
        id: 'token-id',
        userId: mockUser.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        isRevoked: false,
        user: mockUser,
      };

      (prismaService.refreshToken.findUnique as jest.Mock).mockResolvedValueOnce(mockRefreshTokenRecord);
      (prismaService.refreshToken.update as jest.Mock).mockResolvedValueOnce(undefined);
      jwtService.sign.mockReturnValueOnce('new-access-token');
      jest.spyOn(service as any, 'generateRefreshToken').mockReturnValue('new-refresh-token');
      jest.spyOn(service as any, 'saveRefreshToken').mockResolvedValueOnce(undefined);

      const result = await service.refreshToken(refreshToken);

      expect(result).toEqual({
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
      });
      expect(prismaService.refreshToken.update).toHaveBeenCalledWith({
        where: { id: mockRefreshTokenRecord.id },
        data: { isRevoked: true },
      });
    });

    it('should throw UnauthorizedException with invalid refresh token', async () => {
      (prismaService.refreshToken.findUnique as jest.Mock).mockResolvedValueOnce(null);

      await expect(service.refreshToken('invalid-token')).rejects.toThrow(
        new UnauthorizedException('Token de refresh inválido')
      );
    });

    it('should throw UnauthorizedException with expired refresh token', async () => {
      const expiredTokenRecord = {
        id: 'token-id',
        userId: mockUser.id,
        token: 'expired-token',
        expiresAt: new Date(Date.now() - 1000), // Expired
        isRevoked: false,
        user: mockUser,
      };

      (prismaService.refreshToken.findUnique as jest.Mock).mockResolvedValueOnce(expiredTokenRecord);

      await expect(service.refreshToken('expired-token')).rejects.toThrow(
        new UnauthorizedException('Token de refresh inválido')
      );
    });
  });

  describe('logout', () => {
    it('should return success message', async () => {
      const result = await service.logout('user-id', 'refresh-token');

      expect(result).toEqual({ message: 'Logout realizado com sucesso' });
    });
  });

  describe('verifyEmail', () => {
    it('should throw BadRequestException as functionality is not implemented', async () => {
      await expect(service.verifyEmail('verification-token')).rejects.toThrow(
        new BadRequestException('Email verification not implemented')
      );
    });
  });

  describe('private methods', () => {
    it('should generate refresh token', () => {
      const userId = 'user-id';
      configService.get.mockReturnValueOnce('refresh-secret');
      configService.get.mockReturnValueOnce('7d');
      jwtService.sign.mockReturnValue('refresh-token');

      const result = (service as any).generateRefreshToken(userId);

      expect(result).toBe('refresh-token');
      expect(jwtService.sign).toHaveBeenCalledWith(
        { sub: userId, type: 'refresh' },
        {
          secret: 'refresh-secret',
          expiresIn: '7d',
        }
      );
    });

    it('should generate email verification token', () => {
      jwtService.sign.mockReturnValue('verification-token');

      const result = (service as any).generateEmailVerificationToken();

      expect(result).toBe('verification-token');
      expect(jwtService.sign).toHaveBeenCalledWith(
        { type: 'email_verification' },
        { expiresIn: '24h' }
      );
    });
  });
});