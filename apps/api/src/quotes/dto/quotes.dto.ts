import { IsIn, IsOptional, IsString, IsDateString } from 'class-validator';

export class QuoteDto {
  @IsString()
  opportunityId!: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsIn(['proposal', 'quote', 'po'])
  kind?: 'proposal' | 'quote' | 'po';

  @IsOptional()
  @IsIn(['low', 'mid', 'high', 'custom'])
  scenario?: 'low' | 'mid' | 'high' | 'custom';

  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}