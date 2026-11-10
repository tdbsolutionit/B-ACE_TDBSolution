import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateOdooConfigDto {
  @ApiProperty({ example: 'http://192.168.103.8:8069' })
  @IsString()
  @IsNotEmpty()
  url!: string;

  @ApiProperty({ example: 'bace_odoo' })
  @IsString()
  @IsNotEmpty()
  db!: string;

  @ApiProperty({ example: 'admin' })
  @IsString()
  @IsNotEmpty()
  username!: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @IsOptional()
  password!: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}