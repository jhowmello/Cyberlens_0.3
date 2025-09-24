import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { SecurityService } from './security.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Security')
@Controller('security')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class SecurityController {
  constructor(private readonly securityService: SecurityService) {}

  @Get('alerts')
  @ApiOperation({ summary: 'Get security alerts' })
  @ApiResponse({ status: 200, description: 'Security alerts retrieved successfully' })
  async getAlerts(@Request() req) {
    return this.securityService.getSecurityAlerts(req.user.id);
  }

  @Post('alerts')
  @ApiOperation({ summary: 'Create security alert' })
  @ApiResponse({ status: 201, description: 'Security alert created successfully' })
  async createAlert(@Body() createAlertDto: any, @Request() req) {
    return this.securityService.createSecurityAlert(createAlertDto, req.user.id);
  }

  @Patch('alerts/:id/read')
  @ApiOperation({ summary: 'Mark alert as read' })
  @ApiResponse({ status: 200, description: 'Alert marked as read successfully' })
  async markAlertAsRead(@Param('id') id: string, @Request() req) {
    return this.securityService.markAlertAsRead(id, req.user.id);
  }

  @Delete('alerts/:id')
  @ApiOperation({ summary: 'Dismiss alert' })
  @ApiResponse({ status: 200, description: 'Alert dismissed successfully' })
  async dismissAlert(@Param('id') id: string, @Request() req) {
    return this.securityService.dismissAlert(id, req.user.id);
  }

  @Get('threats')
  @ApiOperation({ summary: 'Get threat alerts' })
  @ApiResponse({ status: 200, description: 'Threat alerts retrieved successfully' })
  async getThreatAlerts(@Request() req) {
    return this.securityService.getThreatAlerts(req.user.id);
  }

  @Post('threats/:id/resolve')
  @ApiOperation({ summary: 'Resolve threat' })
  @ApiResponse({ status: 200, description: 'Threat resolved successfully' })
  async resolveThreat(@Param('id') id: string, @Request() req) {
    return this.securityService.resolveThreat(id, req.user.id);
  }

  @Post('threats/scan')
  @ApiOperation({ summary: 'Start threat scan' })
  @ApiResponse({ status: 200, description: 'Threat scan started successfully' })
  async startThreatScan(@Request() req) {
    return this.securityService.startThreatScan(req.user.id);
  }

  @Get('vulnerabilities')
  @ApiOperation({ summary: 'Get vulnerabilities' })
  @ApiResponse({ status: 200, description: 'Vulnerabilities retrieved successfully' })
  async getVulnerabilities(@Request() req) {
    return this.securityService.getVulnerabilities(req.user.id);
  }

  @Post('vulnerabilities/scan')
  @ApiOperation({ summary: 'Start vulnerability scan' })
  @ApiResponse({ status: 200, description: 'Vulnerability scan started successfully' })
  async startVulnerabilityScan(@Request() req) {
    return this.securityService.startVulnerabilityScan(req.user.id);
  }

  @Patch('vulnerabilities/:id')
  @ApiOperation({ summary: 'Patch vulnerability' })
  @ApiResponse({ status: 200, description: 'Vulnerability patched successfully' })
  async patchVulnerability(@Param('id') id: string, @Body() patchData: any, @Request() req) {
    return this.securityService.patchVulnerability(id, patchData, req.user.id);
  }

  @Get('rules')
  @ApiOperation({ summary: 'Get security rules' })
  @ApiResponse({ status: 200, description: 'Security rules retrieved successfully' })
  async getSecurityRules(@Request() req) {
    return this.securityService.getSecurityRules(req.user.id);
  }

  @Post('rules')
  @ApiOperation({ summary: 'Create security rule' })
  @ApiResponse({ status: 201, description: 'Security rule created successfully' })
  async createSecurityRule(@Body() createRuleDto: any, @Request() req) {
    return this.securityService.createSecurityRule(createRuleDto, req.user.id);
  }

  @Patch('rules/:id')
  @ApiOperation({ summary: 'Update security rule' })
  @ApiResponse({ status: 200, description: 'Security rule updated successfully' })
  async updateSecurityRule(@Param('id') id: string, @Body() updateRuleDto: any, @Request() req) {
    return this.securityService.updateSecurityRule(id, updateRuleDto, req.user.id);
  }

  @Delete('rules/:id')
  @ApiOperation({ summary: 'Delete security rule' })
  @ApiResponse({ status: 200, description: 'Security rule deleted successfully' })
  async deleteSecurityRule(@Param('id') id: string, @Request() req) {
    return this.securityService.deleteSecurityRule(id, req.user.id);
  }

  @Patch('rules/:id/toggle')
  @ApiOperation({ summary: 'Toggle security rule' })
  @ApiResponse({ status: 200, description: 'Security rule toggled successfully' })
  async toggleSecurityRule(@Param('id') id: string, @Request() req) {
    return this.securityService.toggleSecurityRule(id, req.user.id);
  }

  @Get('threat-intelligence')
  @ApiOperation({ summary: 'Get threat intelligence' })
  @ApiResponse({ status: 200, description: 'Threat intelligence retrieved successfully' })
  async getThreatIntelligence(@Request() req) {
    return this.securityService.getThreatIntelligence(req.user.id);
  }
}