import { IsArray, IsString } from 'class-validator';

export class UpdateRolePermissionsDto {
  @IsArray()
  @IsString({ each: true })
  permissions!: string[]; // Mảng chứa các mã code (VD: ['customer:read', 'customer:create'])
}