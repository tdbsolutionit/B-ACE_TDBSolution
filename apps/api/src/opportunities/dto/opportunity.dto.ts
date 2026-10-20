import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class OpportunityDto {
  @IsString()
  name!: string;

  @IsString()
  customerId!: string;

  @IsOptional()
  @IsString()
  stageId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  value?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  probability?: number;

  @IsOptional()
  @IsString()
  expectedCloseDate?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  code?: string;
}

export class MoveDto {
  @IsString()
  stageId!: string;

  @IsOptional()
  @IsString()
  lostReason?: string;
}

export class OpportunityPatchDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  stageId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  value?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  probability?: number;

  @IsOptional()
  @IsString()
  expectedCloseDate?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  code?: string;
}