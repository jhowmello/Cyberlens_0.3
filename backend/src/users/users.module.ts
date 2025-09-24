import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { ActivateUserController } from './activate-user.controller';

@Module({
  controllers: [UsersController, ActivateUserController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}