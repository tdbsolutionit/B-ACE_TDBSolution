import { IsArray, IsBoolean, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class StageDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  name!: string;

  @IsString()
  color!: string;

  @IsNumber()
  orderIndex!: number;

  @IsBoolean()
  isWon!: boolean;

  @IsBoolean()
  isLost!: boolean;
}

export class ReplaceStagesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StageDto)
  stages!: StageDto[];
}