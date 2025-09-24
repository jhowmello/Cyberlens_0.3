import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RouterStatus } from '@prisma/client';

@Injectable()
export class RouterService {
  constructor(private prisma: PrismaService) {}

  async getRouterConfig(userId: string, routerId: string) {
    return this.prisma.router.findFirst({
      where: { id: routerId, userId },
      include: {
        networks: true,
        devices: true,
      },
    });
  }

  async getAllRouters(userId: string) {
    return this.prisma.router.findMany({
      where: { userId },
      include: {
        networks: {
          select: {
            id: true,
            name: true,
            ssid: true,
          },
        },
        _count: {
          select: {
            devices: true,
          },
        },
      },
    });
  }

  async createRouter(data: any, userId: string) {
    return this.prisma.router.create({
      data: {
        ...data,
        userId,
      },
    });
  }

  async updateRouter(id: string, data: any, userId: string) {
    return this.prisma.router.updateMany({
      where: { id, userId },
      data,
    });
  }

  async deleteRouter(id: string, userId: string) {
    return this.prisma.router.deleteMany({
      where: { id, userId },
    });
  }

  async getRouterStats(userId: string, routerId: string) {
    const router = await this.prisma.router.findFirst({
      where: { id: routerId, userId },
      include: {
        networks: {
          include: {
            devices: true,
          },
        },
      },
    });

    if (!router) {
      return null;
    }

    const totalDevices = router.networks.reduce(
      (acc, network) => acc + network.devices.length,
      0
    );

    return {
      router,
      totalNetworks: router.networks.length,
      totalDevices,
      status: router.status || 'unknown',
    };
  }

  async updateRouterStatus(id: string, status: RouterStatus, userId: string) {
    return this.prisma.router.updateMany({
      where: { id, userId },
      data: { status },
    });
  }
}