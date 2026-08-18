import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { configureHttpPipeline } from './common/bootstrap/configure-http-pipeline';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  configureHttpPipeline(app);

  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });

  const configService = app.get(ConfigService);
  const port = configService.getOrThrow<number>('PORT');
  await app.listen(port);
}
void bootstrap();
