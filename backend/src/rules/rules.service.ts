import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RulesService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.rule.findMany({
      where: { userId },
      orderBy: { priority: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    return this.prisma.rule.findFirst({
      where: { id, userId },
    });
  }

  async create(data: any, userId: string) {
    return this.prisma.rule.create({
      data: {
        ...data,
        userId,
      },
    });
  }

  async update(id: string, data: any, userId: string) {
    return this.prisma.rule.updateMany({
      where: { id, userId },
      data,
    });
  }

  async remove(id: string, userId: string) {
    return this.prisma.rule.deleteMany({
      where: { id, userId },
    });
  }
}