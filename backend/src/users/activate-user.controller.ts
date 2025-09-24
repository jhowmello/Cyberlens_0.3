import { Controller, Patch, Param } from '@nestjs/common';
import { UsersService } from './users.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('users')
@Controller('users')
export class ActivateUserController {
  constructor(private readonly usersService: UsersService) {}

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Activate user (temporary endpoint for testing)' })
  async activateUser(@Param('id') id: string) {
    return this.usersService.activateUser(id);
  }

  @Patch('activate-by-email/:email')
  @ApiOperation({ summary: 'Activate user by email (temporary endpoint for testing)' })
  async activateUserByEmail(@Param('email') email: string) {
    return this.usersService.activateUserByEmail(email);
  }
}