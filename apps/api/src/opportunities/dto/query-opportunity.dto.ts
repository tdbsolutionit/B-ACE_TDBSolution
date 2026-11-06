import { IsIn, IsOptional, IsString } from 'class-validator';

export class QueryOpportunityDto {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsString() customerId?: string;
  @IsOptional() @IsString() stageId?: string;
  @IsOptional() @IsIn(['open', 'won', 'lost']) status?: 'open' | 'won' | 'lost';
  @IsOptional() @IsString() sortBy?: string = 'updatedAt';
  @IsOptional() @IsIn(['asc', 'desc']) sortOrder?: 'asc' | 'desc' = 'desc';
}