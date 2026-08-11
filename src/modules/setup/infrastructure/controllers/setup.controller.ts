import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Public } from '../../../../common/decorators/public.decorator';
import { InitSetupDto } from '../../application/dtos/init-setup.dto';
import {
  InitSetupResponse,
  InitSetupUseCase,
} from '../../application/use-cases/init-setup.use-case';

@Public()
@Controller('setup')
export class SetupController {
  constructor(private readonly initSetupUseCase: InitSetupUseCase) {}

  @Post('init')
  @HttpCode(HttpStatus.CREATED)
  async init(@Body() dto: InitSetupDto): Promise<InitSetupResponse> {
    return this.initSetupUseCase.execute(dto);
  }
}
