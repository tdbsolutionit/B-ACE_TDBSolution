import { IsIn, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTicketDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  customerId!: string;

  @ApiPropertyOptional({ example: 'team-uuid' })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiProperty({ example: 'Không đăng nhập được hệ thống' })
  @IsString()
  title!: string;

  @ApiPropertyOptional({ example: 'Khách hàng báo lỗi 500 khi đăng nhập' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' })
  @IsOptional()
  @IsIn(['low', 'medium', 'high', 'urgent'])
  priority?: 'low' | 'medium' | 'high' | 'urgent';

  @ApiPropertyOptional({ example: 'user-uuid' })
  @IsOptional()
  @IsString()
  assignedTo?: string;
}

export class UpdateTicketStatusDto {
  @ApiProperty({ enum: ['open', 'in_progress', 'resolved', 'closed'] })
  @IsIn(['open', 'in_progress', 'resolved', 'closed'])
  status!: 'open' | 'in_progress' | 'resolved' | 'closed';
}

export class UpdateTicketDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(['low', 'medium', 'high', 'urgent'])
  priority?: 'low' | 'medium' | 'high' | 'urgent';

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  assignedTo?: string;

  @IsOptional()
  @IsIn(['open', 'in_progress', 'resolved', 'closed'])
  status?: 'open' | 'in_progress' | 'resolved' | 'closed';
}