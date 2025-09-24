import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    description: 'Email do usuário',
    example: 'usuario@exemplo.com',
  })
  @IsEmail({}, { message: 'Email deve ter um formato válido' })
  @IsNotEmpty({ message: 'Email é obrigatório' })
  email: string;

  @ApiPropertyOptional({
    description: 'Nome de usuário único',
    example: 'usuario123',
  })
  @IsOptional()
  @IsString({ message: 'Nome de usuário deve ser uma string' })
  @MinLength(3, { message: 'Nome de usuário deve ter pelo menos 3 caracteres' })
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Nome de usuário deve conter apenas letras, números e underscore',
  })
  username?: string;

  @ApiProperty({
    description: 'Primeiro nome do usuário',
    example: 'João',
  })
  @IsString({ message: 'Primeiro nome deve ser uma string' })
  @IsNotEmpty({ message: 'Primeiro nome é obrigatório' })
  @MinLength(2, { message: 'Primeiro nome deve ter pelo menos 2 caracteres' })
  firstName: string;

  @ApiPropertyOptional({
    description: 'Sobrenome do usuário',
    example: 'Silva',
  })
  @IsOptional()
  @IsString({ message: 'Sobrenome deve ser uma string' })
  @MinLength(2, { message: 'Sobrenome deve ter pelo menos 2 caracteres' })
  lastName?: string;

  @ApiProperty({
    description: 'Senha do usuário',
    example: 'MinhaSenh@123',
    minLength: 8,
  })
  @IsString({ message: 'Senha deve ser uma string' })
  @IsNotEmpty({ message: 'Senha é obrigatória' })
  @MinLength(8, { message: 'Senha deve ter pelo menos 8 caracteres' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'Senha deve conter pelo menos: 1 letra minúscula, 1 maiúscula, 1 número e 1 caractere especial',
  })
  password: string;
}