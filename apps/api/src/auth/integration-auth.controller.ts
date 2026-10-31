import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Public } from '../common/auth';

@ApiTags('integration-auth')
@Controller('auth/integration')
export class IntegrationAuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lấy Access Token cho hệ thống bên thứ 3.' })
  async apiLogin(@Body() dto: LoginDto) {
    return this.authService.apiLogin(dto);
  }
}