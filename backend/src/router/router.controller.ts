import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RouterService } from './router.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RouterStatus } from '@prisma/client';

@ApiTags('Router')
@Controller('router')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class RouterController {
  constructor(private readonly routerService: RouterService) {}

  @Post()
  create(@Body() createRouterDto: any, @Request() req) {
    return this.routerService.createRouter(createRouterDto, req.user.id);
  }

  @Get()
  findAll(@Request() req) {
    return this.routerService.getAllRouters(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.routerService.getRouterConfig(req.user.id, id);
  }

  @Get(':id/stats')
  getStats(@Param('id') id: string, @Request() req) {
    return this.routerService.getRouterStats(req.user.id, id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateRouterDto: any, @Request() req) {
    return this.routerService.updateRouter(id, updateRouterDto, req.user.id);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() statusDto: { status: RouterStatus }, @Request() req) {
    return this.routerService.updateRouterStatus(id, statusDto.status, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.routerService.deleteRouter(id, req.user.id);
  }
}