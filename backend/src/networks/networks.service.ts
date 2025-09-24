import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NetworksService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.network.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    return this.prisma.network.findFirst({
      where: { id, userId },
    });
  }

  async create(data: any, userId: string) {
    return this.prisma.network.create({
      data: {
        ...data,
        userId,
      },
    });
  }

  async update(id: string, data: any, userId: string) {
    return this.prisma.network.updateMany({
      where: { id, userId },
      data,
    });
  }

  async remove(id: string, userId: string) {
    return this.prisma.network.deleteMany({
      where: { id, userId },
    });
  }
}