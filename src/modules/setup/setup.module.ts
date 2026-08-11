import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { InitSetupUseCase } from './application/use-cases/init-setup.use-case';
import { SetupController } from './infrastructure/controllers/setup.controller';

@Module({
  imports: [UsersModule],
  controllers: [SetupController],
  providers: [InitSetupUseCase],
})
export class SetupModule {}
