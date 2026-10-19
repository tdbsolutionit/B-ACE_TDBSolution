import { Type } from 'class-transformer';
import { IsArray, IsIn, IsNumber, IsOptional, IsString, Min, ValidateNested, IsDateString } from 'class-validator';

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

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  workingDays!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  freelancers!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  freelanceRate!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  profitMargin?: number;

  // --- 2 TRƯỜNG MỚI THÊM VÀO ĐÂY ---
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  otherCost?: number;

  @IsOptional()
  @IsDateString()
  validUntil?: string;
  // ----------------------------------

  @IsOptional()
  @IsString()
  notes?: string;
}

export class QuoteLineDto {
  @IsString()
  moduleName!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantity!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice!: number;
}

export class QuoteItemsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuoteLineDto)
  items!: QuoteLineDto[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  profitMargin?: number;
}

export class StatusDto {
  @IsIn(['draft', 'sent', 'accepted', 'rejected', 'expired'])
  status!: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
}