import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AlertType, AlertSeverity, RuleType, RuleAction } from '@prisma/client';

@Injectable()
export class SecurityService {
  constructor(private prisma: PrismaService) {}

  async getSecurityAlerts(userId: string) {
    const alerts = await this.prisma.alert.findMany({
      where: {
        userId,
        alertType: AlertType.SECURITY,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return {
      success: true,
      data: {
        alerts: alerts.map(alert => ({
          id: alert.id,
          type: alert.alertType.toLowerCase(),
          severity: alert.severity.toLowerCase(),
          title: alert.title,
          description: alert.message,
          source: alert.sourceIp || 'system',
          timestamp: alert.createdAt,
          resolved: alert.isResolved,
          actions: alert.metadata ? JSON.parse(alert.metadata).actions || [] : [],
        })),
      },
    };
  }

  async createSecurityAlert(alertData: any, userId: string) {
    const alert = await this.prisma.alert.create({
      data: {
        title: alertData.title,
        message: alertData.description || alertData.message,
        alertType: AlertType.SECURITY,
        severity: alertData.severity?.toUpperCase() || AlertSeverity.MEDIUM,
        sourceIp: alertData.source,
        targetIp: alertData.target,
        metadata: alertData.actions ? JSON.stringify({ actions: alertData.actions }) : null,
        userId,
      },
    });

    return {
      success: true,
      data: alert,
    };
  }

  async markAlertAsRead(alertId: string, userId: string) {
    const alert = await this.prisma.alert.findFirst({
      where: { id: alertId, userId },
    });

    if (!alert) {
      throw new NotFoundException('Alert not found');
    }

    const updatedAlert = await this.prisma.alert.update({
      where: { id: alertId },
      data: { isRead: true },
    });

    return {
      success: true,
      data: updatedAlert,
    };
  }

  async dismissAlert(alertId: string, userId: string) {
    const alert = await this.prisma.alert.findFirst({
      where: { id: alertId, userId },
    });

    if (!alert) {
      throw new NotFoundException('Alert not found');
    }

    await this.prisma.alert.delete({
      where: { id: alertId },
    });

    return {
      success: true,
      message: 'Alert dismissed successfully',
    };
  }

  async getThreatAlerts(userId: string) {
    const threats = await this.prisma.alert.findMany({
      where: {
        userId,
        alertType: AlertType.SECURITY,
        severity: { in: [AlertSeverity.HIGH, AlertSeverity.CRITICAL] },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return {
      success: true,
      data: threats.map(threat => ({
        id: threat.id,
        type: 'threat',
        severity: threat.severity.toLowerCase(),
        title: threat.title,
        description: threat.message,
        source: threat.sourceIp || 'unknown',
        target: threat.targetIp,
        timestamp: threat.createdAt,
        resolved: threat.isResolved,
      })),
    };
  }

  async resolveThreat(threatId: string, userId: string) {
    const threat = await this.prisma.alert.findFirst({
      where: { id: threatId, userId },
    });

    if (!threat) {
      throw new NotFoundException('Threat not found');
    }

    const resolvedThreat = await this.prisma.alert.update({
      where: { id: threatId },
      data: { isResolved: true },
    });

    return {
      success: true,
      data: resolvedThreat,
    };
  }

  async startThreatScan(userId: string) {
    // Simular início de scan de ameaças
    const scanAlert = await this.prisma.alert.create({
      data: {
        title: 'Threat Scan Started',
        message: 'Network threat scan has been initiated',
        alertType: AlertType.SYSTEM,
        severity: AlertSeverity.LOW,
        userId,
      },
    });

    return {
      success: true,
      message: 'Threat scan started successfully',
      data: { scanId: scanAlert.id },
    };
  }

  async getVulnerabilities(userId: string) {
    // Simular vulnerabilidades baseadas em alertas de segurança
    const vulnerabilities = await this.prisma.alert.findMany({
      where: {
        userId,
        alertType: AlertType.SECURITY,
        title: { contains: 'vulnerability' },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: vulnerabilities.map(vuln => ({
        id: vuln.id,
        name: vuln.title,
        description: vuln.message,
        severity: vuln.severity.toLowerCase(),
        cvss: this.calculateCVSS(vuln.severity),
        status: vuln.isResolved ? 'patched' : 'open',
        discoveredAt: vuln.createdAt,
        affectedDevices: vuln.affectedDevices || [],
      })),
    };
  }

  async startVulnerabilityScan(userId: string) {
    const scanAlert = await this.prisma.alert.create({
      data: {
        title: 'Vulnerability Scan Started',
        message: 'Network vulnerability scan has been initiated',
        alertType: AlertType.SYSTEM,
        severity: AlertSeverity.LOW,
        userId,
      },
    });

    return {
      success: true,
      message: 'Vulnerability scan started successfully',
      data: { scanId: scanAlert.id },
    };
  }

  async patchVulnerability(vulnerabilityId: string, patchData: any, userId: string) {
    const vulnerability = await this.prisma.alert.findFirst({
      where: { id: vulnerabilityId, userId },
    });

    if (!vulnerability) {
      throw new NotFoundException('Vulnerability not found');
    }

    const patchedVuln = await this.prisma.alert.update({
      where: { id: vulnerabilityId },
      data: { 
        isResolved: true,
        metadata: JSON.stringify({ patchData, patchedAt: new Date() }),
      },
    });

    return {
      success: true,
      data: patchedVuln,
    };
  }

  async getSecurityRules(userId: string) {
    const rules = await this.prisma.rule.findMany({
      where: {
        userId,
        ruleType: { in: [RuleType.FIREWALL, RuleType.ACCESS_CONTROL] },
      },
      orderBy: { priority: 'asc' },
    });

    return {
      success: true,
      data: rules.map(rule => ({
        id: rule.id,
        name: rule.name,
        description: rule.description,
        type: rule.ruleType.toLowerCase(),
        action: rule.action.toLowerCase(),
        priority: rule.priority,
        enabled: rule.isActive,
        source: rule.source,
        destination: rule.destination,
        port: rule.port,
        protocol: rule.protocol,
        conditions: rule.conditions ? JSON.parse(rule.conditions) : {},
        createdAt: rule.createdAt,
      })),
    };
  }

  async createSecurityRule(ruleData: any, userId: string) {
    const rule = await this.prisma.rule.create({
      data: {
        name: ruleData.name,
        description: ruleData.description,
        ruleType: ruleData.type?.toUpperCase() === 'FIREWALL' ? RuleType.FIREWALL : RuleType.ACCESS_CONTROL,
        action: ruleData.action?.toUpperCase() === 'BLOCK' ? RuleAction.BLOCK : RuleAction.ALLOW,
        priority: ruleData.priority || 1,
        isActive: ruleData.enabled !== false,
        source: ruleData.source,
        destination: ruleData.destination,
        port: ruleData.port,
        protocol: ruleData.protocol,
        conditions: ruleData.conditions ? JSON.stringify(ruleData.conditions) : null,
        userId,
      },
    });

    return {
      success: true,
      data: rule,
    };
  }

  async updateSecurityRule(ruleId: string, updateData: any, userId: string) {
    const rule = await this.prisma.rule.findFirst({
      where: { id: ruleId, userId },
    });

    if (!rule) {
      throw new NotFoundException('Security rule not found');
    }

    const updatedRule = await this.prisma.rule.update({
      where: { id: ruleId },
      data: {
        name: updateData.name || rule.name,
        description: updateData.description || rule.description,
        action: updateData.action ? updateData.action.toUpperCase() : rule.action,
        priority: updateData.priority || rule.priority,
        isActive: updateData.enabled !== undefined ? updateData.enabled : rule.isActive,
        source: updateData.source || rule.source,
        destination: updateData.destination || rule.destination,
        port: updateData.port || rule.port,
        protocol: updateData.protocol || rule.protocol,
        conditions: updateData.conditions ? JSON.stringify(updateData.conditions) : rule.conditions,
      },
    });

    return {
      success: true,
      data: updatedRule,
    };
  }

  async deleteSecurityRule(ruleId: string, userId: string) {
    const rule = await this.prisma.rule.findFirst({
      where: { id: ruleId, userId },
    });

    if (!rule) {
      throw new NotFoundException('Security rule not found');
    }

    await this.prisma.rule.delete({
      where: { id: ruleId },
    });

    return {
      success: true,
      message: 'Security rule deleted successfully',
    };
  }

  async toggleSecurityRule(ruleId: string, userId: string) {
    const rule = await this.prisma.rule.findFirst({
      where: { id: ruleId, userId },
    });

    if (!rule) {
      throw new NotFoundException('Security rule not found');
    }

    const toggledRule = await this.prisma.rule.update({
      where: { id: ruleId },
      data: { isActive: !rule.isActive },
    });

    return {
      success: true,
      data: toggledRule,
    };
  }

  async getThreatIntelligence(userId: string) {
    const [totalThreats, resolvedThreats, activeAlerts] = await Promise.all([
      this.prisma.alert.count({
        where: {
          userId,
          alertType: AlertType.SECURITY,
        },
      }),
      this.prisma.alert.count({
        where: {
          userId,
          alertType: AlertType.SECURITY,
          isResolved: true,
        },
      }),
      this.prisma.alert.count({
        where: {
          userId,
          alertType: AlertType.SECURITY,
          isResolved: false,
        },
      }),
    ]);

    // Simular IPs bloqueados baseados em regras de firewall
    const blockedRules = await this.prisma.rule.findMany({
      where: {
        userId,
        ruleType: RuleType.FIREWALL,
        action: RuleAction.BLOCK,
        isActive: true,
      },
    });

    const blockedIPs = blockedRules
      .map(rule => rule.source)
      .filter(ip => ip && ip.match(/^\d+\.\d+\.\d+\.\d+$/));

    return {
      success: true,
      data: {
        knownThreats: totalThreats,
        blockedIPs,
        suspiciousActivities: activeAlerts,
        lastUpdate: new Date(),
      },
    };
  }

  private calculateCVSS(severity: AlertSeverity): number {
    switch (severity) {
      case AlertSeverity.CRITICAL:
        return 9.0 + Math.random();
      case AlertSeverity.HIGH:
        return 7.0 + Math.random() * 2;
      case AlertSeverity.MEDIUM:
        return 4.0 + Math.random() * 3;
      case AlertSeverity.LOW:
        return 1.0 + Math.random() * 3;
      default:
        return 5.0;
    }
  }
}