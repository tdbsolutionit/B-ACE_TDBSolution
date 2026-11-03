import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class UserDto {
  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @IsOptional()
  @IsString()
  roleId?: string;

  @IsOptional()
  @IsString()
  teamId?: string | null;

  @IsOptional()
  @IsIn(['admin', 'manager', 'sales'])
  role?: 'admin' | 'manager' | 'sales';

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: 'active' | 'inactive';
}

export class MeDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}