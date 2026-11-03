import { IsOptional, IsString } from 'class-validator';

export class ActivityDto {
  @IsString()
  type!: string;

  @IsString()
  subject!: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  relatedType?: string;

  @IsOptional()
  @IsString()
  relatedId?: string;
}