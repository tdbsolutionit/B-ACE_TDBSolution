import { Type } from 'class-transformer';
import { IsArray, IsIn, IsOptional, IsString, ValidateNested } from 'class-validator';

export class CustomerDto {
  @IsString()
  name!: string;

  @IsOptional() @IsString() company?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() taxCode?: string;
  @IsOptional() @IsString() industry?: string;
  @IsOptional() @IsString() contactName?: string;
  @IsOptional() @IsString() contactPhone?: string;
  @IsOptional() @IsString() contactEmail?: string;

  @IsOptional()
  @IsIn(['personal', 'business', 'individual'])
  type?: 'personal' | 'business' | 'individual';

  @IsOptional()
  @IsIn(['lead', 'active', 'inactive'])
  status?: 'lead' | 'active' | 'inactive';

  @IsOptional() @IsString() sourceName?: string;
  @IsOptional() @IsString() notes?: string;
}

export class CustomerPatchDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() company?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() taxCode?: string;
  @IsOptional() @IsString() industry?: string;
  @IsOptional() @IsString() contactName?: string;
  @IsOptional() @IsString() contactPhone?: string;
  @IsOptional() @IsString() contactEmail?: string;

  @IsOptional()
  @IsIn(['personal', 'business', 'individual'])
  type?: 'personal' | 'business' | 'individual';

  @IsOptional()
  @IsIn(['lead', 'active', 'inactive'])
  status?: 'lead' | 'active' | 'inactive';

  @IsOptional() @IsString() sourceName?: string;
  @IsOptional() @IsString() notes?: string;
}

export class ImportRow {
  @IsString()
  name!: string;

  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() company?: string;
  @IsOptional() @IsString() taxCode?: string;
  
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() shortCode?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() industry?: string;
  @IsOptional() @IsString() website?: string;
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() sourceName?: string;
}

export class ImportDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportRow)
  rows!: ImportRow[];
}

export class BulkAssignDto {
  @IsArray()
  @IsString({ each: true })
  ids!: string[];

  @IsString()
  assignedTo!: string;
}

export class BulkStatusDto {
  @IsArray()
  @IsString({ each: true })
  ids!: string[];

  @IsIn(['lead', 'active', 'inactive'])
  status!: 'lead' | 'active' | 'inactive';
}

export class BulkDeleteDto {
  @IsArray()
  @IsString({ each: true })
  ids!: string[];
}