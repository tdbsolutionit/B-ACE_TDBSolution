import { IsIn, IsOptional, IsString, IsDateString, IsArray, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

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

export class QuoteItemDto {
  @IsString()
  moduleName!: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsNumber()
  quantity!: number;

  @IsNumber()
  unitPrice!: number;
}

export class QuoteItemsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuoteItemDto)
  items!: QuoteItemDto[];
}

export class StatusDto {
  @IsIn(['draft', 'sent', 'accepted', 'rejected', 'expired'])
  status!: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
}