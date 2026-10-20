import { IsOptional, IsString } from 'class-validator';

export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  taxCode?: string;

  @IsOptional()
  @IsString()
  email?: string; 

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  bankAccount?: string;

  @IsOptional()
  @IsString()
  bankOwner?: string;

  @IsOptional()
  @IsString()
  timezone?: string; 

  @IsOptional()
  @IsString()
  currency?: string; 

  @IsOptional()
  @IsString()
  language?: string; 

  @IsOptional()
  @IsString()
  dateFormat?: string; 
  
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  directorName?: string;

  @IsOptional()
  @IsString()
  quoteTerms?: string;

  @IsOptional()
  @IsString()
  quoteNotes?: string;
  
  @IsOptional()
  @IsString()
  quoteUnit?: string;
}