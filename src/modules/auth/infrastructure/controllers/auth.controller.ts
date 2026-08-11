import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Public } from '../../../../common/decorators/public.decorator';
import { AuthResponseDto } from '../../application/dtos/auth-response.dto';
import { LoginDto } from '../../application/dtos/login.dto';
import { RefreshTokenDto } from '../../application/dtos/refresh-token.dto';
import { RegisterDto } from '../../application/dtos/register.dto';
import { LoginUseCase } from '../../application/use-cases/login.use-case';
import { RefreshTokenUseCase } from '../../application/use-cases/refresh-token.use-case';
import { RegisterUseCase } from '../../application/use-cases/register.use-case';

@Public()
@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
  ) {}

  @Post('register')
  async register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return this.registerUseCase.execute(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.loginUseCase.execute(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto): Promise<AuthResponseDto> {
    return this.refreshTokenUseCase.execute(dto);
  }
}
