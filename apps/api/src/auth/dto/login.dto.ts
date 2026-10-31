import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ 
    example: 'admin@b-ace.vn', 
    description: 'Email đăng nhập' 
  })
  @IsEmail()
  email!: string;

  @ApiProperty({ 
    example: 'password', 
    description: 'Mật khẩu đăng nhập' 
  })
  @IsString()
  @MinLength(6)
  password!: string;
}