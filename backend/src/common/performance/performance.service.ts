import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface QueryMetrics {
  query: string;
  duration: number;
  timestamp: Date;
  params?: any;
}

export interface PerformanceStats {
  totalQueries: number;
  averageQueryTime: number;
  slowQueries: QueryMetrics[];
  queryDistribution: Record<string, number>;
  connectionHealth: any;
}

@Injectable()
export class PerformanceService {
  private readonly logger = new Logger(PerformanceService.name);
  private queryMetrics: QueryMetrics[] = [];
  private readonly maxMetricsHistory = 1000;
  private readonly slowQueryThreshold = 1000; // 1 second

  constructor(private prisma: PrismaService) {
    // Clean old metrics every hour
    setInterval(() => this.cleanOldMetrics(), 60 * 60 * 1000);
  }

  recordQuery(query: string, duration: number, params?: any): void {
    const metric: QueryMetrics = {
      query: this.sanitizeQuery(query),
      duration,
      timestamp: new Date(),
      params: params ? this.sanitizeParams(params) : undefined,
    };

    this.queryMetrics.push(metric);

    // Log slow queries
    if (duration > this.slowQueryThreshold) {
      this.logger.warn(`Slow query detected (${duration}ms): ${metric.query}`);
    }

    // Maintain metrics history size
    if (this.queryMetrics.length > this.maxMetricsHistory) {
      this.queryMetrics = this.queryMetrics.slice(-this.maxMetricsHistory);
    }
  }

  async getPerformanceStats(): Promise<PerformanceStats> {
    const now = Date.now();
    const recentMetrics = this.queryMetrics.filter(
      (metric) => now - metric.timestamp.getTime() < 60 * 60 * 1000 // Last hour
    );

    const totalQueries = recentMetrics.length;
    const averageQueryTime = totalQueries > 0 
      ? recentMetrics.reduce((sum, metric) => sum + metric.duration, 0) / totalQueries
      : 0;

    const slowQueries = recentMetrics
      .filter((metric) => metric.duration > this.slowQueryThreshold)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10); // Top 10 slowest

    const queryDistribution = this.getQueryDistribution(recentMetrics);
    const connectionHealth = await this.prisma.healthCheck();

    return {
      totalQueries,
      averageQueryTime: Math.round(averageQueryTime * 100) / 100,
      slowQueries,
      queryDistribution,
      connectionHealth,
    };
  }

  async getDetailedMetrics(): Promise<{
    performance: PerformanceStats;
    recommendations: string[];
    alerts: string[];
  }> {
    const performance = await this.getPerformanceStats();
    const recommendations = this.generateRecommendations(performance);
    const alerts = this.generateAlerts(performance);

    return {
      performance,
      recommendations,
      alerts,
    };
  }

  private sanitizeQuery(query: string): string {
    // Remove sensitive data and normalize query
    return query
      .replace(/\$\d+/g, '?') // Replace parameter placeholders
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .substring(0, 200); // Limit length
  }

  private sanitizeParams(params: any): any {
    if (typeof params !== 'object' || params === null) {
      return '[PRIMITIVE]';
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string' && value.length > 50) {
        sanitized[key] = '[LONG_STRING]';
      } else if (key.toLowerCase().includes('password') || key.toLowerCase().includes('token')) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  private getQueryDistribution(metrics: QueryMetrics[]): Record<string, number> {
    const distribution: Record<string, number> = {};

    for (const metric of metrics) {
      const queryType = this.extractQueryType(metric.query);
      distribution[queryType] = (distribution[queryType] || 0) + 1;
    }

    return distribution;
  }

  private extractQueryType(query: string): string {
    const normalized = query.toLowerCase().trim();
    
    if (normalized.startsWith('select')) return 'SELECT';
    if (normalized.startsWith('insert')) return 'INSERT';
    if (normalized.startsWith('update')) return 'UPDATE';
    if (normalized.startsWith('delete')) return 'DELETE';
    if (normalized.startsWith('create')) return 'CREATE';
    if (normalized.startsWith('alter')) return 'ALTER';
    if (normalized.startsWith('drop')) return 'DROP';
    
    return 'OTHER';
  }

  private generateRecommendations(stats: PerformanceStats): string[] {
    const recommendations: string[] = [];

    if (stats.averageQueryTime > 500) {
      recommendations.push('Consider adding database indexes for frequently queried columns');
    }

    if (stats.slowQueries.length > 5) {
      recommendations.push('Multiple slow queries detected - review query optimization');
    }

    const selectRatio = (stats.queryDistribution.SELECT || 0) / stats.totalQueries;
    if (selectRatio < 0.7) {
      recommendations.push('High write-to-read ratio detected - consider read replicas');
    }

    if (stats.connectionHealth.latency && stats.connectionHealth.latency > 100) {
      recommendations.push('High database latency - check network connectivity');
    }

    return recommendations;
  }

  private generateAlerts(stats: PerformanceStats): string[] {
    const alerts: string[] = [];

    if (stats.connectionHealth.status !== 'healthy') {
      alerts.push('Database connection is unhealthy');
    }

    if (stats.averageQueryTime > 1000) {
      alerts.push('Average query time exceeds 1 second');
    }

    if (stats.slowQueries.length > 10) {
      alerts.push('Too many slow queries detected');
    }

    return alerts;
  }

  private cleanOldMetrics(): void {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago
    const initialCount = this.queryMetrics.length;
    
    this.queryMetrics = this.queryMetrics.filter(
      (metric) => metric.timestamp.getTime() > cutoff
    );

    const cleaned = initialCount - this.queryMetrics.length;
    if (cleaned > 0) {
      this.logger.debug(`Cleaned ${cleaned} old performance metrics`);
    }
  }

  // Manual methods for monitoring
  clearMetrics(): void {
    this.queryMetrics = [];
    this.logger.log('Performance metrics cleared');
  }

  getRecentSlowQueries(limit = 10): QueryMetrics[] {
    return this.queryMetrics
      .filter((metric) => metric.duration > this.slowQueryThreshold)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }
}