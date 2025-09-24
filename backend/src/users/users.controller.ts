import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
// Role is now a string type (USER, ADMIN, SUPER_ADMIN)

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todos os usuários (apenas admins)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Lista de usuários' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  async findAll(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    // Only admins can list all users
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Acesso negado');
    }

    const pageNumber = parseInt(page) || 1;
    const limitNumber = parseInt(limit) || 10;
    const skip = (pageNumber - 1) * limitNumber;

    const where = search
      ? {
          OR: [
            { email: { contains: search } },
            { firstName: { contains: search } },
            { lastName: { contains: search } },
            { username: { contains: search } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      this.usersService.findAll({
        skip,
        take: limitNumber,
        where,
        orderBy: { createdAt: 'desc' },
      }),
      this.usersService.count(where),
    ]);

    return {
      users,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        pages: Math.ceil(total / limitNumber),
      },
    };
  }

  @Get('me')
  @ApiOperation({ summary: 'Obter dados do usuário logado' })
  @ApiResponse({ status: 200, description: 'Dados do usuário' })
  async getMe(@Request() req) {
    return this.usersService.getUserWithRelations(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter usuário por ID' })
  @ApiResponse({ status: 200, description: 'Dados do usuário' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  async findOne(@Request() req, @Param('id') id: string) {
    // Users can only access their own data, admins can access any user
    if (req.user.role !== 'ADMIN' && req.user.id !== id) {
      throw new ForbiddenException('Acesso negado');
    }

    return this.usersService.getUserWithRelations(id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Atualizar dados do usuário logado' })
  @ApiResponse({ status: 200, description: 'Usuário atualizado com sucesso' })
  async updateMe(@Request() req, @Body() updateData: any) {
    // Remove sensitive fields that users shouldn't be able to update
    const { role, status, emailVerified, ...allowedData } = updateData;

    return this.usersService.update({
      where: { id: req.user.id },
      data: allowedData,
    });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar usuário por ID (apenas admins)' })
  @ApiResponse({ status: 200, description: 'Usuário atualizado com sucesso' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateData: any,
  ) {
    // Only admins can update other users
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Acesso negado');
    }

    return this.usersService.update({
      where: { id },
      data: updateData,
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deletar usuário (apenas admins)' })
  @ApiResponse({ status: 200, description: 'Usuário deletado com sucesso' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async remove(@Request() req, @Param('id') id: string) {
    // Only admins can delete users
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Acesso negado');
    }

    // Prevent admin from deleting themselves
    if (req.user.id === id) {
      throw new ForbiddenException('Você não pode deletar sua própria conta');
    }

    return this.usersService.delete({ id });
  }
}