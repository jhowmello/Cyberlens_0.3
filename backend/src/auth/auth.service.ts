import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { User } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    
    if (user && user.password && await bcrypt.compare(password, user.password)) {
      const { password: _, ...result } = user;
      return result;
    }
    return null;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    
    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Conta não está ativa');
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    const payload = { 
      sub: user.id, 
      email: user.email, 
      role: user.role 
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.generateRefreshToken(user.id);

    // Save refresh token
    await this.saveRefreshToken(user.id, refreshToken);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatar: user.avatar,
      },
    };
  }

  async register(registerDto: RegisterDto) {
    // Check if user already exists
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('Email já está em uso');
    }

    if (registerDto.username) {
      const existingUsername = await this.usersService.findByUsername(registerDto.username);
      if (existingUsername) {
        throw new ConflictException('Nome de usuário já está em uso');
      }
    }

    // Hash password
    const saltRounds = parseInt(this.configService.get('BCRYPT_ROUNDS')) || 12;
    const hashedPassword = await bcrypt.hash(registerDto.password, saltRounds);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: registerDto.email,
        username: registerDto.username,
        name: `${registerDto.firstName} ${registerDto.lastName}`,
        password: hashedPassword,
        isActive: false,
      },
    });

    // Generate email verification token
    const verificationToken = this.generateEmailVerificationToken();
    await this.saveEmailVerificationToken(user.email, verificationToken);

    // Send verification email (implement later)
    // await this.sendVerificationEmail(user.email, verificationToken);

    const { password: _, ...userWithoutPassword } = user;
    return {
      user: userWithoutPassword,
      message: 'Usuário criado com sucesso. Verifique seu email para ativar a conta.',
    };
  }

  async googleLogin(user: any) {
    if (!user) {
      throw new BadRequestException('Dados do Google inválidos');
    }

    let existingUser = await this.usersService.findByEmail(user.email);

    if (!existingUser) {
      // Create new user from Google data
      existingUser = await this.prisma.user.create({
        data: {
          email: user.email,
          name: user.name,
          avatar: user.picture,
          isActive: true,
          isEmailVerified: true,
        },
      });
    } else {
      // Update existing user with Google login info
      await this.prisma.user.update({
        where: { id: existingUser.id },
        data: { 
          avatar: user.picture || existingUser.avatar,
          lastLogin: new Date(),
        },
      });
    }

    const payload = { 
      sub: existingUser.id, 
      email: existingUser.email, 
      role: existingUser.role 
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.generateRefreshToken(existingUser.id);

    await this.saveRefreshToken(existingUser.id, refreshToken);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: existingUser.id,
        email: existingUser.email,
        username: existingUser.username,
        name: existingUser.name,
        role: existingUser.role,
        avatar: existingUser.avatar,
      },
    };
  }

  async refreshToken(refreshToken: string) {
    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!tokenRecord || tokenRecord.isRevoked || tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedException('Token de refresh inválido');
    }

    const payload = { 
      sub: tokenRecord.user.id, 
      email: tokenRecord.user.email, 
      role: tokenRecord.user.role 
    };

    const newAccessToken = this.jwtService.sign(payload);
    const newRefreshToken = this.generateRefreshToken(tokenRecord.user.id);

    // Revoke old refresh token
    await this.prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { isRevoked: true },
    });

    // Save new refresh token
    await this.saveRefreshToken(tokenRecord.user.id, newRefreshToken);

    return {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
    };
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      // Revoke the specific refresh token
      await this.prisma.refreshToken.updateMany({
        where: {
          userId,
          token: refreshToken,
          isRevoked: false,
        },
        data: {
          isRevoked: true,
        },
      });
    } else {
      // Revoke all refresh tokens for the user
      await this.prisma.refreshToken.updateMany({
        where: {
          userId,
          isRevoked: false,
        },
        data: {
          isRevoked: true,
        },
      });
    }

    return { message: 'Logout realizado com sucesso' };
  }

  async verifyEmail(token: string) {
    // TODO: Implement email verification with proper token storage
    throw new BadRequestException('Email verification not implemented');
    /*
    const verification = await this.prisma.emailVerification.findUnique({
      where: { token },
    });

    if (!verification || verification.used || verification.expiresAt < new Date()) {
      throw new BadRequestException('Token de verificação inválido ou expirado');
    }

    // Update user status
    await this.prisma.user.update({
      where: { email: verification.email },
      data: {
        isActive: true,
        isEmailVerified: true,
      },
    });

    // Token verification completed

    return { message: 'Email verificado com sucesso' };
    */
  }

  private generateRefreshToken(userId: string): string {
    const payload = { sub: userId, type: 'refresh' };
    return this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN') || '7d',
    });
  }

  private generateEmailVerificationToken(): string {
    return this.jwtService.sign(
      { type: 'email_verification' },
      { expiresIn: '24h' }
    );
  }

  private async saveRefreshToken(userId: string, token: string) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await this.prisma.refreshToken.create({
      data: {
        userId,
        token,
        expiresAt,
      },
    });
  }

  private async saveEmailVerificationToken(email: string, token: string) {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours

    await this.prisma.emailVerification.create({
      data: {
        email,
        token,
        expiresAt,
      },
    });
  }

  // Clean up expired tokens
  async cleanupExpiredTokens() {
    const now = new Date();
    
    // Remove expired refresh tokens
    await this.prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: now } },
          { isRevoked: true }
        ]
      }
    });

    // Remove expired email verification tokens
    await this.prisma.emailVerification.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: now } },
          { used: true }
        ]
      }
    });

    // Remove expired password reset tokens
    await this.prisma.passwordReset.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: now } },
          { used: true }
        ]
      }
    });
  }
}