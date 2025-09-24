import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RulesService } from './rules.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Rules')
@Controller('rules')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class RulesController {
  constructor(private readonly rulesService: RulesService) {}

  @Post()
  create(@Body() createRuleDto: any, @Request() req) {
    return this.rulesService.create(createRuleDto, req.user.id);
  }

  @Get()
  findAll(@Request() req) {
    return this.rulesService.findAll(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.rulesService.findOne(id, req.user.id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateRuleDto: any, @Request() req) {
    return this.rulesService.update(id, updateRuleDto, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.rulesService.remove(id, req.user.id);
  }
}