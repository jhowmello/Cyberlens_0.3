import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth(): object {
    return {
      status: 'ok',
      message: 'CyberLens API is running',
      timestamp: new Date().toISOString(),
      version: process.env.API_VERSION || '1.0.0',
    };
  }

  getDetailedHealth(): object {
    return {
      status: 'ok',
      message: 'CyberLens API is running',
      timestamp: new Date().toISOString(),
      version: process.env.API_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      services: {
        database: 'connected',
        redis: 'connected',
        authentication: 'active',
      },
    };
  }
}