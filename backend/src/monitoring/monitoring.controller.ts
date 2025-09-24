import { Controller, Get, Post, Body, Param, Patch, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { MonitoringService } from './monitoring.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Monitoring')
@Controller('monitoring')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  @Get('dashboard')
  getDashboard(@Request() req) {
    return this.monitoringService.getDashboardData(req.user.id);
  }

  @Get('network-stats')
  @ApiQuery({ name: 'networkId', required: false })
  getNetworkStats(@Request() req, @Query('networkId') networkId?: string) {
    return this.monitoringService.getNetworkStats(req.user.id, networkId);
  }

  @Get('devices')
  getDevices(@Request() req) {
    return this.monitoringService.getDevices(req.user.id);
  }

  @Get('device-stats')
  @ApiQuery({ name: 'deviceId', required: false })
  getDeviceStats(@Request() req, @Query('deviceId') deviceId?: string) {
    return this.monitoringService.getDeviceStats(req.user.id, deviceId);
  }

  @Get('alerts')
  getAlerts(@Request() req) {
    return this.monitoringService.getAlerts(req.user.id);
  }

  @Post('alerts')
  createAlert(@Body() createAlertDto: any, @Request() req) {
    return this.monitoringService.createAlert(createAlertDto, req.user.id);
  }

  @Patch('alerts/:id/read')
  markAlertAsRead(@Param('id') id: string, @Request() req) {
    return this.monitoringService.markAlertAsRead(id, req.user.id);
  }

  @Get('system-health')
  getSystemHealth(@Request() req) {
    return this.monitoringService.getSystemHealth(req.user.id);
  }

  @Post('device-data')
  saveDeviceData(@Body() deviceData: any, @Request() req) {
    return this.monitoringService.saveDeviceData(deviceData, req.user.id);
  }
}