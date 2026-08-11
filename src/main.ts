import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { configureHttpPipeline } from './common/bootstrap/configure-http-pipeline';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureHttpPipeline(app);

  const configService = app.get(ConfigService);
  const port = configService.getOrThrow<number>('PORT');
  await app.listen(port);
}
void bootstrap();
