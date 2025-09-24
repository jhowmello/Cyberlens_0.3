import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { NetworksService } from './networks.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Networks')
@Controller('networks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class NetworksController {
  constructor(private readonly networksService: NetworksService) {}

  @Post()
  create(@Body() createNetworkDto: any, @Request() req) {
    return this.networksService.create(createNetworkDto, req.user.id);
  }

  @Get()
  findAll(@Request() req) {
    return this.networksService.findAll(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.networksService.findOne(id, req.user.id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateNetworkDto: any, @Request() req) {
    return this.networksService.update(id, updateNetworkDto, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.networksService.remove(id, req.user.id);
  }
}