import { Controller, Get, UseGuards, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PerformanceService } from './performance.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CacheInterceptor, Cache } from '../interceptors/cache.interceptor';
import { UseInterceptors } from '@nestjs/common';

@ApiTags('Performance')
@Controller('performance')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PerformanceController {
  constructor(private readonly performanceService: PerformanceService) {}

  @Get('stats')
  @Roles(Role.ADMIN)
  @UseInterceptors(CacheInterceptor)
  @Cache(60) // Cache for 1 minute
  @ApiOperation({ summary: 'Get database performance statistics' })
  @ApiResponse({
    status: 200,
    description: 'Performance statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalQueries: { type: 'number' },
        averageQueryTime: { type: 'number' },
        slowQueries: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              query: { type: 'string' },
              duration: { type: 'number' },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
        },
        queryDistribution: {
          type: 'object',
          additionalProperties: { type: 'number' },
        },
        connectionHealth: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' },
            latency: { type: 'number' },
          },
        },
      },
    },
  })
  async getPerformanceStats() {
    return this.performanceService.getPerformanceStats();
  }

  @Get('detailed')
  @Roles(Role.ADMIN)
  @UseInterceptors(CacheInterceptor)
  @Cache(30) // Cache for 30 seconds
  @ApiOperation({ summary: 'Get detailed performance metrics with recommendations' })
  @ApiResponse({
    status: 200,
    description: 'Detailed performance metrics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        performance: {
          type: 'object',
          description: 'Performance statistics',
        },
        recommendations: {
          type: 'array',
          items: { type: 'string' },
          description: 'Performance improvement recommendations',
        },
        alerts: {
          type: 'array',
          items: { type: 'string' },
          description: 'Performance alerts',
        },
      },
    },
  })
  async getDetailedMetrics() {
    return this.performanceService.getDetailedMetrics();
  }

  @Get('slow-queries')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get recent slow queries' })
  @ApiResponse({
    status: 200,
    description: 'Recent slow queries retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          duration: { type: 'number' },
          timestamp: { type: 'string', format: 'date-time' },
          params: { type: 'object' },
        },
      },
    },
  })
  async getSlowQueries() {
    return this.performanceService.getRecentSlowQueries();
  }

  @Post('clear-metrics')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Clear performance metrics history' })
  @ApiResponse({
    status: 204,
    description: 'Performance metrics cleared successfully',
  })
  async clearMetrics() {
    this.performanceService.clearMetrics();
  }
}